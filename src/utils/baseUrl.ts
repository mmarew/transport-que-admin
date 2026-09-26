/**
 * Shared API base URL resolver used by both the RTK Query layer
 * (`@/lib/redux/api/base.ts`) and the legacy axios layer (`@/lib/api.ts`).
 *
 * The URL comes from Vite env, injected at compile time from `import.meta.env`:
 *   ─ `.env`             → production (`vite build`)  — app.dynamicsroute.tech
 *   ─ `.env.development` → dev        (`vite dev`)    — dev.dynamicsroute.tech
 * Priority: VITE_API_BASE_URL → VITE_API_URL → "/api".
 *
 * It always returns a URL ending in `/api` (blank trailing "/" stripped).
 */
export function getBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "/api";
  if (!raw) return "/api";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}