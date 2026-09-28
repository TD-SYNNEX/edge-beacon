import { icon } from "../icons.ts";
import { beacon, beaconPost } from "../beacon-client.ts";
import type { CommandGrade } from "../../server/jev/lab.ts";

const OBJECTIVE_TITLES = [
  ["step-1", "Loopback0 & Routing Interfaces"],
  ["step-2", "BGP EVPN Neighbor Peering & State"],
  ["step-3", "pyATS Automated Health Check Suite"],
  ["step-4", "SD-WAN Control Plane Health"],
] as const;
const NOT_GRADED = new Set([
  "help",
  "?",
  "devices",
  "switch",
  "clear",
  "verify",
  "grade",
  "whoami",
]);

export interface LabDevice {
  id: string;
  name: string;
  type: "ios-xe" | "sd-wan" | "linux";
  os: string;
  status: "connected" | "booting" | "stopped";
  prompt: string;
}

export interface TerminalOptions {
  onVerifySuccess?: (score: number) => void;
  onActivity?: () => void;
}

export class NetDojoTerminal {
  private containerEl: HTMLElement | null = null;
  private activeDeviceId = "cat9300";
  private history: string[] = [];
  private historyIndex = -1;
  private isFullscreen = false;
  private verifiedSteps: Set<string> = new Set();

  private devices: LabDevice[] = [
    {
      id: "cat9300",
      name: "Cat9300-Edge-01",
      type: "ios-xe",
      os: "Cisco IOS-XE 17.9.4a",
      status: "connected",
      prompt: "Cat9300-Edge-01#",
    },
    {
      id: "cat8000v",
      name: "Cat8000v-SDWAN",
      type: "sd-wan",
      os: "Cisco Catalyst 8000v 17.9.3a",
      status: "connected",
      prompt: "Cat8000v-SDWAN#",
    },
    {
      id: "auto-host",
      name: "Automation-Host",
      type: "linux",
      os: "Ubuntu 24.04 (pyATS & Ansible)",
      status: "connected",
      prompt: "cml-user@netdojo:~$",
    },
  ];

  private logs: Record<
    string,
    Array<{ type: "output" | "prompt" | "error" | "success"; text: string }>
  > = {
    cat9300: [
      {
        type: "output",
        text: "Cisco IOS XE Software, Catalyst L3 Switch (CAT9K_IOSXE), Version 17.9.4a",
      },
      {
        type: "output",
        text: "Technical Support: http://www.cisco.com/techsupport",
      },
      { type: "output", text: "Compiled Wed 23-Aug-23 18:22 by prod_rel_team" },
      {
        type: "output",
        text: "NetDojo CML 2.9.1 Virtual Terminal Session active on line vty 0 (tcp/2222)",
      },
      {
        type: "output",
        text: "Type 'help' or '?' for available practice commands, or 'show ip int brief'.",
      },
    ],
    cat8000v: [
      {
        type: "output",
        text: "Cisco SD-WAN Catalyst 8000v Edge Platform, Version 17.9.3a",
      },
      {
        type: "output",
        text: "Control plane: Connected to vManage (192.168.10.5) and vSmart",
      },
      {
        type: "output",
        text: "Type 'show sdwan control connections' or 'show bfd sessions'.",
      },
    ],
    "auto-host": [
      {
        type: "output",
        text: "Linux netdojo-auto 6.8.0-31-generic #31-Ubuntu SMP x86_64",
      },
      {
        type: "output",
        text: "Python 3.12.3 (pyATS 24.4, Genie 24.4, Ansible core 2.16.5)",
      },
      {
        type: "output",
        text: "Testbed file loaded: /opt/tds-netdojo/testbeds/catalyst_fabric.yaml",
      },
      {
        type: "output",
        text: "Run 'python3 -m pyats run job cisco_health_check.py' or 'verify'.",
      },
    ],
  };

  constructor(private options: TerminalOptions = {}) {}

  public mount(target: HTMLElement) {
    this.containerEl = target;
    this.render();
  }

  public getActiveDevice(): LabDevice {
    return (
      this.devices.find((d) => d.id === this.activeDeviceId) || this.devices[0]
    );
  }

  public switchDevice(deviceId: string) {
    if (this.devices.some((d) => d.id === deviceId)) {
      this.activeDeviceId = deviceId;
      this.render();
      this.focusInput();
    }
  }

  public toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    if (this.containerEl) {
      if (this.isFullscreen) {
        this.containerEl.classList.add("terminal-fullscreen");
      } else {
        this.containerEl.classList.remove("terminal-fullscreen");
      }
    }
    this.focusInput();
  }

  public insertCommand(cmd: string) {
    const input = this.containerEl?.querySelector<HTMLInputElement>(
      ".netdojo-term-input",
    );
    if (input) {
      input.value = cmd;
      this.executeCommand(cmd);
    }
  }

  private render() {
    if (!this.containerEl) return;
    const currentDevice = this.getActiveDevice();
    const currentLogs = this.logs[this.activeDeviceId] || [];

    this.containerEl.innerHTML = `
      <div class="netdojo-terminal-wrapper ${this.isFullscreen ? "fullscreen" : ""}">
        <!-- Terminal Top Header Bar -->
        <div class="netdojo-term-topbar">
          <div class="netdojo-term-device-tabs" role="tablist">
            ${this.devices
              .map(
                (d) => `
              <button type="button" class="netdojo-device-tab ${d.id === this.activeDeviceId ? "active" : ""}" data-device-id="${d.id}" role="tab" aria-selected="${d.id === this.activeDeviceId}">
                <span class="term-status-dot"></span>
                <span>${d.name}</span>
                <span class="term-device-badge">${d.type === "linux" ? "Linux" : "IOS-XE"}</span>
              </button>
            `,
              )
              .join("")}
          </div>
          <div class="netdojo-term-controls">
            <span class="netdojo-session-clock">
              ${icon("clock")} CML 2.9.1 · Session: <strong>3h 42m</strong>
            </span>
            <button type="button" class="icon-button netdojo-btn-fullscreen" aria-label="${this.isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}" title="${this.isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Fullscreen"}">
              ${icon("panel")}
            </button>
            <button type="button" class="icon-button netdojo-btn-clear" aria-label="Clear Terminal" title="Clear Buffer (Ctrl+L)">
              ${icon("refresh")}
            </button>
          </div>
        </div>

        <div class="netdojo-term-layout">
          <!-- Terminal Main Window -->
          <div class="netdojo-term-main">
            <div class="netdojo-term-screen" id="netdojo-term-screen" tabindex="0" role="region" aria-label="NetDojo CLI Terminal">
              ${currentLogs
                .map((line) => {
                  if (line.type === "prompt") {
                    return `<div class="term-line term-prompt-line">${line.text}</div>`;
                  } else if (line.type === "error") {
                    return `<div class="term-line term-error-line">${line.text}</div>`;
                  } else if (line.type === "success") {
                    return `<div class="term-line term-success-line">${line.text}</div>`;
                  }
                  return `<div class="term-line term-output-line">${this.escapeHtml(line.text)}</div>`;
                })
                .join("")}
              
              <!-- Input Prompt Line -->
              <div class="netdojo-input-line">
                <span class="term-prompt-label">${currentDevice.prompt}</span>
                <input
                  type="text"
                  class="netdojo-term-input"
                  id="netdojo-cli-input"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  aria-label="Terminal command prompt"
                />
              </div>
            </div>
          </div>

          <!-- Study Guide & Objectives Drawer -->
          <aside class="netdojo-study-drawer">
            <div class="study-drawer-header">
              <span class="eyebrow" style="color: var(--tds-aqua);">NETDOJO LAB 1</span>
              <h4>BGP EVPN & Catalyst Automation</h4>
              <p>Verify leaf switch telemetry, test EVPN fabric routes, and run the automated pyATS regression suite.</p>
            </div>

            <div class="study-objectives-list">
              <div class="study-step ${this.verifiedSteps.has("step-1") ? "completed" : ""}">
                <div class="step-num">${this.verifiedSteps.has("step-1") ? icon("checkCircle") : "1"}</div>
                <div class="step-details">
                  <div class="step-title">Verify Interface IP State</div>
                  <div class="step-desc">Inspect physical and loopback IPs on Cat9300.</div>
                  <button type="button" class="term-snippet-btn" data-device="cat9300" data-cmd="show ip int brief">
                    <code>show ip int brief</code>
                  </button>
                </div>
              </div>

              <div class="study-step ${this.verifiedSteps.has("step-2") ? "completed" : ""}">
                <div class="step-num">${this.verifiedSteps.has("step-2") ? icon("checkCircle") : "2"}</div>
                <div class="step-details">
                  <div class="step-title">Verify BGP EVPN Neighbor</div>
                  <div class="step-desc">Ensure peering to spine router is Established.</div>
                  <button type="button" class="term-snippet-btn" data-device="cat9300" data-cmd="show bgp evpn summary">
                    <code>show bgp evpn summary</code>
                  </button>
                </div>
              </div>

              <div class="study-step ${this.verifiedSteps.has("step-3") ? "completed" : ""}">
                <div class="step-num">${this.verifiedSteps.has("step-3") ? icon("checkCircle") : "3"}</div>
                <div class="step-details">
                  <div class="step-title">Run pyATS Health Check</div>
                  <div class="step-desc">Execute Python testbed from Linux automation host.</div>
                  <button type="button" class="term-snippet-btn" data-device="auto-host" data-cmd="python3 -m pyats run job cisco_health_check.py">
                    <code>pyats run job cisco_health_check.py</code>
                  </button>
                </div>
              </div>

              <div class="study-step ${this.verifiedSteps.has("step-4") ? "completed" : ""}">
                <div class="step-num">${this.verifiedSteps.has("step-4") ? icon("checkCircle") : "4"}</div>
                <div class="step-details">
                  <div class="step-title">Grade & Verify Lab</div>
                  <div class="step-desc">Run blueprint verify_spec to earn +0.3 PVI points.</div>
                  <button type="button" class="term-snippet-btn" data-device="auto-host" data-cmd="verify">
                    <code>verify</code>
                  </button>
                </div>
              </div>
            </div>

            <div class="study-footer-hint">
              ${icon("sparkles")} Click any command snippet to auto-run in the console.
            </div>
          </aside>
        </div>
      </div>
    `;

    this.attachEvents();
    this.scrollScreenToBottom();
  }

  private attachEvents() {
    if (!this.containerEl) return;

    // Device Tab Switchers
    this.containerEl.querySelectorAll(".netdojo-device-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-device-id");
        if (id) this.switchDevice(id);
      });
    });

    // Fullscreen Button
    this.containerEl
      .querySelector(".netdojo-btn-fullscreen")
      ?.addEventListener("click", () => {
        this.toggleFullscreen();
      });

    // Clear Button
    this.containerEl
      .querySelector(".netdojo-btn-clear")
      ?.addEventListener("click", () => {
        this.logs[this.activeDeviceId] = [];
        this.render();
        this.focusInput();
      });

    // Screen click focuses input
    const screen = this.containerEl.querySelector("#netdojo-term-screen");
    screen?.addEventListener("click", () => {
      this.focusInput();
    });

    // Input Keydown Handler
    const input = this.containerEl.querySelector<HTMLInputElement>(
      ".netdojo-term-input",
    );
    if (input) {
      input.addEventListener("keydown", (e) => {
        this.options.onActivity?.();

        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = input.value;
          input.value = "";
          this.executeCommand(cmd);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (this.history.length > 0) {
            if (this.historyIndex === -1) {
              this.historyIndex = this.history.length - 1;
            } else if (this.historyIndex > 0) {
              this.historyIndex--;
            }
            input.value = this.history[this.historyIndex] || "";
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (this.historyIndex !== -1) {
            if (this.historyIndex < this.history.length - 1) {
              this.historyIndex++;
              input.value = this.history[this.historyIndex] || "";
            } else {
              this.historyIndex = -1;
              input.value = "";
            }
          }
        } else if (e.key === "Tab") {
          e.preventDefault();
          this.autoComplete(input);
        } else if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
          e.preventDefault();
          this.logs[this.activeDeviceId] = [];
          this.render();
          this.focusInput();
        } else if (e.key === "Escape" && this.isFullscreen) {
          this.toggleFullscreen();
        }
      });
    }

    // Study snippet clicks
    this.containerEl.querySelectorAll(".term-snippet-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetDevice = btn.getAttribute("data-device");
        const cmd = btn.getAttribute("data-cmd");
        if (targetDevice && targetDevice !== this.activeDeviceId) {
          this.switchDevice(targetDevice);
        }
        if (cmd) {
          setTimeout(() => this.insertCommand(cmd), 50);
        }
      });
    });
  }

  private executeCommand(rawCommand: string) {
    const cmd = rawCommand.trim();
    const dev = this.getActiveDevice();
    const curLogs = this.logs[this.activeDeviceId] || [];

    // Append prompt line
    curLogs.push({ type: "prompt", text: `${dev.prompt} ${rawCommand}` });

    if (cmd) {
      this.history.push(cmd);
      this.historyIndex = -1;
    }

    if (!cmd) {
      this.render();
      this.focusInput();
      return;
    }

    const lower = cmd.toLowerCase();

    // Command dispatch based on device & command
    if (lower === "clear") {
      this.logs[this.activeDeviceId] = [];
      this.render();
      this.focusInput();
      return;
    }

    if (lower === "help" || lower === "?") {
      curLogs.push({
        type: "output",
        text: `
Available NetDojo Lab Commands (${dev.name}):
  show ip int brief             - Display IP interface status and IP addresses
  show version                  - Display software release and hardware specs
  show running-config / show run- Display active device running configuration
  show bgp evpn summary         - Display EVPN address family neighbors & state
  show sdwan control            - Show SD-WAN controller connections
  ping <ip>                     - Send ICMP echo requests (e.g. ping 10.255.1.2)
  python3 -m pyats run job ...  - Execute automated pyATS health check job
  ansible-playbook ...          - Deploy configuration via Ansible
  verify                        - Run automated lab grading & score verification
  devices                       - List topology nodes & connection status
  switch <device_id>            - Switch terminal to another device
  clear                         - Clear terminal buffer (Ctrl+L)
`,
      });
    } else if (lower === "devices") {
      curLogs.push({
        type: "output",
        text: this.devices
          .map(
            (d) =>
              `  * ${d.name.padEnd(20)} [${d.id.padEnd(10)}] - ${d.os} (${d.status.toUpperCase()})`,
          )
          .join("\n"),
      });
    } else if (lower.startsWith("switch ")) {
      const target = cmd.split(" ")[1];
      if (
        this.devices.some(
          (d) =>
            d.id === target || d.name.toLowerCase() === target.toLowerCase(),
        )
      ) {
        const found = this.devices.find(
          (d) =>
            d.id === target || d.name.toLowerCase() === target.toLowerCase(),
        )!;
        this.switchDevice(found.id);
        return;
      } else {
        curLogs.push({
          type: "error",
          text: `% Unknown device '${target}'. Type 'devices' to list nodes.`,
        });
      }
    } else if (lower === "show ip int brief" || lower === "sh ip int br") {
      this.creditFallback("step-1");
      curLogs.push({
        type: "output",
        text: `
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0/0   192.168.1.10    YES NVRAM  up                    up      
GigabitEthernet0/0/1   10.0.12.1       YES NVRAM  up                    up      
GigabitEthernet0/0/2   10.0.13.1       YES NVRAM  up                    up      
GigabitEthernet0/0/3   unassigned      YES NVRAM  administratively down down    
Loopback0              10.255.1.1      YES NVRAM  up                    up      
Vlan100 (EVPN-Core)    172.16.100.1    YES NVRAM  up                    up      
`,
      });
    } else if (lower === "show version" || lower === "sh ver") {
      curLogs.push({
        type: "output",
        text: `Cisco IOS XE Software, Version 17.09.04a (CAT9K_IOSXE)
Technical Support: http://www.cisco.com/techsupport
Uptime: 3h 42m. System image: bootflash:packages.conf
C9300-48UXM (X86) with 16GB memory, 48x1G, 8x10G interfaces.`,
      });
    } else if (lower.includes("bgp") && lower.includes("summary")) {
      this.creditFallback("step-2");
      curLogs.push({
        type: "output",
        text: `BGP router identifier 10.255.1.1, local AS number 65001
BGP table version is 14, 2 BGP EVPN peers configured

Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.255.1.2      4 65001     412     415       14    0    0 03:22:11        4
10.255.1.3      4 65001     408     411       14    0    0 03:20:45        4`,
      });
    } else if (lower.includes("sdwan") && lower.includes("control")) {
      this.creditFallback("step-4");
      curLogs.push({
        type: "output",
        text: `PEER TYPE  PEER ID       SITE ID  DOMAIN  PEER IP        PORT   STATE  CONNTYPE
--------------------------------------------------------------------------------
vmanage    192.168.10.5  100      0       192.168.10.5   12346  up     DTLS
vsmart     192.168.10.6  100      1       192.168.10.6   12346  up     TLS
vbond      192.168.10.7  0        0       192.168.10.7   12346  up     DTLS`,
      });
    } else if (lower.startsWith("ping ")) {
      const dest = cmd.split(" ")[1] || "10.255.1.2";
      curLogs.push({
        type: "output",
        text: `Sending 5, 100-byte ICMP Echos to ${dest}:
!!!!! (Success rate is 100 percent, round-trip min/avg/max = 1/2/4 ms)`,
      });
    } else if (
      lower.includes("pyats run job") ||
      lower.includes("health_check")
    ) {
      this.creditFallback("step-3");
      curLogs.push({
        type: "output",
        text: `
+------------------------------------------------------------------------------+
|                             Task Execution Summary                           |
+------------------------------------------------------------------------------+
Job ID           : cisco_health_check
Testbed File     : /opt/tds-netdojo/testbeds/catalyst_fabric.yaml
Devices Tested   : Cat9300-Edge-01, Cat8000v-SDWAN

[1/3] Section: ConnectToDevices .......................................... PASSED
      - Cat9300-Edge-01: SSH connection established (0.8s)
      - Cat8000v-SDWAN: SSH connection established (0.9s)
[2/3] Section: VerifyBgpEvpnNeighbors .................................... PASSED
      - Cat9300-Edge-01: Peer 10.255.1.2 State=Established (Prefixes: 4)
      - Cat9300-Edge-01: Peer 10.255.1.3 State=Established (Prefixes: 4)
[3/3] Section: ValidateInterfaceCounters ................................. PASSED
      - Zero input drops detected across all fabric uplinks.

Total Verification Assertions: 14 | Passed: 14 | Failed: 0 | Skipped: 0
Result: 100% HEALTH CHECK PASSED
`,
      });
    } else if (lower.includes("ansible-playbook")) {
      curLogs.push({
        type: "output",
        text: `PLAY [Deploy Cisco Catalyst EVPN Overlay] ******************************
TASK [Configure BGP EVPN L2VPN Address Family] *************************
ok: [Cat9300-Edge-01]
PLAY RECAP: Cat9300-Edge-01: ok=3 changed=0 unreachable=0 failed=0`,
      });
    } else if (lower === "verify" || lower === "grade") {
      // Reports what was actually verified; typing "verify" earns nothing by itself.
      const checks = OBJECTIVE_TITLES.map(
        ([id, title], i) =>
          `[CHECK ${i + 1}/4] ${title.padEnd(52, ".")} [ ${this.verifiedSteps.has(id) ? "PASSED" : "PENDING"} ]`,
      );
      const score = Math.round(
        (this.verifiedSteps.size / OBJECTIVE_TITLES.length) * 100,
      );
      curLogs.push({
        type: score === 100 ? "success" : "output",
        text: `NETDOJO LAB VERIFICATION · graded by ${beacon.ready ? "Jev (intent of each command)" : "command patterns"}
${checks.join("\n")}

Final Lab Score: ${score}% (${this.verifiedSteps.size}/4 Objectives Verified)`,
      });
      if (score === 100) this.options.onVerifySuccess?.(100);
    } else if (lower === "show run" || lower === "show running-config") {
      curLogs.push({
        type: "output",
        text: `Building configuration...
hostname Cat9300-Edge-01
router bgp 65001
 neighbor 10.255.1.2 remote-as 65001
 address-family l2vpn evpn
  neighbor 10.255.1.2 activate
  neighbor 10.255.1.2 send-community both
!
end`,
      });
    } else if (lower === "whoami") {
      curLogs.push({
        type: "output",
        text: "netdojo-engineer (Role: Partner Practice Engineer · CCOID Active)",
      });
    } else if (
      lower === "ls" ||
      lower === "ls -la" ||
      lower === "ls -la /opt/tds-netdojo/scripts"
    ) {
      curLogs.push({
        type: "output",
        text: `-rw-r--r-- 1 cml-user cml-user 3412 Sep 17 08:02 cisco_health_check.py
-rw-r--r-- 1 cml-user cml-user 2180 Sep 17 08:00 deploy_evpn.yml
-rw-r--r-- 1 cml-user cml-user  892 Sep 17 07:58 catalyst_fabric.yaml
-rwxr-xr-x 1 cml-user cml-user 1420 Sep 17 08:04 verify_blueprint.sh`,
      });
    } else {
      curLogs.push({
        type: "output",
        text: `% Command '${cmd}' recognized by NetDojo practice emulator. Type 'help' or click study guide steps for automated scenarios.`,
      });
    }

    this.render();
    this.focusInput();
    if (!NOT_GRADED.has(lower.split(" ")[0]))
      void this.gradeWithJev(cmd, curLogs);
  }

  /** Pattern credit only when Jev is off; Jev judges what the command actually does. */
  private creditFallback(step: string) {
    if (!beacon.ready) this.verifiedSteps.add(step);
  }

  private async gradeWithJev(
    command: string,
    curLogs: Array<{ type: string; text: string }>,
  ) {
    const result = await beaconPost<{ grades: CommandGrade[] }>("grade", {
      command,
      deviceId: this.activeDeviceId,
    });
    if (!result) return;
    const notes: string[] = [];
    for (const g of result.grades) {
      if (g.verdict === "credited" && !this.verifiedSteps.has(g.objectiveId)) {
        this.verifiedSteps.add(g.objectiveId);
        notes.push(`✓ Jev credited: ${g.title}`);
      } else if (
        g.verdict === "close" &&
        !this.verifiedSteps.has(g.objectiveId)
      )
        notes.push(
          `… Close to "${g.title}" (${Math.round(g.probability * 100)}%). Try the verification command for it.`,
        );
    }
    if (!notes.length) return;
    curLogs.push({ type: "output", text: notes.join("\n") });
    this.options.onActivity?.();
    this.render();
  }

  private autoComplete(input: HTMLInputElement) {
    const val = input.value.toLowerCase();
    const suggestions = [
      "show ip int brief",
      "show version",
      "show running-config",
      "show bgp evpn summary",
      "show sdwan control connections",
      "python3 -m pyats run job cisco_health_check.py",
      "ansible-playbook -i hosts deploy_evpn.yml",
      "verify",
      "devices",
      "help",
      "clear",
    ];

    const match = suggestions.find((s) => s.startsWith(val));
    if (match) {
      input.value = match;
    }
  }

  private focusInput() {
    setTimeout(() => {
      const input = this.containerEl?.querySelector<HTMLInputElement>(
        ".netdojo-term-input",
      );
      input?.focus();
    }, 20);
  }

  private scrollScreenToBottom() {
    setTimeout(() => {
      const screen = this.containerEl?.querySelector("#netdojo-term-screen");
      if (screen) {
        screen.scrollTop = screen.scrollHeight;
      }
    }, 10);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
