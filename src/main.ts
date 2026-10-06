import {
  CATALOG,
  CATEGORIES,
  INDUSTRIES,
  PRIORITIES,
  EXAMPLES,
  TRACKS,
  LITERACY,
  USE_CASES,
  PRODUCT_LINES,
  VERTICALS,
} from "../shared/catalog.ts";
import { matchSolutions, createBrief } from "../shared/matcher.ts";

import { $, $$, field, dialog } from "./dom.ts";
import { icon } from "./icons.ts";
import { isRecord, errorMessage } from "../shared/types.ts";
import type {
  DiscoveryInput,
  DiscoveryResult,
  Solution,
  UseCase,
  CatalogMatch,
  Role,
  LearningRole,
} from "../shared/types.ts";
import "./styles/tokens.css";
import "./styles/workspace.css";
import "./styles/accessibility.css";

import { ContextPane } from "./components/context-pane.ts";
import { AtlasBar } from "./components/atlas-bar.ts";
import { beacon, beaconPost } from "./beacon-client.ts";
import { ensureSignedIn, getAuthHeader, getGroups, signOut } from "./auth.ts";
import { hideLanding, showLanding } from "./landing.ts";
import type { WorkspacePerspective } from "../shared/edge-types.ts";
import { HomeView } from "./views/home-view.ts";
import { EngageView } from "./views/engage-view.ts";
import { DevelopView } from "./views/develop-view.ts";
import { GrowView } from "./views/grow-view.ts";
import { ExtendView } from "./views/extend-view.ts";
import { AdminView } from "./views/admin-view.ts";
import { CUSTOMERS_DATA, COURSES_DATA } from "../shared/edge-data.ts";

// Gate the whole workspace behind Cognito before anything else runs. On an
// unauthenticated visit this redirects to Hosted UI and never resolves.
await ensureSignedIn();

/**
 * The signed-in user's real Cognito groups — the only perspectives they may
 * ever act as. Falls back to "partner" if an account somehow has none, so
 * the UI never crashes; the server enforces the real boundary regardless.
 */
const PERSPECTIVE_PRECEDENCE: WorkspacePerspective[] = [
  "admin",
  "practice_leader",
  "sales",
  "partner",
];
const allowedPerspectives: WorkspacePerspective[] = getGroups().length
  ? getGroups()
  : ["partner"];
const initialPerspective =
  PERSPECTIVE_PRECEDENCE.find((p) => allowedPerspectives.includes(p)) ??
  "partner";

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => entities[char]);
const fillIcons = (root: ParentNode = document) =>
  $$("[data-icon]", root).forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
let stored: Record<string, unknown> = {};
try {
  stored = JSON.parse(localStorage.getItem("tds-accelerator-v1") || "{}") || {};
} catch {
  stored = {};
}
if (!isRecord(stored)) stored = {};
interface WorkspaceState {
  role: Role;
  selected: string[];
  draft: Record<string, unknown>;
  notes: string;
  result: DiscoveryResult | null;
  ai: boolean;
  category: string;
  learning: LearningRole;
  costView: string;
  detail: string | null;
  useCasePage: number;
}
const state: WorkspaceState = {
  role: stored.role === "sales" ? "sales" : "partner",
  selected: Array.isArray(stored.selected)
    ? [...new Set(stored.selected)]
        .filter(
          (id): id is string =>
            typeof id === "string" && CATALOG.some((s) => s.id === id),
        )
        .slice(0, 3)
    : [],
  draft: isRecord(stored.draft) ? stored.draft : {},
  notes: typeof stored.notes === "string" ? stored.notes.slice(0, 5000) : "",
  result: null,
  ai: false,
  category: "All solutions",
  learning: "sales",
  costView: "Cloud",
  detail: null,
  useCasePage: 0,
};
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let activeController: AbortController | undefined;
let runId = 0;
let lastDialogTrigger: HTMLElement | null = null;
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, 4200);
}
function save() {
  try {
    localStorage.setItem(
      "tds-accelerator-v1",
      JSON.stringify({
        role: state.role,
        selected: state.selected,
        draft: getInput(),
        notes: state.notes,
      }),
    );
  } catch {
    /* Session remains usable when device storage is unavailable. */
  }
}
function getInput(): DiscoveryInput {
  return {
    role: state.role,
    need: field("#need").value,
    industry: field("#industry").value,
    priority: field("#priority").value,
    deployment: field("#deployment").value,
    readiness: field("#readiness").value,
    account: field("#account").value,
    timing: field("#timing").value,
  };
}
function inputWithNotes() {
  const input = getInput();
  return {
    ...input,
    need: (
      input.need +
      (state.notes.trim()
        ? "\nAdditional discovery notes: " + state.notes.trim()
        : "")
    ).slice(0, 5000),
  };
}
function resetLoading() {
  $<HTMLButtonElement>("#match-button").disabled = false;
  $<HTMLButtonElement>("#match-button").innerHTML =
    (state.ai ? "Find with AI " : "Find my solutions ") + icon("arrow");
  $("#discovery-results").setAttribute("aria-busy", "false");
}
function invalidate() {
  runId++;
  activeController?.abort();
  state.result = null;
  $("#discovery-results").innerHTML = "";
  $("#starter-solutions").hidden = false;
  resetLoading();
  $("#form-error").hidden = true;
}

function solutionCard(solution: Solution, match?: CatalogMatch) {
  const saved = state.selected.includes(solution.id);
  return `<article class="solution-card"><div class="solution-card-body"><div class="solution-card-top"><span class="solution-icon">${icon(solution.icon)}</span><button class="icon-button bookmark-button" data-save="${solution.id}" aria-label="${saved ? "Remove" : "Save"} ${esc(solution.name)}${saved ? " from" : " to"} shortlist" aria-pressed="${saved}">${icon("bookmark")}</button></div><div class="solution-category">${esc(solution.category)}</div><h3>${esc(solution.name)}</h3><p>${esc(solution.summary)}</p><div class="product-tags">${solution.products.map((p) => `<span>${esc(p)}</span>`).join("")}</div></div>${match ? `<div class="match-reason"><b>WHY IT FITS</b>${esc(match.reason)}</div>` : ""}<div class="solution-card-footer"><button class="text-button" data-detail="${solution.id}">Explore solution ${icon("arrow")}</button><span class="white-label">${solution.whiteLabel ? "Partner branding" : "Reference architecture"}</span></div></article>`;
}

function renderStarter() {
  $("#starter-cards").innerHTML = ["meraki", "knowledge", "netdojo"]
    .flatMap((id) => {
      const solution = CATALOG.find((s) => s.id === id);
      return solution ? [solutionCard(solution)] : [];
    })
    .join("");
}
function renderLibrary() {
  const search = field("#solution-search").value.toLowerCase().trim();
  const deployment = field("#library-deployment").value;
  const solutions = CATALOG.filter(
    (s) =>
      (state.category === "All solutions" || s.category === state.category) &&
      (deployment === "All environments" ||
        s.deployments.includes(deployment)) &&
      (!search ||
        [s.name, s.summary, s.outcome, ...s.products, ...s.keywords]
          .join(" ")
          .toLowerCase()
          .includes(search)),
  );
  $("#library-cards").innerHTML = solutions
    .map((s) => solutionCard(s))
    .join("");
  $("#library-count").textContent =
    `${solutions.length} solution${solutions.length === 1 ? "" : "s"}`;
  $("#library-empty").hidden = solutions.length > 0;
  $$("#category-filters button").forEach((b) =>
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.category === state.category),
    ),
  );
}

function useCaseCard(useCase: UseCase) {
  return `<article class="use-case-card"><div class="use-case-top"><span class="solution-icon">${icon(useCase.icon)}</span><span class="use-case-index">${useCase.productLine}</span></div><div class="use-case-label">${esc(useCase.vertical)} · ${esc(useCase.deliverable)}</div><h3>${esc(useCase.title)}</h3><p>${esc(useCase.problem)}</p><div class="use-case-outcome"><b>DELIVERABLE</b><span>${esc(useCase.automation)}</span></div><div class="solution-card-footer"><button class="text-button" data-use-case-detail="${useCase.id}">Open use case ${icon("arrow")}</button><span class="white-label">${esc(useCase.systems.split(",")[0])}</span></div></article>`;
}

function renderUseCases() {
  const search = field("#use-case-search").value.toLowerCase().trim();
  const productLine = field("#use-case-product").value;
  const vertical = field("#use-case-vertical").value;
  const matches = USE_CASES.filter(
    (useCase) =>
      (productLine === "All product lines" ||
        useCase.productLine === productLine) &&
      (vertical === "All verticals" || useCase.vertical === vertical) &&
      (!search ||
        [
          useCase.title,
          useCase.productLine,
          useCase.vertical,
          useCase.deliverable,
          useCase.problem,
          useCase.automation,
          useCase.outcome,
          useCase.systems,
          ...useCase.keywords,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)),
  );
  const pageSize = 12;
  state.useCasePage = Math.min(
    state.useCasePage,
    Math.max(0, Math.ceil(matches.length / pageSize) - 1),
  );
  const start = state.useCasePage * pageSize;
  $("#use-case-grid").innerHTML = matches
    .slice(start, start + pageSize)
    .map(useCaseCard)
    .join("");
  $("#use-case-pagination").hidden = matches.length <= pageSize;
  $("#use-case-pagination").innerHTML =
    `<span aria-live="polite">${start + 1}–${Math.min(start + pageSize, matches.length)} of ${matches.length} use cases</span><div><button class="button secondary" data-action="previous-use-cases" ${start === 0 ? "disabled" : ""}>Previous</button><button class="button secondary" data-action="next-use-cases" ${start + pageSize >= matches.length ? "disabled" : ""}>Next ${icon("arrow")}</button></div>`;
  $("#use-case-count").textContent =
    `${matches.length} use case${matches.length === 1 ? "" : "s"}`;
  $("#use-case-empty").hidden = matches.length > 0;
}

function openUseCase(id: string) {
  const useCase = USE_CASES.find((item) => item.id === id);
  if (!useCase) return;
  $("#detail-content").innerHTML =
    `<div class="detail-hero"><div class="dialog-top"><span class="solution-icon">${icon(useCase.icon)}</span><button class="icon-button" data-action="close-dialog" aria-label="Close use case details">${icon("close")}</button></div><div class="solution-category" style="margin-top:20px">${esc(useCase.productLine)} · ${esc(useCase.vertical)}</div><h2 id="detail-title">${esc(useCase.deliverable)}</h2><p>${esc(useCase.problem)}</p><div class="product-tags"><span>${esc(useCase.vertical)}</span><span>${esc(useCase.productLine)}</span></div></div><div class="detail-body"><div class="detail-section"><h3>Turnkey deliverable</h3><p>${esc(useCase.automation)}</p></div><div class="detail-section"><h3>What the customer gets</h3><p>${esc(useCase.outcome)}</p></div><div class="detail-facts"><div><span>Product line</span><strong>${esc(useCase.productLine)}</strong></div><div><span>Vertical</span><strong>${esc(useCase.vertical)}</strong></div><div><span>Systems to explore</span><strong>${esc(useCase.systems)}</strong></div><div><span>Catalog status</span><strong>General use-case starting point</strong></div></div><div class="detail-section"><h3>Discovery questions</h3><ol>${useCase.discovery.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div></div><div class="detail-actions"><button class="button secondary" data-action="use-case-shortlist" data-use-case-id="${useCase.id}">${icon("bookmark")} Add to discovery notes</button><button class="button primary" data-action="use-case-brief" data-use-case-id="${useCase.id}">Use in a discovery brief ${icon("arrow")}</button></div>`;
  openDialog("#detail-dialog");
}

function renderResults() {
  const result = state.result;
  if (!result) return;
  $("#starter-solutions").hidden = true;
  const useCases = (result.useCaseMatches || [])
    .map((match) => {
      const item = USE_CASES.find((s) => s.id === match.id);
      return item
        ? `<li><button class="text-button" data-use-case-detail="${item.id}">${esc(item.deliverable)} · ${esc(item.vertical)} ${icon("arrow")}</button><span>${esc(match.reason)}</span></li>`
        : "";
    })
    .join("");
  $("#discovery-results").innerHTML =
    `<div class="result-overview"><div><span class="step-label">${result.mode === "jev" ? "JEV-RANKED DISCOVERY" : result.mode === "ai" ? "AI-ASSISTED DISCOVERY" : "GUIDED CATALOG MATCHING"}</span><h2>${result.matches.length ? "A practical starting point for your conversation." : "Let’s make the need more specific."}</h2><p>${esc(result.summary)}</p></div>${result.matches.length ? `<button class="button secondary" data-action="result-brief">Create discovery brief ${icon("file")}</button>` : ""}</div>${
      result.matches.length
        ? `<div class="section-heading"><div><span class="step-label">02 / UNDERSTAND THE FIT</span><h2>${result.matches.length} turnkey solutions to explore.</h2></div><span class="match-chip">Suggested practice path: ${esc(result.tier)}</span></div><div class="solution-grid">${result.matches
            .map((match) => {
              const solution = CATALOG.find((s) => s.id === match.id);
              return solution ? solutionCard(solution, match) : "";
            })
            .join("")}</div>`
        : ""
    }${useCases ? `<div class="use-case-match-panel"><div><span class="step-label">USE-CASE ANGLES</span><h2>Customer problems worth exploring.</h2></div><ul>${useCases}</ul></div>` : ""}<div class="next-step-grid"><div class="question-panel"><h3>Ask these questions next.</h3><ol>${result.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol><label for="discovery-notes">Add what you learn</label><textarea id="discovery-notes" maxlength="3000" placeholder="Add system details, scope, or answers to refine the fit…">${esc(state.notes)}</textarea><button class="button secondary small" data-action="refine">Refine recommendations ${icon("arrow")}</button></div><div class="question-panel"><h3>${state.role === "sales" ? "Move the opportunity forward." : "Your next three steps."}</h3><ol>${result.nextSteps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><div class="result-assumptions">${result.assumptions.map((s) => `<p>${esc(s)}</p>`).join("")}</div></div></div>`;
}

async function runMatching() {
  const input = inputWithNotes();
  if (input.need.trim().length < 20) {
    $("#form-error").textContent =
      "Add a little more detail: describe the task, systems, or result you want (at least 20 characters).";
    $("#form-error").hidden = false;
    field("#need").focus();
    return;
  }
  const currentRun = ++runId;
  activeController?.abort();
  activeController = new AbortController();
  $<HTMLButtonElement>("#match-button").disabled = true;
  $<HTMLButtonElement>("#match-button").textContent = state.ai
    ? "Understanding the need…"
    : "Finding relevant solutions…";
  $("#discovery-results").setAttribute("aria-busy", "true");
  $("#form-error").hidden = true;
  try {
    // Jev ranks against the catalog first; OpenAI, then keyword matching, are fallbacks.
    let result: DiscoveryResult | null = await beaconPost<DiscoveryResult>(
      "match",
      { ...input },
      activeController.signal,
    );
    if (!result && state.ai) {
      const authHeader = getAuthHeader();
      if (!authHeader) return signOut();
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(input),
        signal: activeController.signal,
      });
      if (response.status === 401) return signOut();
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.message ||
            "AI analysis is unavailable. Try again or use guided matching.",
        );
      result = body;
    } else if (!result) result = matchSolutions(input);
    if (currentRun !== runId) return;
    state.result = result;
    save();
    renderResults();
    $("#discovery-results").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  } catch (error) {
    if (
      currentRun !== runId ||
      (error instanceof Error ? error.name : "") === "AbortError"
    )
      return;
    $("#form-error").textContent = errorMessage(error);
    $("#form-error").hidden = false;
    const fallback = document.createElement("button");
    fallback.type = "button";
    fallback.className = "text-button";
    fallback.dataset.action = "guided-fallback";
    fallback.textContent = "Use guided matching for this need";
    $("#form-error").append(document.createElement("br"), fallback);
  } finally {
    if (currentRun === runId) resetLoading();
  }
}

function renderShortlist() {
  $("#shortlist-count").textContent = String(state.selected.length);
  const solutions = state.selected.flatMap((id) => {
    const solution = CATALOG.find((s) => s.id === id);
    return solution ? [solution] : [];
  });
  if (!solutions.length) {
    $("#shortlist-content").innerHTML =
      `<div class="empty-state">${icon("bookmark")}<h2>Keep the options worth a conversation.</h2><p>Save solutions from the library or discovery results to compare them here.</p><a class="button primary" href="#library">Explore the solution library ${icon("arrow")}</a></div>`;
    return;
  }
  const row = (label: string, render: (solution: Solution) => string) =>
    `<tr><th scope="row">${label}</th>${solutions.map((s) => `<td>${render(s)}</td>`).join("")}</tr>`;
  $("#shortlist-content").innerHTML =
    `<div class="shortlist-header"><p>${solutions.length} of 3 solution slots used</p><div class="shortlist-actions"><div class="segmented" role="group" aria-label="Compare cost environment"><button data-compare-cost="Cloud" aria-pressed="${state.costView === "Cloud"}">Cloud</button><button data-compare-cost="On-premises" aria-pressed="${state.costView === "On-premises"}">On-premises</button></div><button class="text-button" data-action="clear-shortlist">Clear shortlist</button></div></div><div class="compare-wrap" tabindex="0" aria-label="Solution comparison table; scroll horizontally if needed"><table class="compare-table"><caption class="sr-only">Compare shortlisted solutions</caption><tbody>${row("Solution", (s) => `<span class="solution-icon">${icon(s.icon)}</span><h3>${esc(s.name)}</h3><button class="text-button" data-save="${s.id}">Remove ${icon("close")}</button>`)}${row("Customer outcome", (s) => esc(s.outcome))}${row("Potential automation", (s) => `<ul>${s.automations.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`)}${row("Prerequisites", (s) => `<ul>${s.requirements.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`)}${row("Deployment options", (s) => s.deployments.map(esc).join(" · "))}${row(state.costView === "Cloud" ? "Pilot estimate / month" : "Setup estimate", (s) => esc(state.costView === "Cloud" ? s.pilot : s.onprem))}${row(state.costView === "Cloud" ? "Production estimate / month" : "Running estimate", (s) => esc(state.costView === "Cloud" ? s.production : s.onpremRun))}${row("Partner branding", (s) => (s.whiteLabel ? "Planned white-label option" : "Reference architecture"))}${state.role === "sales" ? row("Start the conversation", (s) => esc(s.sales)) : row("Learning path", (s) => esc(s.track))}</tbody></table></div><p class="cost-caption">Planning estimates from the supplied program brief, not a quote. Infrastructure scope varies by kit. Cisco licenses, partner labor, service fees, and model or telephony usage require separate confirmation. NetDojo and SalesDojo estimates overlap; do not add them together.</p><div class="brief-panel"><div><span class="step-label">03 / MOVE FORWARD</span><h2>Turn your shortlist into a useful handoff.</h2><p>Customer need, selected solutions, open questions, and proposed next steps.</p></div><button class="button primary" data-action="start-brief">Build discovery brief ${icon("arrow")}</button></div>`;
}

function refreshSaved() {
  renderStarter();
  renderLibrary();
  renderResults();
  renderShortlist();
  if (state.detail && dialog("#detail-dialog").open) updateDetailSave();
}
function toggleSave(id: string) {
  const solution = CATALOG.find((s) => s.id === id);
  if (!solution) return;
  if (state.selected.includes(id)) {
    state.selected = state.selected.filter((x) => x !== id);
    toast("Removed from your shortlist.");
  } else {
    if (state.selected.length >= 3) {
      toast("Your shortlist has three solutions. Remove one to make room.");
      return;
    }
    state.selected.push(id);
    toast("Saved to your shortlist in this browser.");
  }
  save();
  refreshSaved();
}

function openDialog(id: string) {
  lastDialogTrigger =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const modal = dialog(id);
  if (!modal.open) modal.showModal();
  document.body.style.overflow = "hidden";
}
function closeDialogs() {
  $$<HTMLDialogElement>("dialog[open]").forEach((d) => d.close());
}
function updateDetailSave() {
  const button = document.querySelector<HTMLElement>("[data-detail-save]");
  if (!button) return;
  const saved = state.detail !== null && state.selected.includes(state.detail);
  button.setAttribute("aria-pressed", String(saved));
  button.innerHTML =
    icon(saved ? "check" : "bookmark") +
    (saved ? " Saved to shortlist" : " Save to shortlist");
}
function openDetail(id: string) {
  const s = CATALOG.find((s) => s.id === id);
  if (!s) return;
  state.detail = id;
  $("#detail-content").innerHTML =
    `<div class="detail-hero"><div class="dialog-top"><span class="solution-icon">${icon(s.icon)}</span><button class="icon-button" data-action="close-dialog" aria-label="Close solution details">${icon("close")}</button></div><div class="solution-category" style="margin-top:20px">${esc(s.category)}</div><h2 id="detail-title">${esc(s.name)}</h2><p>${esc(s.summary)}</p><div class="product-tags">${s.products.map((p) => `<span>${esc(p)}</span>`).join("")}</div></div><div class="detail-body"><div class="detail-section"><h3>The customer outcome</h3><p>${esc(s.outcome)}</p></div><div class="detail-section"><h3>What this could automate</h3><ul>${s.automations.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div><div class="detail-facts"><div><span>Deployment options</span><strong>${s.deployments.map(esc).join(" · ")}</strong></div><div><span>Learning path</span><strong>${esc(s.track)}</strong></div><div><span>Partner branding</span><strong>${s.whiteLabel ? "Planned white-label option" : "Reference architecture"}</strong></div><div><span>Delivery status</span><strong>Confirm with program team</strong></div></div>${state.role === "sales" ? `<div class="detail-section"><h3>Your conversation starter</h3><p>${esc(s.sales)}</p></div>` : ""}<div class="detail-section"><h3>What needs to be in place</h3><ul>${s.requirements.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div><div class="detail-section"><h3>Three discovery questions</h3><ol>${s.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div><div class="detail-section detail-costs"><h3>Infrastructure planning estimates</h3><div class="segmented" role="group" aria-label="Solution cost environment"><button data-detail-cost="Cloud" aria-pressed="true">Cloud</button><button data-detail-cost="On-premises" aria-pressed="false">On-premises</button></div><div id="detail-cost-content"></div><p class="cost-caption">From the supplied program brief. Confirm model usage, telephony, licensing, labor, and service charges separately. These figures do not establish a quote or delivery commitment.</p></div></div><div class="detail-actions"><button class="button secondary" data-detail-save data-save="${s.id}"></button><button class="button primary" data-detail-brief="${s.id}">Use in a discovery brief ${icon("arrow")}</button></div>`;
  renderDetailCost("Cloud");
  updateDetailSave();
  openDialog("#detail-dialog");
}
function renderDetailCost(view: string) {
  const s = CATALOG.find((s) => s.id === state.detail);
  if (!s) return;
  $("#detail-cost-content").innerHTML =
    `<div class="cost-grid"><div><span>${view === "Cloud" ? "Pilot / month" : "Setup estimate"}</span><strong>${esc(view === "Cloud" ? s.pilot : s.onprem)}</strong></div><div><span>${view === "Cloud" ? "Production / month" : "Running estimate"}</span><strong>${esc(view === "Cloud" ? s.production : s.onpremRun)}</strong></div></div>`;
  $$("[data-detail-cost]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.detailCost === view)),
  );
}

function showBrief(ids = state.selected) {
  const input = getInput();
  const selected = ids.length
    ? ids
    : state.result?.matches.map((m) => m.id) || [];
  const generated = createBrief(input, state.result, selected, state.notes);
  closeDialogs();
  field("#brief-editor").value = generated;
  openDialog("#brief-dialog");
}

function renderTracks() {
  const labels = {
    sales: "Sales · about 1 hour",
    technical: "Technical · 4–8 hours",
    builder: "Builder · 2–5 days",
  };
  $("#track-cards").innerHTML = TRACKS.map(
    (track, i) =>
      `<article class="track-card"><div class="track-head">${icon(track.icon)}<div><h3>${esc(track.title)}</h3><p>${esc(track.products)}</p></div></div><p class="track-description">${esc(track[state.learning])}</p><div class="track-card-footer"><span>${track.title === "SalesDojo" ? "SalesDojo · 3.5 hours" : labels[state.learning]}</span><button class="text-button" data-track="${i}">Plan this learning ${icon("arrow")}</button></div></article>`,
  ).join("");
  $$("[data-learning]").forEach((b) =>
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.learning === state.learning),
    ),
  );
  $("#learning-heading").textContent = {
    sales: "Build confidence in the customer conversation.",
    technical: "Connect the architecture to a working lab.",
    builder: "Turn a practice lab into a scoped pilot.",
  }[state.learning];
}

function populateProgram() {
  const tiers = [
    {
      name: "Explore",
      desc: "For a partner finding the first AI opportunity.",
      items: [
        "AI readiness assessment",
        "Partner knowledge and program discovery",
        "SalesDojo and guided solution plays",
        "A first customer discovery brief",
      ],
    },
    {
      name: "Build",
      desc: "For a team turning technical skills into a working practice.",
      items: [
        "Specialization sprint planning",
        "NetDojo and CML practice labs",
        "A scoped solution kit pilot",
        "Office hours and training camps",
      ],
    },
    {
      name: "Scale",
      desc: "For an established practice building repeatable customer offers.",
      items: [
        "An on-site accelerator day",
        "Co-delivered customer pilot planning",
        "A partner-branded academy",
        "Private or hybrid reference architecture",
      ],
    },
  ];
  $("#tier-cards").innerHTML = tiers
    .map(
      (tier, i) =>
        `<article class="tier-card"><span class="tier-number">0${i + 1} / PRACTICE PATH</span><h2>${tier.name}</h2><p>${tier.desc}</p><ul>${tier.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><button class="button secondary" data-tier="${tier.name}">Explore this path ${icon("arrow")}</button></article>`,
    )
    .join("");
  const engagements = [
    [
      "Webinars",
      "60 minutes · proposed cohort sessions",
      "A guided introduction to AI opportunities, the program, and the next discovery step.",
    ],
    [
      "Weekly office hours",
      "60 minutes · proposed Thursday sessions",
      "Bring a customer use case, lab question, or kit challenge to the solutions team.",
    ],
    [
      "Day Training Camps",
      "1 day · proposed monthly cadence",
      "Architecture and a demonstration, followed by hands-on practice in the chosen domain.",
    ],
    [
      "Accelerator Days",
      "1 day · on-site by arrangement",
      "Work with your engineers and sellers on an assessment, pilot scope, and customer play.",
    ],
    [
      "Cisco Connect events",
      "Regional · dates to be confirmed",
      "Explore solution demonstrations and plan a focused conversation with a solutions architect.",
    ],
    [
      "Webex community",
      "Cohort community · access by invitation",
      "A proposed space for release notes, lab announcements, and shared questions.",
    ],
    [
      "Compliance clinics",
      "90 minutes · proposed monthly cadence",
      "Review program requirements and customer-specific data and deployment questions.",
    ],
    [
      "Specialization Sprint",
      "8 weeks · proposed cohorts of 5–8",
      "A guided plan to develop practice capabilities and work through current specialization requirements.",
    ],
  ];
  $("#engagement-cards").innerHTML = engagements
    .map(
      ([name, time, desc]) =>
        `<article class="engagement-card"><h3>${esc(name)}</h3><div class="engagement-meta">${esc(time)}</div><p>${esc(desc)}</p><button class="text-button" data-engagement="${esc(name)}">Add to a discovery brief ${icon("arrow")}</button></article>`,
    )
    .join("");
  $("#literacy-list").innerHTML = LITERACY.map(
    ([name, desc, role, time], i) =>
      `<div class="literacy-row"><span class="literacy-num">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(name)}</h3><p>${esc(desc)}</p></div><span>${role}</span><span>${time}</span></div>`,
  ).join("");
  const vod = [
    ["Program & Cisco 360 basics", 4, 8],
    ["SalesDojo", 6, 12],
    ["Network Automation", 5, 14],
    ["Webex Bots & Agents", 2, 8],
    ["Splunk Integration + AI", 3, 10],
    ["Security AI", 2, 10],
    ["Data Center AI", 3, 10],
    ["Private & Hybrid AI", 4, 8],
    ["AI literacy modules", 6, 12],
    ["Kit walkthroughs & deployment", 5, 12],
    ["Industry solution plays", 0, 6],
    ["Compliance clinics", 0, 4],
  ];
  $("#vod-plan").innerHTML =
    `<table><caption class="sr-only">On-demand planning counts from the supplied draft</caption><thead><tr><th>Track</th><th>Draft baseline</th><th>Target</th></tr></thead><tbody>${vod.map(([name, baseline, target]) => `<tr><td>${esc(name)}</td><td>${baseline}</td><td>${target}</td></tr>`).join("")}</tbody></table>`;
}

let contextPane: ContextPane;
let atlasBar: AtlasBar;
let homeView: HomeView;
let engageView: EngageView;
let developView: DevelopView;
let growView: GrowView;
let extendView: ExtendView;
let adminView: AdminView;

/** Hides any perspective control the signed-in user's groups don't grant. */
function restrictPerspectiveOptions() {
  const select = document.querySelector<HTMLSelectElement>(
    "#perspective-select",
  );
  if (select) {
    $$<HTMLOptionElement>("option", select).forEach((option) => {
      if (!allowedPerspectives.includes(option.value as WorkspacePerspective))
        option.remove();
    });
    const container = select.closest<HTMLElement>(".perspective-selector");
    if (container) container.hidden = select.options.length <= 1;
  }
  const roleButtons = $$<HTMLButtonElement>("[data-role]");
  roleButtons.forEach((button) => {
    if (
      !allowedPerspectives.includes(button.dataset.role as WorkspacePerspective)
    )
      button.hidden = true;
  });
  const segmented = roleButtons[0]?.closest<HTMLElement>(".segmented.roles");
  if (segmented)
    segmented.hidden = roleButtons.filter((b) => !b.hidden).length <= 1;
}

function setRole(role: string, announce = true) {
  if (!allowedPerspectives.includes(role as WorkspacePerspective))
    role = initialPerspective;
  state.role = role === "sales" ? "sales" : "partner";
  beacon.perspective =
    role === "sales" || role === "admin" || role === "practice_leader"
      ? role
      : "partner";
  homeView?.refreshTriage();
  const select = document.querySelector<HTMLSelectElement>(
    "#perspective-select",
  );
  if (select && select.value !== role) select.value = role;
  const label = $("#role-preview-label");
  if (label) {
    label.textContent =
      role === "sales"
        ? "Internal Sales perspective"
        : role === "admin"
          ? "Platform Admin perspective"
          : role === "practice_leader"
            ? "Practice Leader perspective"
            : "Partner workspace";
  }
  $$("[data-role]").forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.role === state.role),
    ),
  );
  $("#sales-fields").hidden = state.role !== "sales";
  $("#need-label").textContent =
    state.role === "sales"
      ? "What did the customer tell you?"
      : "Tell us what needs to work better.";
  $("#discover-title").innerHTML =
    state.role === "sales"
      ? "A customer conversation.<br><span>A clear opportunity.</span>"
      : "Start with a challenge.<br><span>Discover what’s possible.</span>";
  $("#discover-subtitle").textContent =
    state.role === "sales"
      ? "Capture the need, find a relevant play, and give your solutions architect a useful handoff."
      : "Start with the problem. Find the right solution, the right questions, and a clear next step.";
  invalidate();
  renderShortlist();
  save();
  if (announce)
    toast(
      state.role === "sales"
        ? "Internal sales perspective: discovery, sales plays, and handoff."
        : "Partner perspective: solutions, prerequisites, and enablement.",
    );
}

function closeMenu(returnFocus = false) {
  $("#sidebar").classList.remove("mobile-open");
  $("#mobile-backdrop").hidden = true;
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  $("#menu-toggle").setAttribute("aria-label", "Open navigation");
  syncNavigationAccessibility();
  if (returnFocus) $("#menu-toggle").focus();
}

function syncNavigationAccessibility() {
  const mobile = matchMedia("(max-width: 820px)").matches;
  const open = $("#sidebar").classList.contains("mobile-open");
  $("#sidebar").inert = mobile && !open;
  $("#main").inert = mobile && open;
}

function route(focus = true) {
  // Empty hash is the public home page; everything else is the workspace.
  if (!location.hash.slice(1)) return showLanding();
  hideLanding();
  const allowed = [
    "home",
    "engage",
    "develop",
    "grow",
    "extend",
    "admin",
    "discover",
    "library",
    "use-cases",
    "shortlist",
    "enablement",
    "program",
  ];
  const hash = location.hash.slice(1).split("?")[0];
  const page = allowed.includes(hash)
    ? hash
    : hash === ""
      ? "home"
      : "discover";

  $$(".page").forEach((el) => {
    el.hidden = el.id !== "page-" + page;
  });

  $$(".main-nav a").forEach((link) => {
    if (link.dataset.page === page) {
      link.setAttribute("aria-current", "page");
      link.classList.add("active");
    } else {
      link.removeAttribute("aria-current");
      link.classList.remove("active");
    }
    link.title = link.textContent.trim();
  });

  const names: Record<string, string> = {
    home: "Home — My EDGE",
    engage: "Engage — Onboarding & Cisco 360",
    develop: "Develop — Skills & Virtual Labs",
    grow: "Grow — Customer 360 & Pipeline",
    extend: "Extend — Community & MCP",
    admin: "Admin Control Tower",
    discover: "Find a solution",
    library: "Turnkey solutions",
    "use-cases": "Use-case atlas",
    shortlist: "My shortlist",
    enablement: "Enablement",
    program: "The accelerator",
  };

  $("#breadcrumb").innerHTML =
    "Workspace / <strong>" + (names[page] || page) + "</strong>";
  document.title = (names[page] || page) + " | EDGE Beacon · TD SYNNEX";
  closeMenu();

  if (page === "home") {
    homeView?.render();
    fillIcons($("#page-home"));
  } else if (page === "engage") {
    engageView?.render();
    fillIcons($("#page-engage"));
  } else if (page === "develop") {
    developView?.render();
    fillIcons($("#page-develop"));
    const queryParams = new URLSearchParams(
      location.hash.includes("?") ? location.hash.split("?")[1] : "",
    );
    if (queryParams.get("tab") === "labs") {
      developView?.openLabsConsole(queryParams.get("device") || undefined);
    }
  } else if (page === "grow") {
    growView?.render();
    fillIcons($("#page-grow"));
  } else if (page === "extend") {
    extendView?.render();
    fillIcons($("#page-extend"));
  } else if (page === "admin") {
    adminView?.render();
    fillIcons($("#page-admin"));
  } else if (page === "shortlist") {
    renderShortlist();
  }

  if (focus) {
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

field("#industry").innerHTML = INDUSTRIES.map(
  (t) => `<option>${esc(t)}</option>`,
).join("");
field("#priority").innerHTML = PRIORITIES.map(
  (t) => `<option>${esc(t)}</option>`,
).join("");
for (const name of [
  "need",
  "industry",
  "priority",
  "deployment",
  "readiness",
  "account",
  "timing",
]) {
  const el = field("#" + name),
    value = state.draft[name];
  if (typeof value === "string" && value.length <= 5000) {
    if (
      !(el instanceof HTMLSelectElement) ||
      [...el.options].some((o) => o.value === value)
    )
      el.value = value.slice(0, name === "account" ? 150 : 5000);
  }
}
$("#char-count").textContent =
  field("#need").value.length.toLocaleString() + " / 5,000";
$("#examples").innerHTML = EXAMPLES.map(
  (example, i) =>
    `<button type="button" class="example" data-example="${i}">${icon(example.icon)}<span class="example-content"><span class="example-label">${example.label}</span><span class="example-title">${example.title}</span></span>${icon("arrow")}</button>`,
).join("");
$("#category-filters").innerHTML = CATEGORIES.map(
  (category) =>
    `<button class="filter-chip" data-category="${esc(category)}" aria-pressed="${category === state.category}">${esc(category)}</button>`,
).join("");
field("#use-case-product").innerHTML = PRODUCT_LINES.map(
  (line) => `<option>${esc(line)}</option>`,
).join("");
field("#use-case-vertical").innerHTML = VERTICALS.map(
  (vertical) => `<option>${esc(vertical)}</option>`,
).join("");
$('.main-nav a[data-page="use-cases"] .nav-count').textContent = String(
  USE_CASES.length,
);
$("#use-case-count").textContent = `${USE_CASES.length} use cases`;
$("#page-use-cases .page-heading .eyebrow").textContent =
  `${USE_CASES.length} STARTING POINTS · ${PRODUCT_LINES.length - 1} PRODUCT LINES · ${VERTICALS.length - 1} VERTICALS`;

contextPane = new ContextPane();
homeView = new HomeView($("#page-home"), contextPane, (r) => {
  location.hash = r;
});
engageView = new EngageView($("#page-engage"), contextPane);
developView = new DevelopView($("#page-develop"), contextPane, toast);
growView = new GrowView($("#page-grow"), contextPane, (subtab) => {
  if (subtab === "customers") {
    location.hash = "#grow";
  } else if (subtab === "discover") {
    location.hash = "#discover";
  } else if (subtab === "library") {
    location.hash = "#library";
  } else if (subtab === "use-cases") {
    location.hash = "#use-cases";
  } else if (subtab === "shortlist") {
    location.hash = "#shortlist";
  }
});
extendView = new ExtendView($("#page-extend"));
adminView = new AdminView($("#page-admin"));

atlasBar = new AtlasBar({
  onNavigate: (r) => {
    location.hash = r;
  },
  onSelectCustomer: (cid) => {
    const cust = CUSTOMERS_DATA.find((c) => c.id === cid);
    if (cust) contextPane.showCustomer(cust);
  },
  onSelectCourse: (cid) => {
    const course = COURSES_DATA.find((c) => c.id === cid);
    if (course) contextPane.showCourse(course);
  },
  onOpenDiscoveryBrief: () => {
    showBrief();
  },
  onOpenTerminal: () => {
    location.hash = "#develop?tab=labs";
    developView.openLabsConsole();
  },
});

$("#header-ask-btn")?.addEventListener("click", () => {
  atlasBar.open("?");
});

document
  .querySelector<HTMLSelectElement>("#perspective-select")
  ?.addEventListener("change", (e) => {
    setRole((e.target as HTMLSelectElement).value);
  });

fillIcons();
populateProgram();
renderStarter();
renderLibrary();
renderUseCases();
renderTracks();
restrictPerspectiveOptions();
setRole(initialPerspective, false);
route(false);

$("#discovery-form").addEventListener("submit", (event) => {
  event.preventDefault();
  runMatching();
});
$("#discovery-form").addEventListener("input", (event) => {
  invalidate();
  if (event.target instanceof HTMLElement && event.target.id === "need")
    state.notes = "";
  $("#char-count").textContent =
    field("#need").value.length.toLocaleString() + " / 5,000";
  save();
});
$("#discovery-form").addEventListener("change", () => {
  invalidate();
  save();
});
field("#solution-search").addEventListener("input", renderLibrary);
field("#library-deployment").addEventListener("change", renderLibrary);
field("#use-case-search").addEventListener("input", () => {
  state.useCasePage = 0;
  renderUseCases();
});
field("#use-case-product").addEventListener("change", () => {
  state.useCasePage = 0;
  renderUseCases();
});
field("#use-case-vertical").addEventListener("change", () => {
  state.useCasePage = 0;
  renderUseCases();
});
$("#menu-toggle").addEventListener("click", () => {
  const open = !$("#sidebar").classList.contains("mobile-open");
  $("#sidebar").classList.toggle("mobile-open", open);
  $("#mobile-backdrop").hidden = !open;
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
  $("#menu-toggle").setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
  syncNavigationAccessibility();
  if (open) $(".main-nav a").focus();
});
matchMedia("(max-width: 820px)").addEventListener("change", () => closeMenu());
$("#mobile-backdrop").addEventListener("click", () => closeMenu(true));
$("#collapse-toggle").addEventListener("click", () => {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  $("#collapse-toggle").setAttribute("aria-expanded", String(!collapsed));
  $("#collapse-toggle").setAttribute(
    "aria-label",
    collapsed ? "Expand sidebar" : "Collapse sidebar",
  );
});
window.addEventListener("hashchange", () => route());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#sidebar").classList.contains("mobile-open"))
    closeMenu(true);
});
$$<HTMLDialogElement>("dialog").forEach((dialog) => {
  dialog.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]")) {
      document.body.style.overflow = "";
      if (lastDialogTrigger?.isConnected) lastDialogTrigger.focus();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
});
document.addEventListener("input", (event) => {
  if (
    event.target instanceof HTMLTextAreaElement &&
    event.target.id === "discovery-notes"
  ) {
    state.notes = event.target.value;
    save();
  }
});

document.addEventListener("click", async (event) => {
  const button =
    event.target instanceof Element ? event.target.closest("button") : null;
  if (!button) return;
  if (button.dataset.role) {
    setRole(button.dataset.role);
    return;
  }
  if (button.dataset.example !== undefined) {
    const example = EXAMPLES[Number(button.dataset.example)];
    if (!example) return;
    invalidate();
    state.notes = "";
    field("#need").value = example.text;
    field("#industry").value = example.industry;
    field("#priority").value = example.priority;
    $("#char-count").textContent = example.text.length + " / 5,000";
    save();
    field("#need").focus();
    return;
  }
  if (button.dataset.save) {
    toggleSave(button.dataset.save);
    return;
  }
  if (button.dataset.detail) {
    openDetail(button.dataset.detail);
    return;
  }
  if (button.dataset.useCaseDetail) {
    openUseCase(button.dataset.useCaseDetail);
    return;
  }
  if (button.dataset.detailBrief) {
    showBrief([button.dataset.detailBrief]);
    return;
  }
  if (button.dataset.detailCost) {
    renderDetailCost(button.dataset.detailCost);
    return;
  }
  if (button.dataset.compareCost) {
    state.costView = button.dataset.compareCost;
    renderShortlist();
    return;
  }
  if (button.dataset.category) {
    state.category = button.dataset.category;
    renderLibrary();
    return;
  }
  if (button.dataset.learning) {
    state.learning =
      button.dataset.learning === "technical" ||
      button.dataset.learning === "builder"
        ? button.dataset.learning
        : "sales";
    renderTracks();
    return;
  }
  if (button.dataset.track !== undefined) {
    const track = TRACKS[Number(button.dataset.track)];
    state.notes +=
      (state.notes ? "\n" : "") +
      "Requested learning: " +
      track.title +
      " (" +
      state.learning +
      "). " +
      track[state.learning];
    save();
    showBrief();
    return;
  }
  if (button.dataset.engagement) {
    state.notes +=
      (state.notes ? "\n" : "") +
      "Engagement to discuss: " +
      button.dataset.engagement +
      ". Confirm availability and timing with the program team.";
    save();
    showBrief();
    return;
  }
  if (button.dataset.tier) {
    const stages: Record<string, string> = {
      Explore: "Just exploring",
      Build: "Building a practice",
      Scale: "Established practice",
    };
    field("#readiness").value = stages[button.dataset.tier];
    invalidate();
    save();
    location.hash = "discover";
    field("#need").focus();
    toast(
      button.dataset.tier +
        " path selected. Describe the customer need to find a solution.",
    );
    return;
  }
  switch (button.dataset.action) {
    case "help":
      openDialog("#help-dialog");
      break;
    case "close-dialog":
      closeDialogs();
      break;
    case "result-brief":
      showBrief(state.result?.matches.map((m) => m.id) || []);
      break;
    case "start-brief":
      showBrief();
      break;
    case "program-brief":
      state.notes +=
        (state.notes ? "\n" : "") +
        "Discuss an enablement plan and the appropriate Explore, Build, or Scale path.";
      save();
      showBrief();
      break;
    case "refine":
      await runMatching();
      break;
    case "guided-fallback":
      invalidate();
      state.result = matchSolutions(inputWithNotes());
      renderResults();
      break;
    case "reset-filters":
      state.category = "All solutions";
      field("#solution-search").value = "";
      field("#library-deployment").value = "All environments";
      renderLibrary();
      break;
    case "previous-use-cases":
      state.useCasePage--;
      renderUseCases();
      $("#use-case-grid").scrollIntoView({ block: "start" });
      break;
    case "next-use-cases":
      state.useCasePage++;
      renderUseCases();
      $("#use-case-grid").scrollIntoView({ block: "start" });
      break;
    case "reset-use-cases":
      state.useCasePage = 0;
      field("#use-case-search").value = "";
      field("#use-case-product").value = "All product lines";
      field("#use-case-vertical").value = "All verticals";
      renderUseCases();
      break;
    case "use-case-shortlist": {
      const item = USE_CASES.find(
        (item) => item.id === button.dataset.useCaseId,
      );
      if (item) {
        state.notes +=
          (state.notes ? "\n" : "") +
          "Use case to explore: " +
          item.deliverable +
          " (" +
          item.vertical +
          "). " +
          item.automation;
        save();
        toast("Use case added to your discovery notes.");
      }
      break;
    }
    case "use-case-brief": {
      const item = USE_CASES.find(
        (item) => item.id === button.dataset.useCaseId,
      );
      if (item) {
        state.notes +=
          (state.notes ? "\n" : "") +
          "Use case: " +
          item.deliverable +
          " (" +
          item.vertical +
          "). " +
          item.automation;
        save();
        showBrief();
      }
      break;
    }
    case "clear-shortlist":
      state.selected = [];
      save();
      refreshSaved();
      toast("Your shortlist is cleared.");
      break;
    case "copy-brief":
      try {
        await navigator.clipboard.writeText(field("#brief-editor").value);
        toast("Discovery brief copied.");
      } catch {
        field("#brief-editor").focus();
        $<HTMLTextAreaElement>("#brief-editor").select();
        toast("Select and copy the brief with your keyboard.");
      }
      break;
    case "download-brief": {
      const blob = new Blob([field("#brief-editor").value], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "TD-SYNNEX-discovery-brief.md";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Discovery brief downloaded.");
      break;
    }
    case "clear-local":
      state.selected = [];
      state.notes = "";
      $<HTMLFormElement>("#discovery-form").reset();
      field("#account").value = "";
      invalidate();
      $("#char-count").textContent = "0 / 5,000";
      try {
        localStorage.removeItem("tds-accelerator-v1");
      } catch {}
      refreshSaved();
      closeDialogs();
      toast("This browser’s saved draft and shortlist are cleared.");
      break;
    case "sign-out":
      signOut();
      break;
  }
});

fetch("/api/config", {
  cache: "no-store",
  headers: getAuthHeader() ? { Authorization: getAuthHeader()! } : {},
})
  .then((response) => {
    if (response.status === 401) {
      signOut();
      return null;
    }
    return response.ok ? response.json() : null;
  })
  .then((config) => {
    state.ai = config?.aiReady === true;
    beacon.ready = config?.jevReady === true;
    $("#mode-badge").textContent = beacon.ready
      ? "Jev-powered"
      : state.ai
        ? "AI-assisted discovery"
        : "Guided matching";
    $("#ai-note").innerHTML = beacon.ready
      ? "Jev ranks every catalog option.<br>Your brief stays editable."
      : state.ai
        ? "AI uses this solution catalog.<br>Your brief stays editable."
        : "Catalog matching is ready.<br>Jev is not connected yet.";
    homeView.refreshTriage();
    resetLoading();
  })
  .catch(() => {
    state.ai = false;
    resetLoading();
  });
