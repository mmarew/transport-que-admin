/**
 * Typed lookup for ids buried inside the loosely-typed order payloads that
 * reach the bid UI.
 *
 * `OrderDisplayItem` and its `rawItem` carry backend shapes that are not
 * modelled in `OrdersTypes`, so the id of the underlying shipper request has
 * to be read defensively. Doing that with `as any` silences the compiler while
 * still permitting any property access; these helpers take `unknown` and walk
 * the shape safely instead, so a renamed backend field degrades to `undefined`
 * rather than to a type assertion the compiler cannot check.
 */

/** Narrows anything to an indexable record without asserting its shape. */
export const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const isUUID = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

/**
 * Extracts a 36-character UUID from a value (even if suffixed with e.g. "-truck-1").
 */
export const extractUUID = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const match = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : undefined;
};

/**
 * Reads `key` from each candidate source in order and returns the first value
 * that contains a real UUID. Automatically strips any client-side suffixes
 * like "-truck-1".
 */
export const findUUIDIn = (
  keyOrKeys: string | string[],
  ...sources: unknown[]
): string | undefined => {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  for (const source of sources) {
    const record = asRecord(source);
    for (const key of keys) {
      const value = record[key];
      const uuid = extractUUID(value);
      if (uuid) return uuid;
    }
  }
  return undefined;
};

/**
 * Reads candidate key(s) from sources and returns the first non-empty string or numeric id.
 */
export const findIdIn = (
  keyOrKeys: string | string[],
  ...sources: unknown[]
): string | undefined => {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  for (const source of sources) {
    const record = asRecord(source);
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
      if (typeof value === "number" && !Number.isNaN(value)) {
        return String(value);
      }
    }
  }
  return undefined;
};

/**
 * Tries UUID lookup first, then falls back to any non-empty string/number id.
 */
export const findFirstValidId = (
  keyOrKeys: string | string[],
  ...sources: unknown[]
): string | undefined => {
  return findUUIDIn(keyOrKeys, ...sources) || findIdIn(keyOrKeys, ...sources);
};

/**
 * Extracts any company organization UUIDs from sources (targetCompanyUniqueId, companyUniqueId).
 * These must NEVER be treated as order UUIDs or bid UUIDs.
 */
export const extractCompanyUUIDs = (...sources: unknown[]): string[] => {
  const compKeys = [
    "targetCompanyUniqueId",
    "target_company_unique_id",
    "companyUniqueId",
    "company_unique_id",
  ];
  const results: string[] = [];
  for (const source of sources) {
    const record = asRecord(source);
    for (const k of compKeys) {
      const uuid = extractUUID(record[k]);
      if (uuid && !results.includes(uuid)) results.push(uuid);
    }
    const targetComp = asRecord(record.targetCompany);
    for (const k of ["uniqueId", "companyUniqueId", "id"]) {
      const uuid = extractUUID(targetComp[k]);
      if (uuid && !results.includes(uuid)) results.push(uuid);
    }
  }
  return results;
};

/**
 * Reads candidate key(s) from sources and returns the first UUID that is NOT in the exclude list.
 */
export const findUUIDInExcluding = (
  keyOrKeys: string | string[],
  excludeList: Array<string | undefined | null>,
  ...sources: unknown[]
): string | undefined => {
  const excludeSet = new Set(
    excludeList
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim().toLowerCase()),
  );
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  for (const source of sources) {
    const record = asRecord(source);
    for (const key of keys) {
      const value = record[key];
      const uuid = extractUUID(value);
      if (uuid && !excludeSet.has(uuid.toLowerCase())) return uuid;
    }
  }
  return undefined;
};

export { isUUID };