import { AdminRole } from "@school-voting/shared";

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  exp: number;
}

/** Decodes the JWT payload for UI purposes only (show/hide controls) — never trusted as a security boundary; the API enforces roles server-side regardless of what the client displays. */
export function decodeAdminToken(token: string): AdminTokenPayload | null {
  try {
    const [, payloadB64] = token.split(".");
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: AdminTokenPayload): boolean {
  return payload.exp * 1000 < Date.now();
}
