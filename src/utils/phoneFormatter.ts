/**
 * Phone number formatting utilities.
 *
 * Formats Ethiopian local 10-digit phone numbers as:
 *   X-XX-XX-XX-XX  (e.g. 9222411800 -> 9-22-24-11-80)
 *
 * The API always receives the E.164 prefixed version: +251XXXXXXXXX
 */

export const PHONE_MAX_DIGITS = 9;

export const stripNonDigits = (value: string): string => value.replace(/\D/g, "");

/**
 * Strips non-digits, strips leading +251/251 and leading 0, and limits to 9 digits.
 */
export const cleanDigits = (value: string): string => {
  let d = stripNonDigits(value);
  if (d.startsWith("251")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, PHONE_MAX_DIGITS);
};

export const formatPhoneDisplay = (digits: string): string => {
  const d = cleanDigits(digits);
  if (d.length === 0) return "";

  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 1));
  if (d.length > 1) parts.push(d.slice(1, 3));
  if (d.length > 3) parts.push(d.slice(3, 5));
  if (d.length > 5) parts.push(d.slice(5, 7));
  if (d.length > 7) parts.push(d.slice(7, 9));

  return parts.join("-");
};

export const toE164 = (digits: string): string => {
  const cleaned = cleanDigits(digits);
  return cleaned ? `+251${cleaned}` : "";
};

export const fromE164 = (e164: string): string => cleanDigits(e164);

export const isValidPhoneDigits = (digits: string): boolean =>
  cleanDigits(digits).length === 9;

/**
 * Masks a phone number for display on verification/OTP screens.
 * Preserves the prefix (+2519 / +2517) and reveals the last digits (default: 2),
 * masking the middle digits with '*'.
 *
 * Example:
 *   "+251912345678" -> "+2519******78"
 *   "0912345678"    -> "+2519******78"
 */
export const maskPhoneNumber = (phone: string, visibleEndDigits = 2): string => {
  if (!phone) return "";

  const cleaned = cleanDigits(phone);
  if (cleaned.length === PHONE_MAX_DIGITS) {
    const prefix = `+251${cleaned.slice(0, 1)}`;
    const safeEndDigits = Math.max(1, Math.min(visibleEndDigits, 4));
    const suffix = cleaned.slice(-safeEndDigits);
    const maskLen = cleaned.length - 1 - safeEndDigits;
    return `${prefix}${"*".repeat(Math.max(0, maskLen))}${suffix}`;
  }

  const trimmed = phone.trim();
  if (trimmed.length <= visibleEndDigits + 4) {
    return trimmed;
  }
  const startLen = trimmed.startsWith("+") ? 5 : 4;
  const start = trimmed.slice(0, startLen);
  const end = trimmed.slice(-visibleEndDigits);
  const maskCount = Math.max(3, trimmed.length - startLen - visibleEndDigits);
  return `${start}${"*".repeat(maskCount)}${end}`;
};

