import { icon } from "../icons.ts";
import { PROGRAM_QUESTIONS_DATA } from "../../shared/edge-data.ts";
import type { ContextPane } from "../components/context-pane.ts";

export class EngageView {
  private activeSubTab: "navigator" | "checklists" | "resources" = "navigator";
  private searchQuery = "";

  constructor(
    private containerEl: HTMLElement,
    private contextPane: ContextPane,
  ) {}

  public render() {
    this.containerEl.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">ENGAGE · GET SET UP & MASTER CISCO 360</div>
          <h1>Foundations, Tool Access & Program Navigator</h1>
          <p>Everything required to initiate your Cisco practice, configure API entitlements, and navigate Cisco 360 rules with verified citations.</p>
        </div>
      </div>

      <nav class="subnav-tabs" aria-label="Engage Sections">
        <button class="subnav-tab ${this.activeSubTab === "navigator" ? "active" : ""}" data-subtab="navigator">
          Cisco 360 Program Navigator
        </button>
        <button class="subnav-tab ${this.activeSubTab === "checklists" ? "active" : ""}" data-subtab="checklists">
          Access & Onboarding Checklists
        </button>
        <button class="subnav-tab ${this.activeSubTab === "resources" ? "active" : ""}" data-subtab="resources">
          Self-Service Resource Library
        </button>
      </nav>

      <div class="engage-subtab-content">
        ${this.renderSubTabContent()}
      </div>
    `;

    this.attachEvents();
  }

  private renderSubTabContent(): string {
    if (this.activeSubTab === "navigator") {
      const filteredQuestions = PROGRAM_QUESTIONS_DATA.filter(
        (pq) =>
          !this.searchQuery ||
          pq.question.toLowerCase().includes(this.searchQuery) ||
          pq.answer.toLowerCase().includes(this.searchQuery) ||
          pq.category.toLowerCase().includes(this.searchQuery),
      );

      return `
        <div class="card" style="padding: 20px; margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; align-items: center;">
            <span style="color: var(--tds-action);">${icon("search")}</span>
            <input
              type="search"
              id="navigator-search"
              class="input"
              placeholder="Ask any question about Cisco 360, PVI rules, specializations, or True Forward..."
              value="${this.searchQuery}"
              style="flex: 1;"
            />
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${filteredQuestions
            .map(
              (pq) => `
            <div class="card" style="padding: 20px; border: 1px solid var(--tds-border);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span class="pillar-badge engage">${pq.category}</span>
                <span class="freshness-badge fresh">${pq.freshness}</span>
              </div>
              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">
                ${pq.question}
              </h3>
              <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--tds-text); margin-bottom: 14px;">
                ${pq.answer}
              </p>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.8125rem; color: var(--tds-text-secondary); background: var(--tds-surface-subtle); padding: 8px 12px; border-radius: var(--tds-radius);">
                <strong>Passage Citations:</strong>
                ${pq.citations
                  .map(
                    (c, i) => `
                  <button type="button" class="citation-pill citation-btn" data-pq="${pq.id}" data-cit="${i}">
                    ${icon("file")} ${c.pillText}
                  </button>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    if (this.activeSubTab === "checklists") {
      return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 1.125rem; font-weight: 700;">1. Partner Identity & CCO ID</h3>
              <span class="badge success">Complete</span>
            </div>
            <p style="font-size: 0.875rem; color: var(--tds-text-secondary); margin-bottom: 16px;">
              Primary CCO ID federation and company partner registration verified.
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.875rem;">
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-success);">${icon("checkCircle")}</span> CCO ID Linked (@partner.com)</li>
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-success);">${icon("checkCircle")}</span> Cisco Partner Portal Association</li>
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-success);">${icon("checkCircle")}</span> PXP Access Enabled</li>
            </ul>
          </div>

          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 1.125rem; font-weight: 700;">2. TD SYNNEX API Center & Quoting</h3>
              <span class="badge" style="background: #fff8e1; color: #b78103;">In Progress</span>
            </div>
            <p style="font-size: 0.875rem; color: var(--tds-text-secondary); margin-bottom: 16px;">
              Direct integration for price, availability, and automated order booking.
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.875rem;">
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-success);">${icon("checkCircle")}</span> TD SYNNEX Account #481029 Linked</li>
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-action);">${icon("clock")}</span> P&A / Quoting API Credentials (Pending Approval)</li>
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-text-secondary);">${icon("circleHelp")}</span> 1Source Cisco Commerce FastTrack</li>
            </ul>
          </div>

          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 1.125rem; font-weight: 700;">3. Cisco Modern GraphQL API</h3>
              <span class="badge" style="background: #e6f9fc; color: #05616d;">Ready to Onboard</span>
            </div>
            <p style="font-size: 0.875rem; color: var(--tds-text-secondary); margin-bottom: 16px;">
              Mandatory modern API connection for catalog, estimates, and order status events.
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.875rem;">
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-success);">${icon("checkCircle")}</span> OAuth2 Client ID Provisioned</li>
              <li style="display: flex; align-items: center; gap: 8px;"><span style="color: var(--tds-text-secondary);">${icon("circleHelp")}</span> Order WebSocket Event Subscription</li>
            </ul>
          </div>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        <div class="card" style="padding: 18px;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 6px;">Cisco 360 Partner Playbook (PDF)</h4>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); margin-bottom: 12px;">Official guide covering tier transition, rebate schedules, and PVI index rules.</p>
          <button type="button" class="button secondary" style="font-size: 0.8125rem;">Download PDF (4.2 MB)</button>
        </div>
        <div class="card" style="padding: 18px;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 6px;">Cisco Enterprise Agreement 3.0 Handbook</h4>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); margin-bottom: 12px;">Commercial terms, True Forward calculation worksheets, and portfolio guides.</p>
          <button type="button" class="button secondary" style="font-size: 0.8125rem;">Download Guide (2.8 MB)</button>
        </div>
        <div class="card" style="padding: 18px;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 6px;">TD SYNNEX Digital Bridge & API Center</h4>
          <p style="font-size: 0.8125rem; color: var(--tds-text-secondary); margin-bottom: 12px;">Step-by-step instructions for integrating partner ERP and CRM systems.</p>
          <button type="button" class="button secondary" style="font-size: 0.8125rem;">View Online Folio</button>
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

    const searchInput = this.containerEl.querySelector(
      "#navigator-search",
    ) as HTMLInputElement | null;
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      this.render();
      // Restore focus
      const nextInput = this.containerEl.querySelector(
        "#navigator-search",
      ) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(
          nextInput.value.length,
          nextInput.value.length,
        );
      }
    });

    this.containerEl.querySelectorAll(".citation-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pqId = btn.getAttribute("data-pq");
        const citIdx = Number(btn.getAttribute("data-cit"));
        const pq = PROGRAM_QUESTIONS_DATA.find((p) => p.id === pqId);
        if (pq && pq.citations[citIdx]) {
          const cit = pq.citations[citIdx];
          const bodyHtml = `
            <div class="card" style="padding: 16px; border-left: 4px solid var(--tds-teal); margin-bottom: 16px;">
              <span class="freshness-badge fresh" style="margin-bottom: 8px;">${pq.freshness}</span>
              <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">${cit.pillText}</h4>
              <div style="font-size: 0.8125rem; color: var(--tds-action); font-weight: 600; margin-bottom: 12px;">Source Document: ${cit.source}</div>
              <blockquote style="margin: 0; padding: 12px; background: var(--tds-surface-subtle); border-radius: var(--tds-radius); font-size: 0.875rem; line-height: 1.5; font-style: italic;">
                "${cit.passage}"
              </blockquote>
            </div>
            <div style="font-size: 0.8125rem; color: var(--tds-text-secondary);">
              <strong>Context of query:</strong> ${pq.question}
            </div>
          `;
          this.contextPane.open(
            "Passage Citation Verification",
            bodyHtml,
            `<button type="button" class="button secondary" id="cit-close-btn">Close</button>`,
          );
          document
            .getElementById("cit-close-btn")
            ?.addEventListener("click", () => this.contextPane.close());
        }
      });
    });
  }
}
