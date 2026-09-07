import { describe, it, expect } from "vitest";
import {
  cleanDigits,
  formatPhoneDisplay,
  toE164,
  fromE164,
  isValidPhoneDigits,
} from "../utils/phoneFormatter";

describe("phoneFormatter utility suite", () => {
  describe("cleanDigits", () => {
    it("preserves 9-digit Ethiopian number without leading zero", () => {
      expect(cleanDigits("911223344")).toBe("911223344");
    });

    it("strips leading zero from 10-digit local number", () => {
      expect(cleanDigits("0911223344")).toBe("911223344");
      expect(cleanDigits("0711223344")).toBe("711223344");
    });

    it("strips 251 country code if present", () => {
      expect(cleanDigits("251911223344")).toBe("911223344");
      expect(cleanDigits("+251911223344")).toBe("911223344");
    });

    it("handles 251 followed by 0", () => {
      expect(cleanDigits("+2510911223344")).toBe("911223344");
    });

    it("caps at 9 digits", () => {
      expect(cleanDigits("9112233445566")).toBe("911223344");
    });
  });

  describe("formatPhoneDisplay", () => {
    it("formats 9 digits into X-XX-XX-XX-XX mask", () => {
      expect(formatPhoneDisplay("911223344")).toBe("9-11-22-33-44");
    });

    it("formats progressively as user types", () => {
      expect(formatPhoneDisplay("9")).toBe("9");
      expect(formatPhoneDisplay("91")).toBe("9-1");
      expect(formatPhoneDisplay("911")).toBe("9-11");
      expect(formatPhoneDisplay("9112")).toBe("9-11-2");
      expect(formatPhoneDisplay("91122")).toBe("9-11-22");
      expect(formatPhoneDisplay("911223")).toBe("9-11-22-3");
      expect(formatPhoneDisplay("9112233")).toBe("9-11-22-33");
      expect(formatPhoneDisplay("91122334")).toBe("9-11-22-33-4");
      expect(formatPhoneDisplay("911223344")).toBe("9-11-22-33-44");
    });

    it("returns empty string when input is empty", () => {
      expect(formatPhoneDisplay("")).toBe("");
    });
  });

  describe("toE164 & fromE164", () => {
    it("produces standard +251XXXXXXXXX", () => {
      expect(toE164("911223344")).toBe("+251911223344");
      expect(toE164("0911223344")).toBe("+251911223344");
      expect(toE164("+251911223344")).toBe("+251911223344");
    });

    it("returns empty string for empty digits", () => {
      expect(toE164("")).toBe("");
    });

    it("fromE164 extracts clean 9 digits", () => {
      expect(fromE164("+251911223344")).toBe("911223344");
      expect(fromE164("0911223344")).toBe("911223344");
    });
  });

  describe("isValidPhoneDigits", () => {
    it("validates exactly 9 digits", () => {
      expect(isValidPhoneDigits("911223344")).toBe(true);
      expect(isValidPhoneDigits("0911223344")).toBe(true);
      expect(isValidPhoneDigits("91122334")).toBe(false);
      expect(isValidPhoneDigits("")).toBe(false);
    });
  });
});
