# Frontend Refactor Plan — Split Multi-Job Files & Minimize Code Per Page

> Rev 1.1 — **industry hardening applied** (verification, units of work, API contracts, CSS policy, acceptance metrics, performance, risk ordering).
> Status: **approved, ready to execute.** Behavior-preserving refactor only — no logic changes.
> Guardrails on every file: `npm run build` ✓ · 77 unit tests ✓ · `eslint` on touched files (0 new) ✓ · e2e ✓.

## Guiding concept

A file is **single-job** when it does exactly one of: **view / create / update / delete**.
It is **multi-job** when it does 2+ of those, or mixes data-fetching + forms + lists.

`QueueDashboardPage.tsx` is the **template**: 680 → 179 lines. It now is pure composition —
two hooks carry logic (`useOrgList`, `useActiveOrg`), six single-purpose presentational
components do one job each, and the page only orchestrates.

## File census (all files > 300 lines)

Multi-job files and their split targets. The **Target** column is *guidance* — enforcement is via the Acceptance metric in [Working agreement](#working-agreement--industry-hardening).

| File | Lines | Jobs today | Split into | Target |
|---|---|---|---|---|
| CreateOrderModal | 985 | create + 2×geocode + form + selects | `Modal`, `LocationSearchField`×2, `usePhotonSearch`, `VehicleTypeSelect`, `RequestTypeCard` | ~300 |
| SettingsPage | 778 | fetch + profile + toggles + lang + delete + dual-UI | `ProfileForm` (mobile+desktop dedupe), `PreferenceToggles`, `LanguagePicker`, `DangerZone`, `DeleteAccountModal`, `usePersistedToggle` | ~250 |
| DriverBidsModal | 743 | list + search + sort + limit + accept + modal | `BidRow`, `BidsToolbar`, `OrderSummaryCard`, `BidEmptyState` | ~200 |
| OrdersTable | 727 | view + sort + expand + batch + actions | `SingleOrderRow`, `BatchMasterRow`, `BatchSubRow`, `RouteExpandable`, `OrderIdBadge`, `OrderActionCluster` | ~250 |
| ReportsPage | 529 | fetch N+1 + metrics + charts + list + pagination | `useReportsMetrics`, `KpiCards`, `DonutChart`, `BarChart`, `ReportList` | ~250 |
| OrganizationsPage | 507 | ≈ dashboard list + create + approve | reuse `OrgListToolbar`/`OrgStatusTable`/`OrgListPagination`/`OrgListState` + `useOrgList` | ~120 |
| SetupOrganization | 505 | create + org-gate + photon + layout | `LocationAutocomplete`, `AuthLayout`, `SubmitButton` | ~220 |
| QueueBoard | 493 | socket + tabs + cards + 5 modals | `useQueueSocket`, `QueueCard`, `QueueBoardModals`, `normalizeQueuesMap`→utils | ~220 |
| OrdersMobileCards | 474 | mirror of OrdersTable | **share** the Orders components (same rows/actions) | ~150 |
| QueueOrgManagePage | 466 | 3 fetches + profile form + approve/members + board | `OrgProfileForm`, `MembersTable`, `AdminApprovalActions`, `StatusBadge` | ~200 |
| ShipperRequestsModal | 439 | view + accept + list + nav | `RequestGrid`, `DriverRequestList` + `AcceptButton`, `KeyValueGrid` | ~180 |
| DispatchModal | 434 | fetch + select + view + dispatch | `OrderSelectDropdown`, `OrderSummaryCard`, `InfoCard` | ~180 |
| OrdersPage | 403 | fetch + socket + map + CRUD + 5 modals | `useOrdersView` hook, socket effect | ~180 |
| OrgQueueDetailsModal | 369 | view + aggregate + dual list + nav | `MetricCards`, `DriverRow/Card`, `OrgHeader` | ~180 |
| QueueTable | 380 | dual table + expand + modal bridge | `DriverRow`, `StatusCell`, `EntryList`, `buildShipperRequestDetail` | ~120 |
| CreateOrgModal | 347 | create + photon + form | reuse `LocationAutocomplete`, `OrgTypeSelect` | ~140 |
| VerifyOtp | 333 | OTP + resend + layout | reuse `OtpInputs`, `AuthLayout`, `SubmitButton` | ~160 |
| CheckinModal | 324 | search + select + preview + checkin | `DriverSearchSelect`, `PositionCard` | ~150 |

Single-job (leave, maybe nudge): `OrdersEditModal` (175), `OverrideModal` (172),
`CustomSelect`, `PhoneNumberInput`, `DatePickerField`, `Login`, `Register`, `Auth`.
`ConfirmCancel` (170) is delete + socket → small multi; fold into `EntrySummaryCards`.

## Cross-file building blocks (build first — kills the most duplication)

1. **`Modal` (one reusable component, not shell+header)** — 10 modal files re-derive portal + overlay + dual headers + close + focus-trap across CSS families (`com-*`, `qm-*`, `dm-*`, `org-*`, `orders-*`). One component absorbs all of it via `variant`/`size`/`className` (see API contract under Phase A).
2. **`useClickOutside`** — implemented 5–7×.
3. **`LocationAutocomplete` + `usePhotonSearch`** — CreateOrderModal, CreateOrgModal, SetupOrganization (3 near-identical copies).
4. **`AuthLayout`** — hero + LanguageSelector + mobile hero; duplicated in Login, Register, SetupOrganization, VerifyOtp.
5. **Consolidate phone input** (3 near-twins: `PhoneNumberInput`, `ConstantPhoneInput`, `GroupedPhoneInput`) and **OTP input** (`VerifyOtp` duplicates `fields.tsx.OtpInputs`).
6. **Small shared UI** — `InfoCard`, `StatusChip` + `formatStatusLabel`, `KeyValueGrid`, `EntrySummaryCards` + `resolveEntryUniqueId`, `SubmitButton withLoading` — each repeated 4–6×.
7. **Orders primitives** — `OrderActionCluster` (4×), `RouteExpandable` (4×), `OrderIdBadge` (2×), `OrderEmptyState` (2×), `renderVehicleType`.
8. **utils** — driver-name/phone normalizers (`normalizeQueueEntry`), `formatDate`, `toNumber`, `normalizeQueuesMap`.

## Execution phases

### Phase A — Foundation (in-place swaps, no behavior change)
1. `src/components/ui/Modal.tsx` — single reusable `Modal` (decision: one component, not shell+header).

   **API contract (written before code, per agreement #3):**
   ```tsx
   interface ModalProps {
     open: boolean;
     onClose: () => void;
     title?: string | ReactNode;        // desktop header <h2>
     subtitle?: ReactNode;              // desktop header <p>
     mobileHeaderTitle?: string;        // defaults to title
     children: ReactNode;               // body content
     footer?: ReactNode;                // optional action row (rendered inside container)
     variant?: "com" | "qm" | "dm" | "org" | "orders"; // CSS family → prefixes classes
     size?: "sm" | "md" | "lg" | "xl";  // maps to existing size modifiers (e.g. orders-modal-content--sm); undefined = untouched
     containerClassName?: string;       // extra container classes (no foreign CSS imports — className/variant only)
     role?: "dialog" | "alertdialog";
     hideCloseButton?: boolean;
     closeButtonLabel?: string;         // aria-label, falls back to t("common.closeModal")
   }
   ```
   Internals: `createPortal` + overlay click-to-close (stopPropagation on container) + `useModalA11y` focus trap + optional `MobileHeader` in mobile header slot. **No behavior changes** on adoption: each modal passes its existing overlay/container classes via `variant`/`containerClassName`, keeping current CSS intact.
2. `src/hooks/useClickOutside.ts`
3. `src/components/ui/LocationAutocomplete.tsx` + `src/hooks/usePhotonSearch.ts`
4. `src/components/auth/AuthLayout.tsx`
5. OTP + phone consolidation (one `OtpInputs`, one configurable `PhoneInput`; retire twins)
6. `InfoCard` / `StatusChip` / `KeyValueGrid` / `SubmitButton` / `EntrySummaryCards` + `resolveEntryUniqueId`
7. utils: `normalizeQueueEntry`, `formatDate`, `toNumber`, `normalizeQueuesMap`
8. Orders primitives: `OrderActionCluster` / `RouteExpandable` / `OrderIdBadge` / `OrderEmptyState`

### Phase B — File-by-file (risk-ordered: most coupled first, while mistakes are cheapest to fix)
CreateOrderModal → SettingsPage → DriverBidsModal → OrdersTable + OrdersMobileCards
→ ReportsPage → SetupOrganization → QueueBoard → DispatchModal → ShipperRequestsModal
→ OrgQueueDetailsModal → QueueTable → CheckinModal → CreateOrgModal → QueueOrgManagePage → VerifyOtp.

`CreateOrderModal` (985) is the apex-risk item — do it in sub-steps, verifying after each:
1. Adopt shared `Modal` + rewrite the modal shell (smallest possible diff; keep form untouched)
2. `VehicleTypeSelect` + `RequestTypeCard`
3. `usePhotonSearch` + `LocationSearchField` (both origin + destination copies at once)
4. Assembly; enforce acceptance metric.

### Phase C — Consolidation
- **OrganizationsPage**: compose dashboard's `OrgListToolbar` / `OrgStatusTable` / `OrgListPagination` / `OrgListState` + `useOrgList`; keep page-specific create/approve/manage wiring.
- **Delete orphaned** `AuthFlow.tsx` + `useAuthFlow` (zero references confirmed).
- Optional: `useOrdersView` hook for OrdersPage's filter/sort/page/map pipeline.

## Working agreement (industry hardening)

1. **Verification — e2e covers only `/login` today.** Every unit of work must be proven, not eyeballed:
   - Manual visual smoke of the touched route is **part of the DoD, not optional**.
   - Where a page has stable selectors (dashboard orgs table, create-order modal open, settings toggles persist), add a **Playwright probe** (cheap, < 1 s, independent, composes into the suite). Probes are scaffolding, not gold-plating.
   - `npm run build` + `npm test` (77) + eslint (0 new on touched files) + `npm run test:e2e` run on every unit.
2. **Unit of work & rollback.** Each Phase A item and each Phase B file = **one reversible unit**.
   - If commits are unheld: one commit per unit, conventional subject (`refactor: …`); **no mixed feature+refactor commits**.
   - If commits stay on hold: each unit exists as a clean staged/diffable slice that can be reverted on its own.
3. **Component API contract written before code.** Every new component must have its props interface defined upfront in the plan/PR body: controlled (`value`/`onChange`) vs uncontrolled, defaults, optional `onX?: () => void` callbacks, no `any` escape hatches. Prevents three files inventing three conventions.
4. **CSS ownership — behavior first.** JSX extraction keeps existing classes verbatim (`com-*`, `qm-*`, `dm-*`, `org-*`); a component receives `className`/`variant` props instead of importing foreign CSS. CSS class *normalization* is a separate follow-up pass (Phase D), explicitly out of scope here.
5. **Acceptance metric (gate, not target).** A file passes when all hold:
   - file ≤ target + 15%,
   - no duplicated JSX/logic block > 10 lines remains inside it,
   - every extracted sub-component lives in a file ≤ 200 lines (exception: thin hooks/utils accumulators).
6. **Performance — no premature memoization.** Lists are small (< 100 rows, 8/page). Do not add `React.memo`/`useMemo` during extraction; preserve existing memos verbatim. Re-optimize only if a measurement (React DevTools / Profiler) says we regressed.
7. **Humans in the loop.** Single owner (this repo); every unit ends with an explicit approval checkpoint; visual smoke is a blocker for sign-off, not a nicety.

## Duplication hot-spots (reference)

- Photon geocoding ×3, modal shells ×10, outside-click ×5–7, icon-circle InfoCard ×5,
  queue entry id fallback ×2, status chip/pill ×4, driver field-name fallbacks ×4,
  date/number formatting ×3, desktop/mobile dual tables ×2, order summary grids ×2,
  custom dropdown selects ×5, waiting aggregation ×2.
- Two parallel auth flows exist: `Auth.tsx` (routed) vs `AuthFlow.tsx` (orphan — Phase C removes it).
- `OrganizationsPage` ≈ `QueueDashboardPage` list view (same columns/actions except page-specific ones).

## Definition of done per file
- [ ] Rendered behavior identical (no logic/state changes)
- [ ] Manual visual smoke of the touched route (blocker, per agreement #1/#7)
- [ ] Playwright probe added where the page has stable selectors
- [ ] Acceptance metric met: size ≤ target +15%, no >10-line duplicate block, sub-components ≤ 200 lines
- [ ] Props/API contract documented for every new component
- [ ] `npm run build` passes
- [ ] `npm test` → 77/77
- [ ] `eslint` on touched files → 0 new problems
- [ ] `npm run test:e2e` → 3/3
- [ ] Reversible unit: clean single commit or staged slice (agreement #2)