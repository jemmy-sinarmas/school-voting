export interface StudentTokenPayload {
  sub: string;
  email: string;
  exp: number;
}

/** Decoded for UI purposes only (e.g. showing the student's email) — never a security boundary; the API enforces auth server-side regardless of client state. */
export function decodeStudentToken(token: string): StudentTokenPayload | null {
  try {
    const [, payloadB64] = token.split(".");
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: StudentTokenPayload): boolean {
  return payload.exp * 1000 < Date.now();
}
