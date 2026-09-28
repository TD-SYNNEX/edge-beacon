import { icon } from "../icons.ts";
import { CUSTOMERS_DATA } from "../../shared/edge-data.ts";
import type { Customer360 } from "../../shared/edge-types.ts";
import type { ContextPane } from "../components/context-pane.ts";

export class GrowView {
  private activeSubTab:
    "customers" | "discover" | "library" | "use-cases" | "shortlist" =
    "customers";

  constructor(
    private containerEl: HTMLElement,
    private contextPane: ContextPane,
    private onSubTabChange: (
      subtab: "customers" | "discover" | "library" | "use-cases" | "shortlist",
    ) => void,
  ) {}

  public setSubTab(
    subtab: "customers" | "discover" | "library" | "use-cases" | "shortlist",
  ) {
    this.activeSubTab = subtab;
    this.render();
  }

  public render() {
    this.containerEl.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">GROW · CUSTOMER 360, PIPELINE & DEAL SUPPORT</div>
          <h1>Customer Lifecycle, Solution Matching & Deals</h1>
          <p>Consolidated view of customer install bases, Cisco Enterprise Agreements (EA 3.0), True Forward estimates, and the 375 use-case solution discovery engine.</p>
        </div>
      </div>

      <nav class="subnav-tabs" aria-label="Grow Sections">
        <button class="subnav-tab ${this.activeSubTab === "customers" ? "active" : ""}" data-subtab="customers">
          Customer 360 & Deals (${CUSTOMERS_DATA.length})
        </button>
        <button class="subnav-tab ${this.activeSubTab === "discover" ? "active" : ""}" data-subtab="discover">
          Find a Solution (Guided Matching)
        </button>
        <button class="subnav-tab ${this.activeSubTab === "library" ? "active" : ""}" data-subtab="library">
          Turnkey Solutions (12)
        </button>
        <button class="subnav-tab ${this.activeSubTab === "use-cases" ? "active" : ""}" data-subtab="use-cases">
          Use-Case Atlas (375)
        </button>
        <button class="subnav-tab ${this.activeSubTab === "shortlist" ? "active" : ""}" data-subtab="shortlist">
          My Shortlist & Brief
        </button>
      </nav>

      <div class="grow-customers-content" ${this.activeSubTab === "customers" ? "" : "hidden"}>
        ${this.renderCustomersTable()}
      </div>
    `;

    this.attachEvents();
  }

  private renderCustomersTable(): string {
    return `
      <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--tds-border); margin-bottom: 24px;">
        <div style="padding: 16px 20px; background: var(--tds-surface-subtle); border-bottom: 1px solid var(--tds-border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--tds-deep-teal);">
            Accounts with Active Telemetry & Cisco Ready Data
          </h3>
          <span style="font-size: 0.8125rem; color: var(--tds-text-secondary);">
            Click any row to inspect Install Base, EA True Forward & Playbooks
          </span>
        </div>

        <div style="overflow-x: auto;">
          <table class="compare-table customer-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
            <thead>
              <tr style="background: var(--tds-surface-subtle); border-bottom: 1px solid var(--tds-border);">
                <th style="padding: 12px 16px;">Account / GU Name</th>
                <th style="padding: 12px 16px;">Health Score</th>
                <th style="padding: 12px 16px;">EA 3.0 / True Forward</th>
                <th style="padding: 12px 16px;">Install Base</th>
                <th style="padding: 12px 16px;">Meraki / Webex</th>
                <th style="padding: 12px 16px;">Opportunities</th>
                <th style="padding: 12px 16px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${CUSTOMERS_DATA.map(
                (c) => `
                <tr class="customer-row" data-id="${c.id}" style="cursor: pointer; border-bottom: 1px solid var(--tds-border); transition: background 0.15s ease;">
                  <td style="padding: 14px 16px;">
                    <div style="font-weight: 700; color: var(--tds-text); font-size: 0.9375rem;">${c.company}</div>
                    <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">${c.guName} (${c.guId})</div>
                  </td>
                  <td style="padding: 14px 16px;">
                    <span class="pillar-badge ${c.healthBand === "In Progress" ? "develop" : c.healthBand === "At Risk" ? "grow" : "extend"}">
                      ${c.healthBand} (${c.healthScore})
                    </span>
                  </td>
                  <td style="padding: 14px 16px;">
                    <div style="font-weight: 600;">${c.activeEa ? "EA 3.0 Active" : "No EA"}</div>
                    <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">${c.eaTrueForwardEstimate}</div>
                  </td>
                  <td style="padding: 14px 16px;">
                    <strong>${c.installBase.length} units</strong>
                    <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">
                      ${c.installBase.filter((i) => i.status === "Expiring").length} LDoS Expiring
                    </div>
                  </td>
                  <td style="padding: 14px 16px;">
                    <div>${c.merakiDevices} Meraki AP/Switches</div>
                    <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">${c.webexLicenses} Webex Seats</div>
                  </td>
                  <td style="padding: 14px 16px;">
                    <span class="badge ${c.openOpportunityCards.length > 0 ? "primary" : "neutral"}">
                      ${c.openOpportunityCards.length} Open Cards
                    </span>
                  </td>
                  <td style="padding: 14px 16px; text-align: right;">
                    <button type="button" class="button secondary inspect-cust-btn" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.8125rem;">
                      Inspect 360
                    </button>
                  </td>
                </tr>
              `,
              ).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Opportunity Explorer Highlights -->
      <div class="section-heading">
        <div>
          <span class="step-label">OPPORTUNITY EXPLORER</span>
          <h2>High-Priority Commercial Radar</h2>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        ${CUSTOMERS_DATA.flatMap((c) =>
          c.openOpportunityCards.map((opp) => ({
            ...opp,
            company: c.company,
            custId: c.id,
          })),
        )
          .map(
            (opp) => `
          <div class="card" style="padding: 18px; border-left: 4px solid var(--tds-action); border-top: 1px solid var(--tds-border); border-right: 1px solid var(--tds-border); border-bottom: 1px solid var(--tds-border); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="pillar-badge grow" style="font-size: 0.6875rem;">${opp.category}</span>
                <strong style="color: var(--tds-action); font-size: 1.125rem;">${opp.value}</strong>
              </div>
              <div style="font-size: 0.75rem; color: var(--tds-text-secondary); margin-bottom: 4px;">${opp.company}</div>
              <h4 style="font-size: 0.9375rem; font-weight: 700; margin-bottom: 6px;">${opp.title}</h4>
              <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); line-height: 1.4;">${opp.evidence}</p>
            </div>
            <div style="margin-top: 14px; border-top: 1px solid var(--tds-border); padding-top: 10px; display: flex; justify-content: flex-end;">
              <button type="button" class="text-button open-cust-card-btn" data-id="${opp.custId}">
                Open in Customer 360 ${icon("arrow")}
              </button>
            </div>
          </div>
        `,
          )
          .join("")}
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
          this.onSubTabChange(sub);
          this.render();
        }
      });
    });

    this.containerEl.querySelectorAll(".customer-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const id = row.getAttribute("data-id");
        const cust = CUSTOMERS_DATA.find((c) => c.id === id);
        if (cust) this.contextPane.showCustomer(cust);
      });
    });

    this.containerEl.querySelectorAll(".open-cust-card-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const cust = CUSTOMERS_DATA.find((c) => c.id === id);
        if (cust) this.contextPane.showCustomer(cust);
      });
    });
  }
}
