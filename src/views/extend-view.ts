import { icon } from "../icons.ts";

export class ExtendView {
  constructor(private containerEl: HTMLElement) {}

  public render() {
    this.containerEl.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">EXTEND · COMMUNITIES, PLAYBOOKS & CONNECT YOUR AI</div>
          <h1>Ecosystem Connectivity & Shared Capabilities</h1>
          <p>Collaborate across Webex community hubs, access the shared playbook repository, and connect your own AI agents through our secure Model Context Protocol (MCP) server.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <!-- MCP Server -->
        <div class="card" style="padding: 24px; border: 1px solid var(--tds-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="pillar-badge extend">MCP & Integrations</span>
            <span class="badge success">Active</span>
          </div>
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">
            Model Context Protocol (MCP) Endpoint
          </h3>
          <p style="font-size: 0.875rem; color: var(--tds-text-secondary); line-height: 1.5; margin-bottom: 16px;">
            Allow your internal AI copilots (Claude, Cursor, custom agents) to query EDGE Beacon for real-time Cisco product availability, certified PVI roadmaps, and renewal alerts.
          </p>
          <div style="background: var(--tds-surface-subtle); padding: 12px; border-radius: var(--tds-radius); font-family: var(--tds-mono); font-size: 0.75rem; margin-bottom: 16px; overflow-x: auto;">
            Endpoint: https://mcp.atlas.tdsynnex.com/v1/sse<br />
            Auth: Bearer tds_live_sec_8921a9
          </div>
          <button type="button" class="button secondary" id="copy-mcp-btn" style="font-size: 0.8125rem;">
            ${icon("copy")} Copy MCP Configuration
          </button>
        </div>

        <!-- Webex Communities -->
        <div class="card" style="padding: 24px; border: 1px solid var(--tds-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="pillar-badge extend">Webex Hubs</span>
            <span class="freshness-badge fresh">10 Spaces</span>
          </div>
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">
            Partner Practice Communities
          </h3>
          <p style="font-size: 0.875rem; color: var(--tds-text-secondary); line-height: 1.5; margin-bottom: 16px;">
            Direct peer-to-peer and TD SYNNEX solution architect discussions in dedicated Webex spaces.
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
              <span>• AI & Data Center Architecture</span>
              <a href="#" style="color: var(--tds-action);">Join space ${icon("external")}</a>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
              <span>• Cisco Security & Zero Trust</span>
              <a href="#" style="color: var(--tds-action);">Join space ${icon("external")}</a>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
              <span>• Meraki Masters & Wireless</span>
              <a href="#" style="color: var(--tds-action);">Join space ${icon("external")}</a>
            </div>
          </div>
        </div>

        <!-- Events Calendar -->
        <div class="card" style="padding: 24px; border: 1px solid var(--tds-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="pillar-badge extend">Events</span>
            <span class="badge neutral">Q4 Schedule</span>
          </div>
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">
            Technical Briefings & Replays
          </h3>
          <p style="font-size: 0.875rem; color: var(--tds-text-secondary); line-height: 1.5; margin-bottom: 16px;">
            Live webinars and recorded architecture deep-dives from TD SYNNEX solutions architects.
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="border-left: 3px solid var(--tds-action); padding-left: 10px; font-size: 0.8125rem;">
              <strong>Oct 06 · AI Practice Accelerator Cohort Launch</strong>
              <div style="color: var(--tds-text-secondary);">Funded 3-week hands-on series</div>
            </div>
            <div style="border-left: 3px solid var(--tds-action); padding-left: 10px; font-size: 0.8125rem;">
              <strong>Oct 21 · Cisco B2B GraphQL API Masterclass</strong>
              <div style="color: var(--tds-text-secondary);">Virtual ILT + NetDojo lab environment</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.containerEl
      .querySelector("#copy-mcp-btn")
      ?.addEventListener("click", () => {
        navigator.clipboard.writeText(
          `{\n  "mcpServers": {\n    "ai-atlas": {\n      "url": "https://mcp.atlas.tdsynnex.com/v1/sse",\n      "headers": { "Authorization": "Bearer tds_live_sec_8921a9" }\n    }\n  }\n}`,
        );
        alert("Copied MCP server configuration to clipboard!");
      });
  }
}
