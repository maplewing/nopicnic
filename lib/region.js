// The Meta pixel and Conversions API only run for visitors outside the EEA, the
// UK and Switzerland. Running them elsewhere would mean processing personal data
// for advertising without prior consent, which GDPR and the ePrivacy Directive
// don't allow without a banner we've chosen not to build.

// EEA (EU 27 + Iceland, Liechtenstein, Norway) + UK + Switzerland.
export const CONSENT_REQUIRED_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB", "CH",
]);

export const REGION_COOKIE = "npp-region";

export function isConsentRequiredCountry(country) {
  return CONSENT_REQUIRED_COUNTRIES.has(String(country || "").toUpperCase());
}

// Client-side check. Reads the cookie the middleware sets from the visitor's IP,
// and falls back to the browser's own time zone when that header isn't there —
// local dev, or any host that isn't Vercel. Either signal suppresses tracking.
export function trackingAllowed() {
  if (typeof window === "undefined") return false;

  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${REGION_COOKIE}=`))
    ?.split("=")[1];

  if (cookie === "eu") return false;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/^(Europe|Atlantic\/(Canary|Madeira|Faroe|Reykjavik))/.test(tz)) return false;
  } catch {
    // Intl unavailable — fall through to the cookie's verdict.
  }

  // Unknown region with no EU signal: the middleware marks everything it sees,
  // so an absent cookie means a non-Vercel host rather than an EU visitor.
  return true;
}
