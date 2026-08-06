import { z } from "zod";

export const uuidSchema = z.string().uuid({ message: "Invalid UUID" });

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number is required")
    .max(20, "Phone number too long"),
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

export type CheckinFormValues = z.infer<typeof checkinSchema>;
export type DispatchFormValues = z.infer<typeof dispatchSchema>;
export type OverrideFormValues = z.infer<typeof overrideSchema>;
