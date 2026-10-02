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
 * Reads `key` from each candidate source in order and returns the first value
 * that is a real UUID. Accepting only UUIDs means a stray display name or
 * numeric index can never be mistaken for an id and sent to the API.
 */
export const findUUIDIn = (
  key: string,
  ...sources: unknown[]
): string | undefined => {
  for (const source of sources) {
    const value = asRecord(source)[key];
    if (isUUID(value)) return value;
  }
  return undefined;
};

export { isUUID };