import "./styles/tokens.css";
import "./styles/landing.css";
import { icon } from "./icons.ts";

/**
 * Home page (empty hash). Layout and motion follow america.gov: rounded pastel
 * hero, giant tight-tracked headline that rises in word by word, a rotating
 * ask prompt, a statement that fills in as you scroll, tiles that drift with
 * the scroll, a floating ask pill and a full-screen Menu. Counts come from
 * DESIGN.md. Every link is a workspace hash route; the caller may intercept
 * (signed out) to sign in first.
 */
const PROMPTS = [
  "Which Cisco AI solution fits a retail customer?",
  "Which labs should my engineers take first?",
  "Which customers have open opportunities?",
  "What needs my approval today?",
];

// Words of the scroll-fill statement; "@name" renders an inline icon badge.
const STATEMENT =
  "EDGE Beacon brings @search customers, courses, labs and 375 use cases into one search. It’s built for the Cisco practice, and every @check action stays with a person.".split(
    " ",
  );

const ROWS = [
  [
    "engage",
    "#engage",
    "Know every customer.",
    "See the install base, the open opportunities and who to call, before the conversation starts.",
    "compass",
  ],
  [
    "develop",
    "#develop",
    "Skills that stick.",
    "Courses, add-ons and NetDojo virtual labs, with every lab objective graded.",
    "graduation",
  ],
  [
    "grow",
    "#grow",
    "Opportunities you can trust.",
    "Every claim is checked against what the customer already runs.",
    "growth",
  ],
  [
    "extend",
    "#extend",
    "Actions stay with people.",
    "Agent changes that touch money or upstream systems always wait for your approval.",
    "shield",
  ],
] as const;

type Link = [href: string, label: string, sub: string, icon: string];
const MENU: [title: string, links: Link[]][] = [
  [
    "EDGE workflow",
    [
      ["#home", "Home", "My EDGE · Priority inbox", "home"],
      ["#engage", "Engage", "Get set up · Cisco 360", "compass"],
      ["#develop", "Develop", "Build skills · Labs & PVI", "graduation"],
      ["#grow", "Grow", "Sell & manage · Customers", "growth"],
      ["#extend", "Extend", "Connect & share · MCP", "plug"],
    ],
  ],
  [
    "Catalog & discovery",
    [
      [
        "#discover",
        "Find a solution",
        "Describe a need, compare options",
        "search",
      ],
      ["#library", "Turnkey solutions", "12 capabilities", "layers"],
      ["#use-cases", "Use-case atlas", "375 use cases", "grid"],
      ["#shortlist", "My shortlist", "Saved in this browser", "bookmark"],
      ["#enablement", "Enablement", "", "book"],
      ["#program", "The accelerator", "", "layers"],
    ],
  ],
  ["Control plane", [["#admin", "Admin", "Control Tower & intake", "sliders"]]],
];

const arrow = icon("arrow");
const stagger = (i: number) => `style="--i:${i}"`;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const html = `
<p class="ld-utility">TD SYNNEX partner workspace</p>
<div class="ld-frame">
  <header class="ld-nav">
    <a class="ld-logo" href="#" aria-label="TD SYNNEX home"><img src="/assets/td-synnex-logo.png" alt="TD SYNNEX" width="185" height="36" /></a>
    <button type="button" class="ld-menu" aria-haspopup="dialog">Menu</button>
  </header>
  <main id="top">
    <section class="ld-hero">
      <h1 aria-label="Hello, partner">${["Hello,", "partner"].map((w, i) => `<span class="ld-mask" aria-hidden="true"><span ${stagger(i)}>${w}</span></span>`).join(" ")}</h1>
      <p class="ld-sub">Whatever you need for the Cisco practice, start here.</p>
      <a class="ld-ask" href="#discover" aria-label="Start with Beacon">
        <span class="ld-prompt">Try ‘${PROMPTS[0]}’</span><i>${arrow}</i>
      </a>
    </section>
  </main>
</div>
<section class="ld-statement" aria-labelledby="ld-st">
  <h2 id="ld-st" aria-label="${STATEMENT.map((w) => (w[0] === "@" ? "" : w))
    .filter(Boolean)
    .join(
      " ",
    )}">${STATEMENT.map((w, i) => `<span class="ld-w" aria-hidden="true" ${stagger(i)}>${w[0] === "@" ? `<b class="ld-chip">${icon(w.slice(1))}</b>` : w}</span>`).join(" ")}</h2>
</section>
<section class="ld-rows">
  ${ROWS.map(
    ([k, href, t, d, i], n) => `
  <article class="ld-row${n % 2 ? " ld-flip" : ""} ld-reveal">
    <div class="ld-tile ld-${k}" aria-hidden="true">${icon(i)}</div>
    <div class="ld-text"><h2>${t}</h2><p>${d}</p><a class="ld-link" href="${href}">Explore ${k[0]!.toUpperCase() + k.slice(1)}</a></div>
  </article>`,
  ).join("")}
</section>
<footer class="ld-footer">
  <img src="/assets/td-synnex-logo.png" alt="TD SYNNEX" width="185" height="36" />
  <p>EDGE Beacon · 12 capabilities · 14 product lines · 15 verticals</p>
</footer>
<a class="ld-float" href="#discover"><span>Ask Beacon</span><i>${arrow}</i></a>
<dialog class="ld-dialog" aria-label="Menu">
  <div class="ld-dialog-bar">
    <a class="ld-logo" href="#" aria-label="TD SYNNEX home"><img src="/assets/td-synnex-logo.png" alt="TD SYNNEX" width="185" height="36" /></a>
    <button type="button" class="ld-menu" data-close>Close</button>
  </div>
  <nav aria-label="Workspace navigation" class="ld-groups">
    ${MENU.map(
      ([title, links], g) => `
    <section class="ld-group" ${stagger(g)}><h2>${title}</h2><ul>
      ${links.map(([href, label, sub, ic], n) => `<li ${stagger(g * 3 + n)}><a href="${href}"><span class="ld-mi">${icon(ic)}</span><span><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ""}</span></a></li>`).join("")}
    </ul></section>`,
    ).join("")}
  </nav>
</dialog>`;

let root: HTMLElement | undefined;
let intercept: ((hash: string) => void) | undefined;

function build(): HTMLElement {
  const el = document.createElement("div");
  el.id = "landing";
  el.innerHTML = html;
  const dlg = el.querySelector("dialog")!;
  el.querySelector(".ld-nav .ld-menu")!.addEventListener("click", () =>
    dlg.showModal(),
  );
  dlg
    .querySelector("[data-close]")!
    .addEventListener("click", () => dlg.close());
  el.addEventListener("click", (e) => {
    const a = (e.target as Element).closest("a");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (dlg.open) dlg.close();
    if (href === "#") return; // back to this page; default navigation
    if (intercept && href.startsWith("#")) {
      e.preventDefault();
      intercept(href);
    }
  });
  document.body.append(el);
  motion(el);
  return el;
}

/** Scroll-driven and timed motion. All of it is skipped for reduced-motion users. */
function motion(el: HTMLElement) {
  const still = reduced();
  const words = [...el.querySelectorAll<HTMLElement>(".ld-w")];
  const statement = el.querySelector<HTMLElement>(".ld-statement")!;
  const tiles = [...el.querySelectorAll<HTMLElement>(".ld-tile")];
  const float = el.querySelector<HTMLElement>(".ld-float")!;
  const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

  if (still) {
    el.classList.add("ld-still");
    return;
  }

  // Rotating ask prompt.
  const prompt = el.querySelector<HTMLElement>(".ld-prompt")!;
  let p = 0;
  setInterval(() => {
    if (el.hidden) return;
    prompt.classList.add("out");
    setTimeout(() => {
      p = (p + 1) % PROMPTS.length;
      prompt.textContent = `Try ‘${PROMPTS[p]}’`;
      prompt.classList.remove("out");
    }, 350);
  }, 3800);

  // Reveal on enter.
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.2 },
  );
  el.querySelectorAll(".ld-reveal").forEach((n) => io.observe(n));

  // Statement fills in word by word; tiles drift; ask pill slides up.
  let queued = false;
  const frame = () => {
    queued = false;
    if (el.hidden) return;
    const vh = innerHeight;
    const r = statement.getBoundingClientRect();
    const prog = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.2));
    const lit = prog * (words.length + 3);
    words.forEach((w, i) =>
      w.style.setProperty("--o", String(clamp(lit - i, 0, 1))),
    );
    tiles.forEach((t) => {
      const b = t.getBoundingClientRect();
      t.style.setProperty(
        "--p",
        String(clamp((b.top + b.height / 2 - vh / 2) / vh, -1, 1)),
      );
    });
    float.classList.toggle("show", scrollY > vh * 0.6);
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  frame();
}

/** Show the home page. `onNavigate` (signed out) receives the clicked "#route" instead of the browser. */
export function showLanding(
  onNavigate?: (hash: string) => void,
  error?: string,
): void {
  root ??= build();
  if (onNavigate) intercept = onNavigate;
  if (error && !root.querySelector(".ld-error")) {
    const note = document.createElement("p");
    note.className = "ld-error";
    note.setAttribute("role", "alert");
    note.textContent = error;
    root.prepend(note);
  }
  root.hidden = false;
  document.body.classList.add("landing-open");
  scrollTo(0, 0);
}

export function hideLanding(): void {
  if (!root) return;
  root.hidden = true;
  document.body.classList.remove("landing-open");
}
