/**
 * Phone number formatting utilities.
 *
 * Formats Ethiopian local 10-digit phone numbers as:
 *   X-XX-XX-XX-XX  (e.g. 9222411800 -> 9-22-24-11-80)
 *
 * The API always receives the E.164 prefixed version: +251XXXXXXXXX
 */

export const PHONE_MAX_DIGITS = 10;

export const stripNonDigits = (value: string): string => value.replace(/\D/g, "");

export const formatPhoneDisplay = (digits: string): string => {
  const d = digits.slice(0, PHONE_MAX_DIGITS);
  if (d.length === 0) return "";

  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 1));
  if (d.length > 1) parts.push(d.slice(1, 3));
  if (d.length > 3) parts.push(d.slice(3, 5));
  if (d.length > 5) parts.push(d.slice(5, 7));
  if (d.length > 7) parts.push(d.slice(7, 10));

  return parts.join("-");
};

export const toE164 = (digits: string): string => `+251${digits}`;

export const fromE164 = (e164: string): string =>
  stripNonDigits(e164.replace(/^\+251/, ""));

export const isValidPhoneDigits = (digits: string): boolean =>
  /^\d{9,10}$/.test(digits);
