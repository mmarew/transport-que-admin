import { z } from "zod";
import { QUEUE_ORG_TYPES } from "../types/queue";

export const uuidSchema = z.string().uuid({ message: "Invalid UUID" });

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number is required")
    .max(20, "Phone number too long"),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  phoneNumber: z
    .string()
    .min(12, "Phone number is required")
    .max(20, "Phone number too long"),
  email: z.email({ message: "Invalid email address" }).optional().or(z.literal("")),
});

export const otpSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const checkinSchema = z.object({
  vehicleDriverUniqueId: uuidSchema,
  queueNumber: z.number().int().min(1).optional(),
});

export const dispatchSchema = z.object({
  shipperRequestUniqueId: uuidSchema.optional(),
});

export const overrideSchema = z.object({
  queueNumber: z.number().int().min(1, "Queue number must be ≥ 1"),
  reason: z.string().max(500).optional(),
});

export const queueOrgProfileSchema = z.object({
  queueOrganizationName: z
    .string()
    .trim()
    .min(1, "Queue organization name is required")
    .max(255, "Name too long"),
  queueOrganizationType: z.enum(QUEUE_ORG_TYPES),
  queueOrganizationPhone: z.string().max(20, "Phone too long").optional().or(z.literal("")),
  queueOrganizationAddress: z.string().max(500, "Address too long").optional().or(z.literal("")),
  latitude: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= -90 && Number(v) <= 90), {
      message: "Latitude must be a number between -90 and 90",
    }),
  longitude: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= -180 && Number(v) <= 180), {
      message: "Longitude must be a number between -180 and 180",
    }),
});

export const createQueueOrgSchema = z.object({
  queueOrganizationName: z
    .string()
    .trim()
    .min(1, "Queue organization name is required")
    .max(255, "Name too long"),
  queueOrganizationType: z.enum(QUEUE_ORG_TYPES),
  queueOrganizationPhone: z.string().max(20, "Phone too long").optional().or(z.literal("")),
  queueOrganizationAddress: z
    .string()
    .trim()
    .min(1, "Address is required"),
  latitude: z
    .string()
    .min(1, "Latitude is required")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= -90 && Number(v) <= 90, {
      message: "Latitude must be a number between -90 and 90",
    }),
  longitude: z
    .string()
    .min(1, "Longitude is required")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= -180 && Number(v) <= 180, {
      message: "Longitude must be a number between -180 and 180",
    }),
});

export type CreateQueueOrgFormValues = z.infer<typeof createQueueOrgSchema>;

export type CheckinFormValues = z.infer<typeof checkinSchema>;
export type DispatchFormValues = z.infer<typeof dispatchSchema>;
export type OverrideFormValues = z.infer<typeof overrideSchema>;
export type QueueOrgProfileFormValues = z.infer<typeof queueOrgProfileSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
