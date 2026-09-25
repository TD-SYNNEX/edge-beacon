# EDGE Beacon · TD SYNNEX

The one place Cisco practice teams go for everything about the practice: customers, courses and add-ons, virtual labs, solutions, 375 use cases, program answers and the approvals waiting on them. One search box (⌘K) reaches all of it.

Beacon uses **Jev** (TypeSafe System One) for the judgments that plain code can't make: what a request means, which result is relevant, what needs you first, and whether an agent's action or an opportunity's claim holds up. Code keeps the rules, the thresholds and every action; Jev only answers narrow, typed questions.

## Where Jev works

| Where                          | Jev judges                                                                                  | Code keeps                                                                         | Server module                 |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| **Ask Beacon** (⌘K)            | Intent (Choice) + relevance of each retrieved record (Score), one request                   | Lexical retrieval, relevance floor, destination per intent                         | `server/jev/search.ts`        |
| **Discovery matching**         | Does each solution address the need (Noul) + fit (Score); rank a use-case shortlist (Score) | Deployment filter, weights, top-3, tier, questions and next steps from the catalog | `server/jev/match.ts`         |
| **Priority inbox**             | Urgency (Score) and "needs you" (Noul) per item, for the viewer's role                      | Per-role weights, staleness, sort order                                            | `server/jev/inbox.ts`         |
| **Agent approvals**            | Reach of the change (Score), rationale matches diff, within mandate, touches money (Noul)   | Hard rules first: upstream writes and commercial changes always go to a person     | `server/jev/inbox.ts`         |
| **NetDojo lab grading**        | Does this command accomplish each objective (Noul)                                          | Pass/close thresholds, score arithmetic                                            | `server/jev/lab.ts`           |
| **Customer 360 opportunities** | Category (Choice), evidence strength (Score), claim consistent with install base (Noul)     | Grounded/verify threshold                                                          | `server/jev/opportunities.ts` |

Every threshold and weight is a named constant (`SEARCH`, `WEIGHTS`, `MATCH`, `TRIAGE_WEIGHTS`, `GATE`, `PASS`, `OPPORTUNITY`). Changing one re-composes existing answers; it doesn't change what Jev is asked. They are starting points: evaluate them on real data before trusting any automatic path.

When Jev is off or fails, every feature falls back to its guided behavior (substring search, keyword matching, source order, pattern grading) and says so.

## Get started

Requires Node.js **22.15 or newer** and npm.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Vite serves the frontend with hot updates and the same `/api/config` and `/api/discover` handlers used in production.

| Command                | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`          | Vite development server and discovery API                                            |
| `npm run typecheck`    | Strict TypeScript checking across frontend, shared logic, server, scripts, and tests |
| `npm test`             | Catalog, matching, request validation, and API contract tests                        |
| `npm run build`        | Typecheck, build the Vite frontend, and bundle the production Worker                 |
| `npm start`            | Serve the built Worker locally at `http://127.0.0.1:3000`                            |
| `npm run preview`      | Preview Vite's built frontend with the discovery API at port 4173                    |
| `npm run test:e2e`     | Browser regression suite; starts Vite when needed                                    |
| `npm run format:check` | Check source formatting                                                              |
| `npm run format`       | Format source files                                                                  |

Local browser tests use installed Google Chrome. CI installs Playwright Chromium. To verify the production Worker after building:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

GitHub Actions runs formatting, unit/API tests, the production build, and browser checks against both Vite and the production Worker.

## Workspace features

- Partner and internal-sales discovery perspectives.
- Guided matching from a customer need, industry, priority, deployment preference, and practice stage.
- 12 solution capabilities with outcomes, prerequisites, learning paths, and planning estimates.
- 375 use cases across 14 product lines and 15 verticals, including LiveKit voice/video and healthcare/dental workflows.
- Search, category and deployment filters, and use-case pagination with 12 results per page.
- A browser-local shortlist of up to three solutions, comparison, and editable Markdown brief downloads.
- Follow-up notes and refined matching, role-based learning outlines, program tiers, and engagement planning.
- Responsive navigation, keyboard focus management, native dialogs, reduced-motion support, and labeled matching states.

## Design foundation

The interface follows the supplied [TD SYNNEX Design System](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/): deep teal, white surfaces, teal actions, restrained chartreuse accents, Arial, Lucide line icons, and 2px component corners. Shared semantic tokens live in `src/styles/tokens.css`. See [DESIGN.md](DESIGN.md) for source decisions and [design-qa.md](design-qa.md) for verification.

## Project structure

```text
index.html             Vite HTML entry and accessible workspace markup
src/main.ts            Typed view state, discovery, filters, dialogs, and navigation
src/beacon-client.ts   Browser calls to Jev routes, with null = fall back
src/components/        Beacon search (atlas-bar), context pane, NetDojo terminal
src/views/             Home, Engage, Develop, Grow, Extend, Admin pillars
src/dom.ts             Typed DOM access helpers
src/icons.ts           Lucide icon mappings
src/styles/            Brand tokens, responsive layouts, and accessibility styles
shared/catalog.ts      Typed solution catalog, use cases, and learning content
shared/matcher.ts      Guided matching, shared result composition, brief generation
shared/beacon-index.ts One searchable index of every customer, course, lab, solution, use case and answer
shared/edge-data.ts    Sample EDGE data (inbox, Customer 360, courses, labs, agents)
server/beacon-api.ts   Jev route validation and error handling
server/jev/            Jev client and the six judgment modules
shared/types.ts        Shared contracts and runtime guards
server/api.ts          Server-only OpenAI integration and input/output validation
server/http.ts         Shared Node HTTP adapter for Vite and production
server/worker.ts       Fetch-compatible API and static asset handler
vite.config.ts         Frontend build and development/preview API integration
scripts/build.ts       Bundles Vite output into a standalone ESM Worker
scripts/serve.ts       Runs the built Worker locally
tests/                 TypeScript unit/API tests and Playwright browser flows
reference/             Preserved original program brief; excluded from builds
```

The build outputs `dist/client/` with Vite's optimized assets, `dist/server/index.js` with the standalone Cloudflare-compatible Worker, and `dist/.openai/hosting.json`. The Worker embeds the frontend, so existing Sites hosting needs no asset binding. `dist/` and private environment files remain ignored by Git.

## Connecting Jev

Copy `.env.example` to a private `.env`, set `TYPESAFE_API_KEY` and `JEV_ENABLED=true`. `TYPESAFE_MODEL` defaults to `jev-latest`. The key is read only by the server; the browser calls `/api/beacon/{search,match,inbox,grade,opportunities}`, which validate input, reject cross-site requests, and never return provider details. The account alias is never sent to Jev.

**Data approval first.** TypeSafe is a third-party API. Customer install base, CRM and contract data must be cleared by InfoSec / data classification before a production key is configured. The shipped data is sample data.

## Optional OpenAI connection

Copy `.env.example` to a private `.env` file. `AI_ENABLED=true` and a valid server-side `OPENAI_API_KEY` enable the Responses API integration. `OPENAI_MODEL` can be configured for the account. Vite loads `.env` for the server handler; no credential is exposed through a `VITE_` variable or included in the browser bundle.

For the production Node adapter with a local environment file:

```sh
npm run build
node --env-file=.env --import tsx scripts/serve.ts
```

Hosted credentials belong in the host's runtime environment. With AI disabled or unconfigured, the app uses explicitly labeled guided matching. No live OpenAI call was needed for this migration: provider responses and failures are covered with mocks.

The API omits account aliases, uses `store: false`, limits request size, rejects cross-origin submissions, and validates all returned catalog IDs and deployment compatibility. Provider details and credentials are not returned in errors. Briefs remain drafts; generating one does not submit a CRM record, book a session, send a message, or deploy a solution.

This workspace retains browser-local storage. Perspective switches are presentation controls, not authentication or authorization. Shared accounts, durable partner records, SSO, and external workflow destinations require their own implementation before expanding to a multi-user service.
# edge-beacon
