import type { Fetch } from "@typesafe-ai/sdk";
import { isRecord, errorMessage } from "../shared/types.ts";
import type { ServerEnv } from "../shared/types.ts";
import { CUSTOMERS_DATA } from "../shared/edge-data.ts";
import type { WorkspacePerspective } from "../shared/edge-types.ts";
import { json, readBoundedJson, crossSite, validateInput } from "./api.ts";
import { createJev, jevReady } from "./jev/client.ts";
import type { Jev } from "./jev/client.ts";
import { askBeacon } from "./jev/search.ts";
import { jevMatch } from "./jev/match.ts";
import { triageInbox } from "./jev/inbox.ts";
import { gradeCommand } from "./jev/lab.ts";
import { checkOpportunities } from "./jev/opportunities.ts";

const PERSPECTIVES: WorkspacePerspective[] = [
  "partner",
  "sales",
  "practice_leader",
  "admin",
];

/** Lab devices are server-known; the browser only names one. */
const LAB_DEVICES: Record<string, { name: string; os: string; type: string }> =
  {
    cat9300: {
      name: "Cat9300-Edge-01",
      os: "Cisco IOS-XE 17.9.4a",
      type: "ios-xe",
    },
    cat8000v: {
      name: "Cat8000v-SDWAN",
      os: "Cisco Catalyst 8000v 17.9.3a",
      type: "sd-wan",
    },
    "auto-host": {
      name: "Automation-Host",
      os: "Ubuntu 24.04 (pyATS & Ansible)",
      type: "linux",
    },
  };

const perspectiveOf = (body: Record<string, unknown>): WorkspacePerspective => {
  const value = body.perspective ?? "partner";
  if (!PERSPECTIVES.includes(value as WorkspacePerspective))
    throw new Error("Choose a valid perspective.");
  return value as WorkspacePerspective;
};
const textOf = (
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
) => {
  const value = body[key];
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new Error(`Provide ${key} in ${min}–${max} characters.`);
  return value.trim();
};

/** Routes validate synchronously (throw → 400) before returning the Jev promise. */
type Route = (jev: Jev, body: Record<string, unknown>) => Promise<unknown>;

const ROUTES: Record<string, Route> = {
  search: (jev, body) =>
    askBeacon(jev, textOf(body, "query", 2, 300), perspectiveOf(body)),
  match: (jev, body) => jevMatch(jev, validateInput(body)),
  inbox: (jev, body) => triageInbox(jev, perspectiveOf(body)),
  grade: (jev, body) => {
    const id = String(body.deviceId);
    const device = Object.hasOwn(LAB_DEVICES, id) ? LAB_DEVICES[id] : undefined;
    if (!device) throw new Error("Choose a valid lab device.");
    return gradeCommand(jev, textOf(body, "command", 1, 200), device);
  },
  opportunities: (jev, body) => {
    const customer = CUSTOMERS_DATA.find((c) => c.id === body.customerId);
    if (!customer) throw new Error("Choose a valid customer.");
    return checkOpportunities(jev, customer);
  },
};

export async function handleBeacon(
  request: Request,
  env: ServerEnv,
  fetcher?: Fetch,
): Promise<Response> {
  const name = new URL(request.url).pathname.slice("/api/beacon/".length);
  const route = Object.hasOwn(ROUTES, name) ? ROUTES[name] : undefined;
  if (!route) return json({ message: "Not found." }, 404);
  if (request.method !== "POST")
    return json({ message: "Method not allowed." }, 405);
  if (crossSite(request))
    return json({ message: "Use Beacon from this workspace." }, 403);
  let body: unknown;
  try {
    body = await readBoundedJson(request);
    if (!isRecord(body)) throw new Error("Provide a JSON object.");
  } catch (error) {
    return json({ message: errorMessage(error) }, 400);
  }
  if (!jevReady(env))
    return json(
      {
        code: "JEV_NOT_CONNECTED",
        message: "Jev is not connected. Showing guided results.",
      },
      503,
    );
  const jev = createJev(env, fetcher);
  let work: Promise<unknown>;
  try {
    work = route(jev, body);
  } catch (error) {
    return json({ message: errorMessage(error) }, 400);
  }
  try {
    return json(await work);
  } catch {
    // Routes validate synchronously above, so anything here is upstream. Provider details and credentials are never returned.
    return json(
      { message: "Jev is unavailable right now. Showing guided results." },
      502,
    );
  }
}
