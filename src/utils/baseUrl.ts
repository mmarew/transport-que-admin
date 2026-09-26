/**
 * Shared API base URL resolver used by both the RTK Query layer
 * (`@/lib/redux/api/base.ts`) and the legacy axios layer (`@/lib/api.ts`).
 *
 * ─────────────────────────────────────────────────────────────────────
 * HOW THE URL GETS CHOSEN (Vite env at compile time)
 * ─────────────────────────────────────────────────────────────────────
 * The app never picks dev/prod at runtime. The *command* decides:
 *
 *   `npm run dev`            → mode = "development"
 *   `npm run build`          → mode = "production"
 *
 * Based on the mode, Vite loads the env files and merges them (last
 * loaded = highest priority):
 *
 *   .env                      ← always loaded (base, prod defaults)
 *   .env.development          ← only in dev mode  → OVERRIDES .env → dev API
 *   .env.production           ← only in build mode → overrides .env → prod API
 *
 * The winning value for VITE_API_BASE_URL is statically substituted into
 * every `import.meta.env.VITE_API_BASE_URL` occurrence in the bundle
 * (that is why it is "baked in" and why editing an env file requires a
 * re-build / dev-server restart).
 *
 * Resolution priority inside this function:
 *   VITE_API_BASE_URL → VITE_API_URL → "/api" (same-origin dev-server proxy).
 *
 * The result is always normalized to end in `/api` (trailing "/" stripped).
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