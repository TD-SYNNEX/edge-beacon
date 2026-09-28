import { icon } from "../icons.ts";
import { EDGE_JOURNEY_DATA, INITIAL_INBOX } from "../../shared/edge-data.ts";
import type { InboxItem } from "../../shared/edge-types.ts";
import type { ContextPane } from "../components/context-pane.ts";
import { beaconPost, esc } from "../beacon-client.ts";
import type { TriagedItem } from "../../server/jev/inbox.ts";

const GATE_LABEL = {
  auto_approve: "Jev: safe to auto-approve",
  confirm: "Jev: one-click confirm",
  human_review: "Jev: needs human review",
} as const;

export class HomeView {
  private inbox: InboxItem[] = [...INITIAL_INBOX];
  private selectedInboxIndex = 0;
  private triage = new Map<string, TriagedItem>();
  private triageRun = 0;

  constructor(
    private containerEl: HTMLElement,
    private contextPane: ContextPane,
    private onNavigate: (route: string) => void,
  ) {
    this.initKeyboard();
  }

  private initKeyboard() {
    window.addEventListener("keydown", (e) => {
      // Only active if home page is visible and no dialog or context pane is open
      if (this.containerEl.hidden || this.contextPane.isOpen()) return;
      if (document.querySelector("dialog[open]")) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        this.selectedInboxIndex = Math.min(
          this.selectedInboxIndex + 1,
          this.inbox.length - 1,
        );
        this.updateInboxSelection();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        this.selectedInboxIndex = Math.max(this.selectedInboxIndex - 1, 0);
        this.updateInboxSelection();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const currentItem = this.inbox[this.selectedInboxIndex];
        if (currentItem) this.inspectItem(currentItem);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        const currentItem = this.inbox[this.selectedInboxIndex];
        if (currentItem) this.snoozeItem(currentItem.id);
      }
    });
  }

  private updateInboxSelection() {
    const cards = this.containerEl.querySelectorAll<HTMLElement>(".inbox-card");
    cards.forEach((card, idx) => {
      if (idx === this.selectedInboxIndex) {
        card.classList.add("keyboard-focused");
        card.focus();
        card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        card.classList.remove("keyboard-focused");
      }
    });
  }

  /** Re-rank the inbox for the current perspective. Keeps source order if Jev is off. */
  public async refreshTriage() {
    const run = ++this.triageRun;
    const result = await beaconPost<{ items: TriagedItem[] }>("inbox", {});
    if (run !== this.triageRun) return;
    const selectedId = this.inbox[this.selectedInboxIndex]?.id;
    // Never leave another role's ranking on screen: no result means source order.
    this.triage = new Map(result?.items.map((t) => [t.id, t]) ?? []);
    const order = new Map(
      (result?.items ?? INITIAL_INBOX).map((t, i) => [t.id, i]),
    );
    this.inbox = [...this.inbox].sort(
      (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
    );
    this.selectedInboxIndex = Math.max(
      0,
      this.inbox.findIndex((i) => i.id === selectedId),
    );
    if (!this.containerEl.hidden) this.render();
  }

  public render() {
    this.containerEl.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">MY EDGE · CENTRALIZED PRACTICE HOME</div>
          <h1>Good morning. Here is what needs you.</h1>
          <p>One unified priority inbox for approvals, lifecycle renewals, PVI milestones, and your practice journey.</p>
        </div>
      </div>

      <!-- EDGE Journey Strip -->
      <section aria-label="EDGE Journey Progress" class="edge-journey-strip">
        ${EDGE_JOURNEY_DATA.map(
          (j) => `
          <div class="journey-card" data-pillar="${j.pillar}">
            <div class="journey-top">
              <span class="journey-name">${j.title}</span>
              <span class="pillar-badge ${j.pillar}">${j.progressPercent}%</span>
            </div>
            <div class="journey-stage">${j.stage}</div>
            <div class="journey-progress-bar">
              <div class="journey-progress-fill" style="width: ${j.progressPercent}%;"></div>
            </div>
            ${
              j.pviScore
                ? `
              <div class="journey-metrics">
                <span>PVI: <strong>${j.pviScore}</strong> / ${j.pviTarget}</span>
                <span>${j.pviGap}</span>
              </div>
            `
                : ""
            }
            <a href="${j.nextActionRoute}" class="journey-action-link" data-route="${j.nextActionRoute}">
              <span>${j.nextAction}</span>
              ${icon("arrow")}
            </a>
          </div>
        `,
        ).join("")}
      </section>

      <!-- Priority Inbox -->
      <section aria-label="Priority Inbox" class="inbox-container">
        <div class="inbox-header">
          <h2>
            ${icon("inbox")}
            <span>Priority Inbox</span>
            <span class="badge" style="background: var(--tds-deep-teal); color: #fff; font-size: 0.75rem;">
              ${this.inbox.filter((i) => i.status === "unread").length} unread
            </span>
          </h2>
          <div class="inbox-kbd-hint">
            Navigate with <kbd>J</kbd> / <kbd>K</kbd> · Open with <kbd>↵</kbd> · Snooze with <kbd>S</kbd>
          </div>
        </div>

        <div class="inbox-list" role="feed" aria-busy="false">
          ${this.inbox
            .map(
              (item, idx) => `
            <article class="inbox-card ${idx === this.selectedInboxIndex ? "keyboard-focused" : ""} ${item.status === "done" ? "done" : ""}" data-id="${item.id}" data-index="${idx}" tabindex="0">
              <div class="inbox-icon-wrap ${item.type}">
                ${
                  item.type === "approval"
                    ? icon("alert")
                    : item.type === "renewal"
                      ? icon("growth")
                      : item.type === "eol"
                        ? icon("alertCircle")
                        : item.type === "pvi"
                          ? icon("target")
                          : icon("graduation")
                }
              </div>
              <div class="inbox-content">
                <h3>
                  <span>${item.title}</span>
                  ${item.actionRequired ? `<span class="pillar-badge grow" style="background: var(--tds-danger-bg); color: var(--tds-danger); border-color: #fca5a5;">Requires Approval</span>` : ""}
                  <span class="freshness-badge fresh" style="font-size: 0.6875rem;">${item.freshnessLabel}</span>
                </h3>
                <div class="inbox-sub">${item.subtitle}</div>
                <p>${item.description}</p>
                ${this.triageNote(item.id)}
              </div>
              <div class="inbox-actions">
                ${
                  item.approvalDetails
                    ? `<button type="button" class="button primary review-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.8125rem;">Review</button>`
                    : `<button type="button" class="button secondary view-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.8125rem;">Inspect</button>`
                }
                <button type="button" class="icon-button snooze-btn" data-id="${item.id}" aria-label="Snooze item" title="Snooze">
                  ${icon("clock")}
                </button>
              </div>
            </article>
          `,
            )
            .join("")}
        </div>
      </section>
    `;

    this.attachEvents();
  }

  private triageNote(id: string): string {
    const t = this.triage.get(id);
    if (!t) return "";
    const gate = t.gate
      ? `<span class="jev-gate ${t.gate.route}" title="${esc(t.gate.why)}">${GATE_LABEL[t.gate.route]}</span>`
      : "";
    return `<div class="jev-note">${gate}<span>${esc(t.why)}</span></div>`;
  }

  private attachEvents() {
    this.containerEl.querySelectorAll(".journey-action-link").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const route = el.getAttribute("data-route");
        if (route) this.onNavigate(route);
      });
    });

    this.containerEl.querySelectorAll(".inbox-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".snooze-btn")) return;
        const id = card.getAttribute("data-id");
        const itm = this.inbox.find((i) => i.id === id);
        if (itm) this.inspectItem(itm);
      });
    });

    this.containerEl.querySelectorAll(".snooze-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (id) this.snoozeItem(id);
      });
    });
  }

  private inspectItem(item: InboxItem) {
    if (item.approvalDetails) {
      this.contextPane.showApproval(item, (decision) => {
        item.status = "done";
        if (item.approvalDetails) item.approvalDetails.decision = decision;
        this.render();
      });
    } else {
      const bodyHtml = `
        <div class="context-section">
          <span class="freshness-badge fresh">${item.freshnessLabel}</span>
          <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--tds-deep-teal); margin: 8px 0;">${item.title}</h4>
          <div style="font-size: 0.8125rem; color: var(--tds-action); margin-bottom: 12px;">${item.subtitle}</div>
          <p style="font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">${item.description}</p>
        </div>
        <div class="card" style="padding: 14px;">
          <h5 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 8px;">Source Data</h5>
          <div style="font-size: 0.8125rem; color: var(--tds-text-secondary);">
            Origin: <strong>${item.source}</strong><br />
            Received: <strong>${item.timestamp}</strong><br />
            Priority: <strong>${item.priority.toUpperCase()}</strong>
          </div>
        </div>
      `;
      const footerHtml = `
        <button type="button" class="button secondary" id="close-inspect-btn">Done</button>
      `;
      this.contextPane.open(item.subtitle, bodyHtml, footerHtml);
      document
        .getElementById("close-inspect-btn")
        ?.addEventListener("click", () => this.contextPane.close());
    }
  }

  private snoozeItem(id: string) {
    const itm = this.inbox.find((i) => i.id === id);
    if (itm) {
      itm.status = "snoozed";
      this.render();
    }
  }
}
