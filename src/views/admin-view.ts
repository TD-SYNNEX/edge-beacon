import { icon } from "../icons.ts";
import { AGENT_CONTROLS_DATA } from "../../shared/edge-data.ts";
import type { AgentControl } from "../../shared/edge-types.ts";

export class AdminView {
  private agents: AgentControl[] = [...AGENT_CONTROLS_DATA];
  private isSystemPaused = false;

  constructor(private containerEl: HTMLElement) {}

  public render() {
    this.containerEl.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">ADMIN CONTROL TOWER · INTERNAL OPERATORS ONLY</div>
          <h1>Agent Control Tower & Application Register</h1>
          <p>Operator control plane for adjusting agent autonomy levels, inspecting live run health, emergency kill-switches, and managing the application portfolio intake pipeline.</p>
        </div>
      </div>

      <!-- Health & Safety Bar -->
      <div class="card" style="padding: 18px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--tds-border);">
        <div>
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 4px;">
            System Safety & Global Emergency Kill-Switch
          </h3>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary);">
            Instantly force all 11 agents into 'Observe Only' mode, preventing any automated write or CRM synchronization.
          </p>
        </div>
        <div>
          <button type="button" class="button ${this.isSystemPaused ? "primary" : "danger"}" id="system-kill-btn">
            ${this.isSystemPaused ? `${icon("play")} Resume Autonomous Execution` : `${icon("alert")} Force Observe-Only (All Agents)`}
          </button>
        </div>
      </div>

      <!-- Agent Control Tower Table -->
      <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--tds-border); margin-bottom: 32px;">
        <div style="padding: 16px 20px; background: var(--tds-surface-subtle); border-bottom: 1px solid var(--tds-border);">
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--tds-deep-teal);">
            Active AI Agents (11 Supervised & Autonomous Workers)
          </h3>
        </div>

        <div style="overflow-x: auto;">
          <table class="control-tower-table" style="margin: 0; border: none;">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Role & Responsibility</th>
                <th>Autonomy Dial</th>
                <th>Total Runs</th>
                <th>Approval Rate</th>
                <th>Allowed Tools</th>
                <th>Last Run Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${this.agents
                .map(
                  (ag) => `
                <tr>
                  <td>
                    <strong style="color: var(--tds-text);">${ag.name}</strong>
                  </td>
                  <td style="color: var(--tds-text-secondary); font-size: 0.8125rem;">
                    ${ag.role}
                  </td>
                  <td>
                    <select class="autonomy-select dial-input" data-id="${ag.id}" ${this.isSystemPaused ? "disabled" : ""}>
                      <option value="Observe & Suggest" ${ag.autonomy === "Observe & Suggest" ? "selected" : ""}>Observe & Suggest</option>
                      <option value="Supervised" ${ag.autonomy === "Supervised" ? "selected" : ""}>Supervised (Gate)</option>
                      <option value="Autonomous" ${ag.autonomy === "Autonomous" ? "selected" : ""}>Autonomous</option>
                    </select>
                  </td>
                  <td><strong>${ag.runsTotal}</strong></td>
                  <td><span class="badge success">${ag.approvalRate}</span></td>
                  <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                      ${ag.allowedTools.map((t) => `<span class="tag-pill" style="font-size: 0.6875rem;">${t}</span>`).join("")}
                    </div>
                  </td>
                  <td style="font-size: 0.8125rem; color: var(--tds-text-secondary);">
                    ${ag.lastRunOutcome}
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- App Register & Intake -->
      <div class="section-heading">
        <div>
          <span class="step-label">PORTFOLIO INTAKE</span>
          <h2>Application Portfolio Register</h2>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        <div class="card" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="font-size: 0.9375rem; font-weight: 700;">Higher EDGEucation (LMS)</h4>
            <span class="badge" style="background: #fff8e1; color: #b78103;">Phase 1 Migration</span>
          </div>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); line-height: 1.4;">
            Catalog & class schedule consolidated into Develop pillar. Legacy database reconciliation underway.
          </p>
        </div>

        <div class="card" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="font-size: 0.9375rem; font-weight: 700;">Revolution Insights</h4>
            <span class="badge" style="background: #e6f9fc; color: #05616d;">Phase 2 Consolidation</span>
          </div>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); line-height: 1.4;">
            Customer 360, Cisco Ready data imports with asset hashing, and True Forward rate cards absorbed into Grow.
          </p>
        </div>

        <div class="card" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="font-size: 0.9375rem; font-weight: 700;">Wikibot & EDGE360 Bot</h4>
            <span class="badge success">Consolidated</span>
          </div>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); line-height: 1.4;">
            Merged into Ask Atlas with permission-aware passage retrieval, citations, and verified freshness indicators.
          </p>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents() {
    this.containerEl
      .querySelector("#system-kill-btn")
      ?.addEventListener("click", () => {
        this.isSystemPaused = !this.isSystemPaused;
        if (this.isSystemPaused) {
          this.agents.forEach((a) => (a.autonomy = "Observe & Suggest"));
        }
        this.render();
      });

    this.containerEl.querySelectorAll(".autonomy-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const id = sel.getAttribute("data-id");
        const val = (e.target as HTMLSelectElement).value as any;
        const ag = this.agents.find((a) => a.id === id);
        if (ag) {
          ag.autonomy = val;
        }
      });
    });
  }
}
