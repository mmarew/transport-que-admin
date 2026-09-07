import { QUEUE_ORG_ADMIN_ROLE } from "../types/queue";

export type AuthFieldKind =
  | "phone"
  | "fullName"
  | "email"
  | "otp"
  | "password"
  | "text";

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
  roleId: QUEUE_ORG_ADMIN_ROLE,
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
      {
        name: "fullName",
        kind: "fullName",
        label: "Full name",
        type: "text",
        required: true,
      },
      {
        name: "phoneNumber",
        kind: "phone",
        label: "Phone number",
        type: "tel",
        placeholder: "+251 9 00 00 00 00",
        required: true,
        defaultValue: "+251",
      },
      {
        name: "email",
        kind: "email",
        label: "Email",
        type: "email",
        required: false,
      },
    ],
  },
  otp: {
    title: "Verify your number",
    submitLabel: "Verify & Continue",
    fields: [
      {
        name: "otp",
        kind: "otp",
        label: "OTP code",
        type: "otp",
        required: true,
      },
    ],
  },
};

// --- Phone helpers (Ethiopia default: +251) ---
const PHONE_MAX_DIGITS = 9;

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("251")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, PHONE_MAX_DIGITS);
  return digits ? `+251${digits}` : "";
}

export function normalizeFieldValue(
  field: AuthFieldConfig,
  value: string,
): string {
  if (field.kind === "phone") return normalizePhone(value);
  return value;
}

// +251 9 22 11 24 80 (country code + 1 digit + pairs)
export function groupPhoneDigits(digits: string): string {
  let d = digits.replace(/\D/g, "");
  if (d.startsWith("251")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  const chunks: string[] = [];
  if (d.length > 0) chunks.push(d.slice(0, 1));
  for (let i = 1; i < d.length; i += 2) {
    chunks.push(d.slice(i, i + 2));
  }
  return chunks.join(" ");
}
