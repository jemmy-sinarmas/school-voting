/**
 * Builds a case-insensitive "ends with an allowed domain" regex from a
 * comma-separated ALLOWED_EMAIL_DOMAINS env value, e.g. "s.unikl.edu.my".
 * Shared so the API (authoritative check) and clients (inline hint) never drift apart.
 */
export function buildAllowedEmailDomainRegex(domainsCsv: string): RegExp {
  const domains = domainsCsv
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (domains.length === 0) {
    throw new Error("ALLOWED_EMAIL_DOMAINS must contain at least one domain");
  }

  return new RegExp(`@(${domains.join("|")})$`, "i");
}

export function isAllowedUniversityEmail(email: string, domainsCsv: string): boolean {
  return buildAllowedEmailDomainRegex(domainsCsv).test(email.trim().toLowerCase());
}
