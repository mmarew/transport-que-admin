import { ROLE_QUEUE_ORG_ADMIN } from "../types/queue";

export type AuthFieldKind = "phone" | "fullName" | "email" | "otp" | "password" | "text";

export type AuthFieldType = "text" | "tel" | "email" | "otp" | "password";

export interface AuthFieldConfig {
  /** Custom input name — whatever you want submitted, e.g. "otp", "username". */
  name: string;
  /** Semantic role the flow logic reads (phone/otp/fullName/email). */
  kind: AuthFieldKind;
  label: string;
  type: AuthFieldType;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}

export interface AuthScreenConfig {
  title: string;
  fields: AuthFieldConfig[];
  submitLabel: string;
}

export interface AuthConfig {
  roleId: number;
  login: AuthScreenConfig;
  register?: AuthScreenConfig;
  otp: AuthScreenConfig;
}

export const DESIGN_NAMES = ["classic", "split", "glass", "minimal"] as const;
export type DesignName = (typeof DESIGN_NAMES)[number];

export const defaultAuthConfig: AuthConfig = {
  roleId: ROLE_QUEUE_ORG_ADMIN,
  login: {
    title: "Sign in",
    submitLabel: "Send OTP",
    fields: [
      {
        name: "phoneNumber",
        kind: "phone",
        label: "Phone number",
        type: "tel",
        placeholder: "+251 9 00 00 00 00",
        required: true,
        defaultValue: "+251",
      },
    ],
  },
  register: {
    title: "Create account",
    submitLabel: "Create account",
    fields: [
      { name: "fullName", kind: "fullName", label: "Full name", type: "text", required: true },
      {
        name: "phoneNumber",
        kind: "phone",
        label: "Phone number",
        type: "tel",
        placeholder: "+251 9 00 00 00 00",
        required: true,
        defaultValue: "+251",
      },
      { name: "email", kind: "email", label: "Email", type: "email", required: false },
    ],
  },
  otp: {
    title: "Verify your number",
    submitLabel: "Verify & Continue",
    fields: [
      { name: "otp", kind: "otp", label: "OTP code", type: "otp", required: true },
    ],
  },
};

// --- Phone helpers (Ethiopia default: +251) ---
const PHONE_MAX_DIGITS = 12;

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits.startsWith("251")) digits = `251${digits}`;
  digits = digits.slice(0, PHONE_MAX_DIGITS);
  return `+${digits}`;
}

export function normalizeFieldValue(field: AuthFieldConfig, value: string): string {
  if (field.kind === "phone") return normalizePhone(value);
  return value;
}

// +251 9 22 11 24 80 (country code + 1 digit + pairs)
export function groupPhoneDigits(digits: string): string {
  const d = digits.startsWith("251") ? digits : `251${digits}`;
  const rest = d.slice(3);
  const chunks: string[] = [];
  if (rest.length > 0) chunks.push(rest.slice(0, 1));
  for (let i = 1; i < rest.length; i += 2) {
    chunks.push(rest.slice(i, i + 2));
  }
  return chunks.join(" ");
}
