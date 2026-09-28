import { $ } from "../dom.ts";
import { icon } from "../icons.ts";
import { CATALOG, USE_CASES } from "../../shared/catalog.ts";
import {
  COURSES_DATA,
  CUSTOMERS_DATA,
  PROGRAM_QUESTIONS_DATA,
} from "../../shared/edge-data.ts";
import { beacon, beaconPost, esc } from "../beacon-client.ts";
import type {
  BeaconSearch,
  BeaconHit,
  BeaconIntent,
} from "../../server/jev/search.ts";

type PaletteItem = {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
};

const JEV_GROUP = "Beacon · ranked by Jev";

export interface AtlasBarCallbacks {
  onNavigate: (route: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectCourse: (courseId: string) => void;
  onOpenDiscoveryBrief: () => void;
  onOpenTerminal?: () => void;
}

export class AtlasBar {
  private dialogEl: HTMLDialogElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLElement | null = null;
  private activeTab = "all"; // 'all' | 'search' | 'jump' | 'actions' | 'ask'
  private selectedIndex = 0;
  private items: PaletteItem[] = [];
  private jevTimer: ReturnType<typeof setTimeout> | undefined;
  private jevAbort: AbortController | undefined;
  private jevRun = 0;

  constructor(private callbacks: AtlasBarCallbacks) {
    this.dialogEl = $("#atlas-dialog") as HTMLDialogElement | null;
    this.inputEl = $("#atlas-palette-input") as HTMLInputElement | null;
    this.resultsEl = $("#atlas-results-list");

    this.initEvents();
  }

  private initEvents() {
    // Global shortcut: Cmd+K / Ctrl+K
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.open();
      }
    });

    $("#atlas-search-trigger")?.addEventListener("click", () => this.open());
    $("#atlas-palette-close")?.addEventListener("click", () => this.close());

    this.dialogEl?.addEventListener("click", (e) => {
      if (e.target === this.dialogEl) this.close();
    });

    this.inputEl?.addEventListener("input", () => this.renderResults());
    this.inputEl?.addEventListener("keydown", (e) => this.handleKeydown(e));

    // Tab buttons
    document.querySelectorAll(".atlas-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        document
          .querySelectorAll(".atlas-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        target.classList.add("active");
        this.activeTab = target.dataset.tab || "all";
        this.renderResults();
      });
    });
  }

  public open(initialQuery = "") {
    if (!this.dialogEl) return;
    this.dialogEl.showModal();
    if (this.inputEl) {
      this.inputEl.value = initialQuery;
      this.inputEl.focus();
    }
    this.renderResults();
  }

  public close() {
    this.cancelJev();
    this.dialogEl?.close();
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.items.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.updateSelectionVisuals();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.items.length > 0) {
        this.selectedIndex =
          (this.selectedIndex - 1 + this.items.length) % this.items.length;
        this.updateSelectionVisuals();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = this.items[this.selectedIndex];
      if (item) {
        item.action();
        this.close();
      }
    } else if (e.key === "Escape") {
      this.close();
    }
  }

  private updateSelectionVisuals() {
    const elList = this.resultsEl?.querySelectorAll(".atlas-result-item");
    elList?.forEach((el, idx) => {
      if (idx === this.selectedIndex) {
        el.classList.add("selected");
        el.scrollIntoView({ block: "nearest" });
      } else {
        el.classList.remove("selected");
      }
    });
  }

  private renderResults() {
    if (!this.resultsEl) return;
    const query = (this.inputEl?.value || "").trim().toLowerCase();
    this.items = [];

    if (
      this.activeTab === "ask" ||
      query.startsWith("?") ||
      query.startsWith("how") ||
      query.startsWith("what")
    ) {
      this.renderAskAtlas(query);
      return;
    }

    // 1. Jump To Navigation Items
    if (this.activeTab === "all" || this.activeTab === "jump") {
      const jumps = [
        {
          id: "jump-home",
          group: "Jump to",
          title: "Home — My EDGE Beacon",
          subtitle: "Priority Inbox & Journey Strip",
          icon: "home",
          action: () => this.callbacks.onNavigate("#home"),
        },
        {
          id: "jump-engage",
          group: "Jump to",
          title: "Engage",
          subtitle: "Onboarding Checklists & Cisco 360",
          icon: "compass",
          action: () => this.callbacks.onNavigate("#engage"),
        },
        {
          id: "jump-develop",
          group: "Jump to",
          title: "Develop",
          subtitle: "Course Catalog & CML Virtual Labs",
          icon: "graduation",
          action: () => this.callbacks.onNavigate("#develop"),
        },
        {
          id: "jump-grow",
          group: "Jump to",
          title: "Grow",
          subtitle: "Customer 360 & Solution Catalog",
          icon: "growth",
          action: () => this.callbacks.onNavigate("#grow"),
        },
        {
          id: "jump-extend",
          group: "Jump to",
          title: "Extend",
          subtitle: "Webex Communities & AI/MCP",
          icon: "share",
          action: () => this.callbacks.onNavigate("#extend"),
        },
        {
          id: "jump-admin",
          group: "Jump to",
          title: "Admin Control Tower",
          subtitle: "Agent Autonomy & App Register",
          icon: "sliders",
          action: () => this.callbacks.onNavigate("#admin"),
        },
      ];
      for (const j of jumps) {
        if (
          !query ||
          j.title.toLowerCase().includes(query) ||
          j.subtitle.toLowerCase().includes(query)
        ) {
          this.items.push(j);
        }
      }
    }

    // 2. Actions
    if (this.activeTab === "all" || this.activeTab === "actions") {
      const actions = [
        {
          id: "act-term",
          group: "Actions",
          title: "Launch NetDojo Terminal Console",
          subtitle: "Open interactive multi-device CLI & PyATS study guide",
          icon: "terminal",
          action: () => {
            if (this.callbacks.onOpenTerminal) this.callbacks.onOpenTerminal();
            else this.callbacks.onNavigate("#develop?tab=labs");
          },
        },
        {
          id: "act-brief",
          group: "Actions",
          title: "Build Discovery Brief",
          subtitle: "Generate AI-assisted customer brief",
          icon: "file",
          action: () => this.callbacks.onOpenDiscoveryBrief(),
        },
        {
          id: "act-lab",
          group: "Actions",
          title: "Book CML Virtual Lab",
          subtitle: "Reserve an on-demand Cisco Modeling Labs session",
          icon: "server",
          action: () => this.callbacks.onNavigate("#develop?tab=labs"),
        },
        {
          id: "act-quote",
          group: "Actions",
          title: "Launch Deal Desk Pre-flight",
          subtitle: "Validate BOM against Cisco B2B GraphQL rules",
          icon: "checkCircle",
          action: () => this.callbacks.onNavigate("#grow?tab=customers"),
        },
      ];
      for (const a of actions) {
        if (!query || a.title.toLowerCase().includes(query)) {
          this.items.push(a);
        }
      }
    }

    // 3. Customers
    if (this.activeTab === "all" || this.activeTab === "search") {
      for (const cust of CUSTOMERS_DATA) {
        if (
          !query ||
          cust.company.toLowerCase().includes(query) ||
          cust.guName.toLowerCase().includes(query) ||
          cust.tags.some((t) => t.toLowerCase().includes(query))
        ) {
          this.items.push({
            id: `cust-${cust.id}`,
            group: "Customers (Customer 360)",
            title: cust.company,
            subtitle: `${cust.guName} · Health: ${cust.healthBand} (${cust.healthScore}/10)`,
            icon: "building",
            action: () => this.callbacks.onSelectCustomer(cust.id),
          });
        }
      }
    }

    // 4. Courses
    if (this.activeTab === "all" || this.activeTab === "search") {
      for (const course of COURSES_DATA) {
        if (
          !query ||
          course.title.toLowerCase().includes(query) ||
          course.portfolio.toLowerCase().includes(query) ||
          course.pviDimension.toLowerCase().includes(query)
        ) {
          this.items.push({
            id: `course-${course.id}`,
            group: "Courses & Learning (Develop)",
            title: course.title,
            subtitle: `${course.portfolio} · ${course.format} · ${course.pviImpact}`,
            icon: "book",
            action: () => this.callbacks.onSelectCourse(course.id),
          });
        }
      }
    }

    // 5. Solution Catalog & Use Cases
    if (this.activeTab === "all" || this.activeTab === "search") {
      for (const s of CATALOG) {
        if (
          !query ||
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query) ||
          s.outcome.toLowerCase().includes(query)
        ) {
          this.items.push({
            id: `sol-${s.id}`,
            group: "Cisco Solutions (Discover)",
            title: s.name,
            subtitle: `${s.category} · ${s.outcome}`,
            icon: "sparkles",
            action: () =>
              this.callbacks.onNavigate(`#grow?tab=discover&detail=${s.id}`),
          });
        }
      }
    }

    this.paint(query);
    this.scheduleJev(query);
  }

  /** Debounced: lexical results show instantly, Jev's ranking replaces them when it lands. */
  /** Any newer input, Ask mode or close makes an in-flight Jev search stale. */
  private cancelJev(): number {
    clearTimeout(this.jevTimer);
    this.jevAbort?.abort();
    this.jevAbort = undefined;
    return ++this.jevRun;
  }

  private scheduleJev(query: string) {
    const run = this.cancelJev();
    if (!beacon.ready || query.length < 3) return;
    this.jevTimer = setTimeout(async () => {
      const controller = (this.jevAbort = new AbortController());
      const result = await beaconPost<BeaconSearch>(
        "search",
        { query },
        controller.signal,
      ).catch(() => null);
      if (run !== this.jevRun || !result) return;
      const selectedId = this.items[this.selectedIndex]?.id;
      const jevItems = this.jevItems(result);
      const seen = new Set(jevItems.map((i) => i.id));
      this.items = [...jevItems, ...this.items.filter((i) => !seen.has(i.id))];
      this.paint(query, selectedId);
    }, 250);
  }

  private jevItems(result: BeaconSearch): PaletteItem[] {
    const intent = INTENT_ACTIONS[result.intent];
    const lead: PaletteItem[] = intent
      ? [
          {
            id: `intent-${result.intent}`,
            group: JEV_GROUP,
            icon: "sparkles",
            ...intent(this.callbacks, this, result),
          },
        ]
      : [];
    return [...lead, ...result.results.map((hit) => this.hitItem(hit))];
  }

  private hitItem(hit: BeaconHit): PaletteItem {
    const cb = this.callbacks;
    const base = {
      id: `${KIND_PREFIX[hit.kind]}-${hit.id}`,
      group: JEV_GROUP,
      title: hit.title,
      subtitle: hit.subtitle,
    };
    switch (hit.kind) {
      case "customer":
        return {
          ...base,
          icon: "building",
          action: () => cb.onSelectCustomer(hit.id),
        };
      case "course":
        return {
          ...base,
          icon: "book",
          action: () => cb.onSelectCourse(hit.id),
        };
      case "lab":
        return {
          ...base,
          icon: "server",
          action: () => cb.onNavigate("#develop?tab=labs"),
        };
      case "solution":
        return {
          ...base,
          icon: "sparkles",
          action: () => cb.onNavigate(`#grow?tab=discover&detail=${hit.id}`),
        };
      case "use_case":
        return {
          ...base,
          icon: "compass",
          action: () => cb.onNavigate("#use-cases"),
        };
      case "answer":
        return { ...base, icon: "book", action: () => this.showAnswer(hit.id) };
    }
  }

  /** Keeps the palette open on the cited answer instead of navigating away. */
  public showAnswer(id: string) {
    const q = PROGRAM_QUESTIONS_DATA.find((p) => p.id === id);
    if (!q || !this.inputEl) return;
    queueMicrotask(() => {
      this.dialogEl?.showModal();
      this.inputEl!.value = "?" + q.question;
      this.renderAskAtlas(q.question.toLowerCase());
    });
  }

  private paint(query: string, keepId?: string) {
    if (!this.resultsEl) return;
    // Render grouped items
    if (this.items.length === 0) {
      this.resultsEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--tds-text-secondary); font-size: 0.875rem;">
          No matching records found for "<strong>${esc(query)}</strong>". Try switching tabs or asking a question.
        </div>
      `;
      return;
    }

    // Keep the user's highlighted item when Jev results arrive late.
    this.selectedIndex = Math.max(
      0,
      this.items.findIndex((i) => i.id === keepId),
    );
    let currentGroup = "";
    let html = "";

    this.items.forEach((item, index) => {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        html += `<div class="atlas-group-title">${esc(currentGroup)}</div>`;
      }
      html += `
        <div class="atlas-result-item ${index === 0 ? "selected" : ""}" data-index="${index}">
          <div class="atlas-result-main">
            <span style="color: var(--tds-action);">${icon(item.icon)}</span>
            <div>
              <div class="atlas-result-title">${esc(item.title)}</div>
              <div class="atlas-result-sub">${esc(item.subtitle)}</div>
            </div>
          </div>
          <span style="color: var(--tds-text-secondary);">${icon("chevron")}</span>
        </div>
      `;
    });

    this.resultsEl.innerHTML = html;

    // Attach click handlers
    this.resultsEl.querySelectorAll(".atlas-result-item").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-index"));
        const itm = this.items[idx];
        if (itm) {
          itm.action();
          this.close();
        }
      });
    });
  }

  private renderAskAtlas(query: string) {
    this.cancelJev();
    if (!this.resultsEl) return;
    const cleanQuery = query.replace(/^[?]/, "").trim().toLowerCase();

    // Match against program questions
    const matched = PROGRAM_QUESTIONS_DATA.filter(
      (pq) =>
        !cleanQuery ||
        pq.question.toLowerCase().includes(cleanQuery) ||
        pq.category.toLowerCase().includes(cleanQuery) ||
        pq.answer.toLowerCase().includes(cleanQuery),
    );

    if (matched.length === 0) {
      this.resultsEl.innerHTML = `
        <div style="padding: 20px;">
          <div class="atlas-group-title">Ask Beacon · Cisco 360 Program Assistant</div>
          <p style="font-size: 0.875rem; color: var(--tds-text-secondary); margin-bottom: 12px;">
            No direct passage match for "<strong>${esc(cleanQuery)}</strong>". Type a full question and Beacon ranks every course, lab, solution and answer.
          </p>
          <div style="font-size: 0.8125rem; font-weight: 600; margin-bottom: 8px;">Try common Cisco 360 questions:</div>
          <ul style="padding-left: 20px; font-size: 0.8125rem; color: var(--tds-action); line-height: 1.6;">
            ${PROGRAM_QUESTIONS_DATA.map((pq) => `<li style="cursor: pointer;" class="ask-preset-link" data-id="${pq.id}">${pq.question}</li>`).join("")}
          </ul>
        </div>
      `;
      this.resultsEl.querySelectorAll(".ask-preset-link").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          const q = PROGRAM_QUESTIONS_DATA.find((p) => p.id === id);
          if (q && this.inputEl) {
            this.inputEl.value = q.question;
            this.renderAskAtlas(q.question);
          }
        });
      });
      return;
    }

    let html = `<div class="atlas-group-title">Ask Beacon · Verified Citations (${matched.length} answers)</div>`;
    matched.forEach((pq) => {
      html += `
        <div class="card atlas-qa-card" style="margin: 12px 16px; padding: 14px; border: 1px solid var(--tds-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <strong style="font-size: 0.9375rem; color: var(--tds-deep-teal);">${pq.question}</strong>
            <span class="freshness-badge fresh">${pq.freshness}</span>
          </div>
          <p class="atlas-qa-answer" style="font-size: 0.875rem; line-height: 1.5; color: var(--tds-text); margin-bottom: 10px;">
            ${pq.answer}
          </p>
          <div class="atlas-qa-citations" style="font-size: 0.75rem; color: var(--tds-text-secondary);">
            <strong>Passage Citations:</strong>
            ${pq.citations.map((c) => `<span class="citation-pill" title="${c.source}: '${c.passage}'">${c.pillText}</span>`).join(" ")}
          </div>
        </div>
      `;
    });

    this.resultsEl.innerHTML = html;
  }
}

const KIND_PREFIX = {
  customer: "cust",
  course: "course",
  lab: "lab",
  solution: "sol",
  use_case: "uc",
  answer: "faq",
} as const;

type IntentAction = (
  cb: AtlasBarCallbacks,
  bar: AtlasBar,
  result: BeaconSearch,
) => Pick<PaletteItem, "title" | "subtitle" | "action">;

/** What Jev thinks the user wants to do, as a one-keystroke shortcut. */
const INTENT_ACTIONS: Partial<Record<BeaconIntent, IntentAction>> = {
  open_customer: (cb) => ({
    title: "Open Customer 360",
    subtitle: "Accounts, install base, renewals and opportunity cards",
    action: () => cb.onNavigate("#grow"),
  }),
  find_learning: (cb) => ({
    title: "Browse courses & add-ons",
    subtitle: "Every course, cohort and learning path in one catalog",
    action: () => cb.onNavigate("#develop"),
  }),
  practice_lab: (cb) => ({
    title: "Launch a virtual lab",
    subtitle: "CML labs and the NetDojo terminal",
    action: () =>
      cb.onOpenTerminal
        ? cb.onOpenTerminal()
        : cb.onNavigate("#develop?tab=labs"),
  }),
  match_solution: (cb) => ({
    title: "Match a solution to this need",
    subtitle: "Jev ranks the catalog and 375 use cases",
    action: () => cb.onNavigate("#discover"),
  }),
  program_question: (_cb, bar, result) => {
    const top = result.results.find((r) => r.kind === "answer");
    return {
      title: top ? `Answer: ${top.title}` : "Ask the program assistant",
      subtitle: "Cited answers on PVI, EA and API policy",
      action: () =>
        top ? bar.showAnswer(top.id) : queueMicrotask(() => bar.open("?")),
    };
  },
  review_approvals: (cb) => ({
    title: "Review what needs you today",
    subtitle: "Priority inbox ranked for your role",
    action: () => cb.onNavigate("#home"),
  }),
};
