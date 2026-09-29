import type { WorkspacePerspective } from "../shared/edge-types.ts";
import { getAuthHeader, signOut } from "./auth.ts";

/** Set once from /api/config and the perspective switch. */
export const beacon: { ready: boolean; perspective: WorkspacePerspective } = {
  ready: false,
  perspective: "partner",
};

/**
 * Calls a Jev-backed route. Returns null when Jev is off or fails, so every
 * caller keeps its existing guided behavior as the fallback. A 401 means the
 * session itself is stale/expired, not that Jev is off, so it signs out
 * rather than masquerading as a guided-mode fallback.
 */
export async function beaconPost<T>(
  route: "search" | "match" | "inbox" | "grade" | "opportunities",
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T | null> {
  if (!beacon.ready) return null;
  const authHeader = getAuthHeader();
  if (!authHeader) {
    signOut();
    return null;
  }
  try {
    const response = await fetch(`/api/beacon/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ perspective: beacon.perspective, ...body }),
      signal,
    });
    if (response.status === 401) {
      signOut();
      return null;
    }
    return response.ok ? ((await response.json()) as T) : null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return null;
  }
}

export const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
