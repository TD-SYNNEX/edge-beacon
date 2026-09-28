import { icon } from "../icons.ts";
import { COURSES_DATA, VIRTUAL_LABS_DATA } from "../../shared/edge-data.ts";
import type { Course, VirtualLab } from "../../shared/edge-types.ts";
import type { ContextPane } from "../components/context-pane.ts";
import { NetDojoTerminal } from "../components/terminal.ts";

export class DevelopView {
  private activeSubTab: "catalog" | "labs" | "pvi" = "catalog";
  private selectedPortfolio = "All";
  private selectedFormat = "All";
  private activeLabConsole: string | null = "lab-cml-1"; // default open console for demo
  private terminal: NetDojoTerminal;

  constructor(
    private containerEl: HTMLElement,
    private contextPane: ContextPane,
    private showToast?: (
      msg: string,
      type?: "success" | "info" | "warning",
    ) => void,
  ) {
    this.terminal = new NetDojoTerminal({
      onVerifySuccess: (score) => {
        if (this.showToast) {
          this.showToast(
            `NetDojo Lab Verified! Score: ${score}% · PVI +0.3 Networking Capability awarded.`,
            "success",
          );
        }
      },
    });
  }

  public render() {
    this.containerEl.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">DEVELOP · BUILD CAPABILITY & LAB EXPERIENCE</div>
          <h1>Learning Paths, PVI Skills & Virtual Labs</h1>
          <p>Role-based training mapped to the Cisco Partner Value Index, certification cohorts, and scheduled on-demand virtual labs on Cisco Modeling Labs (CML).</p>
        </div>
      </div>

      <nav class="subnav-tabs" aria-label="Develop Sections">
        <button class="subnav-tab ${this.activeSubTab === "catalog" ? "active" : ""}" data-subtab="catalog">
          Higher EDGEucation Catalog (${COURSES_DATA.length})
        </button>
        <button class="subnav-tab ${this.activeSubTab === "labs" ? "active" : ""}" data-subtab="labs">
          Virtual Labs Estate (${VIRTUAL_LABS_DATA.length})
        </button>
        <button class="subnav-tab ${this.activeSubTab === "pvi" ? "active" : ""}" data-subtab="pvi">
          PVI Readiness & Specializations
        </button>
      </nav>

      <div class="develop-subtab-content">
        ${this.renderSubTabContent()}
      </div>
    `;

    this.attachEvents();
  }

  private renderSubTabContent(): string {
    if (this.activeSubTab === "catalog") {
      const filteredCourses = COURSES_DATA.filter((c) => {
        const matchesPortfolio =
          this.selectedPortfolio === "All" ||
          c.portfolio === this.selectedPortfolio;
        const matchesFormat =
          this.selectedFormat === "All" || c.format === this.selectedFormat;
        return matchesPortfolio && matchesFormat;
      });

      const portfolios = [
        "All",
        "Networking",
        "Security",
        "Collaboration",
        "Cloud and AI Infrastructure",
        "Services",
      ];
      const formats = ["All", "Self-paced", "Video", "SCORM", "Webinar", "ILT"];

      return `
        <!-- Filter Strip -->
        <div class="card" style="padding: 16px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 0.8125rem; font-weight: 700; color: var(--tds-text-secondary); text-transform: uppercase;">Portfolio:</span>
            ${portfolios
              .map(
                (p) => `
              <button type="button" class="tag-pill portfolio-filter-btn ${this.selectedPortfolio === p ? "active" : ""}" data-portfolio="${p}">
                ${p}
              </button>
            `,
              )
              .join("")}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 0.8125rem; font-weight: 700; color: var(--tds-text-secondary); text-transform: uppercase;">Modality:</span>
            <select id="format-select" class="input" style="padding: 4px 10px; font-size: 0.8125rem;">
              ${formats.map((f) => `<option value="${f}" ${this.selectedFormat === f ? "selected" : ""}>${f}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Course Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
          ${filteredCourses
            .map(
              (c) => `
            <div class="card course-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--tds-border);">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <span class="pillar-badge ${c.pillar.toLowerCase()}">${c.pillar}</span>
                  <span class="badge ${c.registrationModel === "funded" ? "success" : c.registrationModel === "quick" ? "neutral" : "primary"}" style="font-size: 0.6875rem;">
                    ${c.registrationModel.toUpperCase()} REGISTRATION
                  </span>
                </div>
                <h3 style="font-size: 1.0625rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">
                  ${c.title}
                </h3>
                <p style="font-size: 0.875rem; color: var(--tds-text-secondary); line-height: 1.4; margin-bottom: 14px;">
                  ${c.description}
                </p>
              </div>

              <div style="border-top: 1px solid var(--tds-border); padding-top: 12px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 12px;">
                  <span>PVI Impact: <strong style="color: var(--tds-success);">${c.pviImpact}</strong></span>
                  <strong>${c.coursePrice}</strong>
                </div>
                <button type="button" class="button secondary view-course-btn" data-id="${c.id}" style="width: 100%;">
                  ${c.isRegistered ? "Access Class Content" : "View Schedule & Enrol"}
                </button>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    if (this.activeSubTab === "labs") {
      return `
        <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
          <!-- NetDojo Interactive In-Browser Terminal Mount -->
          <div class="netdojo-terminal-container">
            <div id="netdojo-terminal-mount"></div>
          </div>

          <!-- Lab Estate & Blueprints Banner -->
          <div class="card" style="padding: 18px; background: var(--tds-surface-subtle); border-left: 4px solid var(--tds-action);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 4px;">
                  NetDojo Virtual Lab Estate & Blueprints (CML 2.9.1 on AWS)
                </h3>
                <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); line-height: 1.4;">
                  All hands-on practice pods run on isolated CML environments with xterm.js terminal proxies. Sessions auto-idle in 30 minutes to manage compute costs ($2.22/hr vs $5.00/hr bare metal).
                </p>
              </div>
              <button type="button" class="button primary" id="launch-fullscreen-terminal-btn" style="font-size: 0.8125rem;">
                ${icon("terminal")} Expand Terminal Fullscreen
              </button>
            </div>
          </div>

          <!-- Lab Cards Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px;">
            ${VIRTUAL_LABS_DATA.map(
              (lab) => `
              <div class="card" style="padding: 20px; border: 1px solid var(--tds-border);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <span class="pillar-badge develop">${lab.category}</span>
                  <span class="badge ${lab.state === "running" ? "success" : "neutral"}">
                    ${lab.state === "running" ? "● Active Lab" : "○ Saved Topology"}
                  </span>
                </div>
                <h4 style="font-size: 1.0625rem; font-weight: 700; margin-bottom: 6px;">${lab.title}</h4>
                <div style="font-size: 0.8125rem; color: var(--tds-text-secondary); margin-bottom: 10px;">${lab.topology}</div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
                  ${lab.devices.map((d) => `<span class="tag-pill" style="font-size: 0.6875rem;">${d}</span>`).join("")}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--tds-border); padding-top: 12px;">
                  <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">
                    Server: <strong>${lab.serverStatus}</strong>
                    ${lab.idleMinutesRemaining ? ` · Idle shutdown in ${lab.idleMinutesRemaining}m` : ""}
                  </div>
                  <div style="display: flex; gap: 8px;">
                    ${
                      lab.state === "running"
                        ? `<button type="button" class="button primary open-console-btn" data-id="${lab.id}" style="font-size: 0.8125rem;">
                            ${icon("terminal")} Open Console
                          </button>`
                        : `<button type="button" class="button secondary book-lab-btn" data-id="${lab.id}" style="font-size: 0.8125rem;">
                            Book 4h Slot
                          </button>`
                    }
                  </div>
                </div>
              </div>
            `,
            ).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="card" style="padding: 24px; max-width: 780px;">
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">
          Cisco Partner Value Index (PVI) Readiness Planner
        </h3>
        <p style="font-size: 0.875rem; color: var(--tds-text-secondary); margin-bottom: 20px;">
          Directional scoring based on Higher EDGEucation course completions and active certifications. Official scores are verified inside Cisco PXP.
        </p>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.875rem; margin-bottom: 4px;">
              <span>1. Foundational Capability (45% Weight)</span>
              <span style="color: var(--tds-success);">8.2 / 10 (Target Met)</span>
            </div>
            <div class="journey-progress-bar"><div class="journey-progress-fill" style="width: 82%; background: var(--edge-develop);"></div></div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.875rem; margin-bottom: 4px;">
              <span>2. Practice Breadth across 6 Portfolios (25% Weight)</span>
              <span style="color: #b78103;">6.4 / 10 (0.6 pt to Preferred)</span>
            </div>
            <div class="journey-progress-bar"><div class="journey-progress-fill" style="width: 64%; background: #b78103;"></div></div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.875rem; margin-bottom: 4px;">
              <span>3. Specialization Depth (20% Weight)</span>
              <span style="color: var(--tds-success);">7.8 / 10 (Target Met)</span>
            </div>
            <div class="journey-progress-bar"><div class="journey-progress-fill" style="width: 78%; background: var(--edge-develop);"></div></div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.875rem; margin-bottom: 4px;">
              <span>4. Customer Lifecycle & Renewals (10% Weight)</span>
              <span style="color: var(--tds-danger);">4.5 / 10 (At Risk)</span>
            </div>
            <div class="journey-progress-bar"><div class="journey-progress-fill" style="width: 45%; background: var(--tds-danger);"></div></div>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--tds-border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.75rem; color: var(--tds-text-secondary); text-transform: uppercase;">Composite Projected PVI:</span>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--tds-deep-teal);">6.8 / 10.0</div>
          </div>
          <button type="button" class="button primary" id="launch-pvi-roadmap-btn">Generate PVI Action Plan (PDF)</button>
        </div>
      </div>
    `;
  }

  private attachEvents() {
    this.containerEl.querySelectorAll(".subnav-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const sub = (e.currentTarget as HTMLElement).getAttribute(
          "data-subtab",
        ) as any;
        if (sub) {
          this.activeSubTab = sub;
          this.render();
        }
      });
    });

    this.containerEl
      .querySelectorAll(".portfolio-filter-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          this.selectedPortfolio =
            (e.currentTarget as HTMLElement).getAttribute("data-portfolio") ||
            "All";
          this.render();
        });
      });

    const formatSelect = this.containerEl.querySelector(
      "#format-select",
    ) as HTMLSelectElement | null;
    formatSelect?.addEventListener("change", (e) => {
      this.selectedFormat = (e.target as HTMLSelectElement).value;
      this.render();
    });

    this.containerEl.querySelectorAll(".view-course-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const course = COURSES_DATA.find((c) => c.id === id);
        if (course) {
          this.contextPane.showCourse(course, () => {
            course.isRegistered = true;
            this.render();
          });
        }
      });
    });

    this.containerEl.querySelectorAll(".book-lab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const lab = VIRTUAL_LABS_DATA.find((l) => l.id === id);
        if (lab) {
          alert(
            `Booked 4-hour reservation for '${lab.title}'. Scheduled in TD SYNNEX CML host.`,
          );
          lab.serverStatus = "Waking (Booting)";
          this.render();
        }
      });
    });

    this.containerEl
      .querySelector("#launch-pvi-roadmap-btn")
      ?.addEventListener("click", () => {
        alert(
          "PVI Roadmap Action Plan downloaded (PDF). 4 recommended courses queued in Develop.",
        );
      });

    // Mount NetDojo interactive terminal if in labs subtab
    const termMount = this.containerEl.querySelector<HTMLElement>(
      "#netdojo-terminal-mount",
    );
    if (termMount) {
      this.terminal.mount(termMount);
    }

    // Fullscreen expansion toggle
    this.containerEl
      .querySelector("#launch-fullscreen-terminal-btn")
      ?.addEventListener("click", () => {
        this.terminal.toggleFullscreen();
      });

    // Open console buttons on active labs
    this.containerEl.querySelectorAll(".open-console-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.terminal.switchDevice(id === "lab-cml-2" ? "cat8000v" : "cat9300");
        termMount?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  public openLabsConsole(deviceId = "cat9300") {
    this.activeSubTab = "labs";
    this.render();
    setTimeout(() => {
      this.terminal.switchDevice(deviceId);
      const termMount = this.containerEl.querySelector<HTMLElement>(
        "#netdojo-terminal-mount",
      );
      termMount?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }
}
