import { $ } from "../dom.ts";
import { icon } from "../icons.ts";
import type {
  Customer360,
  Course,
  InboxItem,
} from "../../shared/edge-types.ts";
import { beaconPost, esc } from "../beacon-client.ts";
import type { CheckedOpportunity } from "../../server/jev/opportunities.ts";

export class ContextPane {
  private paneEl: HTMLElement | null = null;
  private backdropEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private footerEl: HTMLElement | null = null;
  private previousActiveElement: HTMLElement | null = null;

  constructor() {
    this.paneEl = $("#context-pane");
    this.backdropEl = $("#context-backdrop");
    this.titleEl = $("#context-pane-title");
    this.bodyEl = $("#context-pane-body");
    this.footerEl = $("#context-pane-footer");

    this.initEvents();
  }

  private initEvents() {
    $("#context-pane-close")?.addEventListener("click", () => this.close());
    this.backdropEl?.addEventListener("click", () => this.close());

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });
  }

  public isOpen(): boolean {
    return this.paneEl?.classList.contains("open") ?? false;
  }

  public open(title: string, bodyHtml: string, footerHtml = "") {
    this.previousActiveElement = document.activeElement as HTMLElement | null;

    if (this.titleEl) this.titleEl.textContent = title;
    if (this.bodyEl) this.bodyEl.innerHTML = bodyHtml;
    if (this.footerEl) {
      this.footerEl.innerHTML = footerHtml;
      this.footerEl.hidden = !footerHtml;
    }

    this.paneEl?.classList.add("open");
    this.backdropEl?.classList.add("active");
    this.paneEl?.setAttribute("aria-hidden", "false");

    // Focus close button or first interactive element
    $("#context-pane-close")?.focus();
  }

  public close() {
    this.paneEl?.classList.remove("open");
    this.backdropEl?.classList.remove("active");
    this.paneEl?.setAttribute("aria-hidden", "true");

    if (
      this.previousActiveElement &&
      typeof this.previousActiveElement.focus === "function"
    ) {
      this.previousActiveElement.focus();
    }
  }

  public showCustomer(cust: Customer360) {
    const bodyHtml = `
      <div class="context-section">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <h4 style="font-size: 1.25rem; font-weight: 700; color: var(--tds-deep-teal);">${cust.company}</h4>
            <div style="font-size: 0.8125rem; color: var(--tds-text-secondary);">${cust.guName} (${cust.guId})</div>
          </div>
          <span class="pillar-badge grow">${cust.healthBand} (${cust.healthScore}/10)</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
          ${cust.tags.map((t) => `<span class="tag-pill">${t}</span>`).join("")}
        </div>
      </div>

      <div class="card" style="padding: 14px; margin-bottom: 16px;">
        <h5 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 8px;">Commercial & EA Status</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8125rem;">
          <div><span style="color: var(--tds-text-secondary);">Enterprise Agreement:</span> <strong>${cust.activeEa ? "Active (EA 3.0)" : "None"}</strong></div>
          <div><span style="color: var(--tds-text-secondary);">True Forward:</span> <strong>${cust.eaTrueForwardEstimate}</strong></div>
          <div><span style="color: var(--tds-text-secondary);">Meraki Devices:</span> <strong>${cust.merakiDevices}</strong></div>
          <div><span style="color: var(--tds-text-secondary);">Webex Seats:</span> <strong>${cust.webexLicenses}</strong></div>
        </div>
        <div style="margin-top: 8px; font-size: 0.75rem; color: var(--tds-text-secondary);">
          <span class="freshness-badge fresh">${cust.freshnessLabel}</span>
        </div>
      </div>

      <div class="context-section" style="margin-bottom: 16px;">
        <h5 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 8px;">Install Base Telemetry (${cust.installBase.length} devices)</h5>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${cust.installBase
            .map(
              (ib) => `
            <div style="padding: 10px; border: 1px solid var(--tds-border); border-radius: var(--tds-radius); background: var(--tds-surface-subtle); font-size: 0.8125rem;">
              <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span>${ib.family} · ${ib.pid}</span>
                <span class="badge ${ib.status === "Covered" ? "success" : "danger"}" style="font-size: 0.6875rem;">${ib.status}</span>
              </div>
              <div style="color: var(--tds-text-secondary); font-size: 0.75rem; margin-top: 4px;">SN: ${ib.serial} · Site: ${ib.site}</div>
              <div style="color: var(--tds-text-secondary); font-size: 0.75rem;">LDoS: ${ib.ldos} · Contract: ${ib.contract}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>

      <div class="context-section">
        <h5 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 8px;">Opportunity Explorer (${cust.openOpportunityCards.length})</h5>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${cust.openOpportunityCards
            .map(
              (opp) => `
            <div style="padding: 12px; border-left: 3px solid var(--tds-action); background: #fff; border-top: 1px solid var(--tds-border); border-right: 1px solid var(--tds-border); border-bottom: 1px solid var(--tds-border); border-radius: 0 var(--tds-radius) var(--tds-radius) 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="pillar-badge grow" style="font-size: 0.6875rem;">${opp.category}</span>
                <strong style="color: var(--tds-action);">${opp.value}</strong>
              </div>
              <div style="font-weight: 600; font-size: 0.875rem;">${opp.title}</div>
              <p style="font-size: 0.75rem; color: var(--tds-text-secondary); margin-top: 4px;">${opp.evidence}</p>
              <div class="jev-note" data-jev-opp="${opp.id}" aria-live="polite"></div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="button secondary" id="pane-close-btn">Close</button>
      <button type="button" class="button primary" id="pane-action-quote">Launch Deal Desk Quote</button>
    `;

    this.open(`Customer 360 · ${cust.company}`, bodyHtml, footerHtml);
    void this.checkOpportunities(cust);
    $("#pane-close-btn")?.addEventListener("click", () => this.close());
    $("#pane-action-quote")?.addEventListener("click", () => {
      alert(`Opening Deal Desk for ${cust.company}`);
      this.close();
    });
  }

  /** Jev checks each card's claim against the account's own install base and contracts. */
  private async checkOpportunities(cust: Customer360) {
    const result = await beaconPost<{ cards: CheckedOpportunity[] }>(
      "opportunities",
      { customerId: cust.id },
    );
    for (const card of result?.cards ?? []) {
      const el = document.querySelector(
        `[data-jev-opp="${CSS.escape(card.id)}"]`,
      );
      if (!el) continue;
      const grounded = card.verdict === "grounded";
      el.innerHTML = `<span class="jev-gate ${grounded ? "auto_approve" : "human_review"}">${
        grounded ? "Jev: evidence checks out" : "Jev: verify before working"
      }</span><span>${Math.round(card.supported * 100)}% consistent with account data${
        card.categoryMatches
          ? ""
          : ` · looks more like ${esc(card.suggestedCategory)}`
      }</span>`;
    }
  }

  public showApproval(
    item: InboxItem,
    onDecision: (decision: "approved" | "rejected") => void,
  ) {
    if (!item.approvalDetails) return;
    const d = item.approvalDetails;

    const bodyHtml = `
      <div class="approval-card">
        <div class="approval-badge-row">
          <span class="pillar-badge grow">${d.agentName}</span>
          <span class="freshness-badge fresh">${item.freshnessLabel}</span>
        </div>
        <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal);">${d.actionType}</h4>
        
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--tds-text-secondary); margin-bottom: 4px;">Rationale</div>
          <p style="font-size: 0.875rem; line-height: 1.4;">${d.rationale}</p>
        </div>

        <div class="approval-impact-alert">
          <strong>Impact:</strong> ${d.impact}
        </div>

        <div>
          <div class="diff-label">Proposed State Changes (Diff Preview)</div>
          <div class="approval-diff-box diff-preview">
            <div class="diff-before">- ${d.beforeText}</div>
            <div class="diff-after">+ ${d.afterText}</div>
          </div>
        </div>

        <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">
          <strong>Reversibility:</strong> ${d.reversibility}
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="button danger" id="pane-reject-btn">Reject with note</button>
      <button type="button" class="button secondary" id="pane-edit-btn">Edit & Approve</button>
      <button type="button" class="button primary" id="pane-approve-btn">Approve Action</button>
    `;

    this.open("Supervised Agent Approval", bodyHtml, footerHtml);

    $("#pane-approve-btn")?.addEventListener("click", () => {
      onDecision("approved");
      this.close();
    });
    $("#pane-reject-btn")?.addEventListener("click", () => {
      onDecision("rejected");
      this.close();
    });
    $("#pane-edit-btn")?.addEventListener("click", () => {
      alert("Opening parameters editor for agent payload...");
      onDecision("approved");
      this.close();
    });
  }

  public showCourse(course: Course, onEnrol?: () => void) {
    const bodyHtml = `
      <div class="context-section">
        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
          <span class="pillar-badge ${course.pillar.toLowerCase()}">${course.pillar}</span>
          <span class="tag-pill">${course.portfolio}</span>
          <span class="tag-pill">${course.format}</span>
        </div>
        <h4 style="font-size: 1.25rem; font-weight: 700; color: var(--tds-deep-teal); margin-bottom: 8px;">${course.title}</h4>
        <p style="font-size: 0.875rem; color: var(--tds-text-secondary); line-height: 1.5; margin-bottom: 16px;">${course.description}</p>
      </div>

      <div class="card" style="padding: 14px; margin-bottom: 16px;">
        <h5 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 8px;">PVI & Certification Alignment</h5>
        <div style="font-size: 0.8125rem; display: flex; flex-direction: column; gap: 6px;">
          <div><span style="color: var(--tds-text-secondary);">Dimension:</span> <strong>${course.pviDimension}</strong></div>
          <div><span style="color: var(--tds-text-secondary);">Projected PVI Impact:</span> <strong style="color: var(--tds-success);">${course.pviImpact}</strong></div>
          <div><span style="color: var(--tds-text-secondary);">Registration Model:</span> <strong>${course.registrationModel.toUpperCase()}</strong></div>
          <div><span style="color: var(--tds-text-secondary);">Duration:</span> <strong>${course.duration}</strong></div>
        </div>
      </div>

      <div class="context-section">
        <h5 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 8px;">Available Class Instances & Schedules</h5>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${course.classes
            .map(
              (cls) => `
            <div style="padding: 10px; border: 1px solid var(--tds-border); border-radius: var(--tds-radius); background: var(--tds-surface-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; font-size: 0.875rem;">${cls.date}</div>
                <div style="font-size: 0.75rem; color: var(--tds-text-secondary);">${cls.instructor} · ${cls.modality}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 700; color: var(--tds-action);">${cls.classPrice}</div>
                <div style="font-size: 0.6875rem; color: var(--tds-text-secondary);">${cls.seatsLeft} seats left</div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="button secondary" id="pane-close-btn">Close</button>
      <button type="button" class="button primary" id="pane-enrol-btn">
        ${course.isRegistered ? "Access Class Content" : `Enrol Now (${course.eventPrice})`}
      </button>
    `;

    this.open(`Course · ${course.slug}`, bodyHtml, footerHtml);
    $("#pane-close-btn")?.addEventListener("click", () => this.close());
    $("#pane-enrol-btn")?.addEventListener("click", () => {
      if (onEnrol) onEnrol();
      this.close();
    });
  }
}
