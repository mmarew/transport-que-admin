import { z } from "zod";
import { QUEUE_ORG_TYPES } from "../types/queue";

export const uuidSchema = z.string().uuid({ message: "Invalid UUID" });

/** Strip HTML tags from a string */
const stripTags = (v: string) => v.replace(/<[^>]*>/g, "");
/** Remove non-printable control characters */
const stripCtrl = (v: string) => v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
/** Sanitize general text: strip tags, control chars, collapse whitespace */
const sanitizeText = (v: string) =>
  stripCtrl(stripTags(v)).replace(/[ \t]+/g, " ").trim();
/** Sanitize email: strip tags/control chars, remove spaces, lowercase */
const sanitizeEmail = (v: string) =>
  stripCtrl(stripTags(v)).replace(/\s/g, "").toLowerCase();


export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number is required")
    .max(20, "Phone number too long")
    .transform((v) => v.replace(/[^\d+\-()\ ]/g, "").trim()),
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name too long")
    .transform(sanitizeText),
  phoneNumber: z
    .string()
    .min(12, "Phone number is required")
    .max(20, "Phone number too long")
    .transform((v) => v.replace(/[^\d+\-()\ ]/g, "").trim()),
  email: z
    .string()
    .transform(sanitizeEmail)
    .pipe(z.union([z.email({ message: "Invalid email address" }), z.literal("")]))
    .optional()
    .or(z.literal("")),
});

export const setupOrgSchema = z.object({
  queueOrganizationName: z
    .string()
    .min(1, "Organization name is required")
    .max(255, "Name too long")
    .transform(sanitizeText),
  queueOrganizationType: z.enum(QUEUE_ORG_TYPES, {
    message: "Please select an organization type",
  }),
  queueOrganizationPhone: z
    .string()
    .max(20, "Phone too long")
    .transform((v) => v.replace(/[^\d+\-()\ ]/g, "").trim())
    .optional()
    .or(z.literal("")),
  queueOrganizationAddress: z
    .string()
    .min(1, "Organization address is required")
    .max(500, "Address too long")
    .transform(sanitizeText),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const checkinSchema = z.object({
  vehicleDriverUniqueId: uuidSchema,
  queueNumber: z.number().int().min(1).optional(),
});

export const dispatchSchema = z.object({
  shipperRequestUniqueId: uuidSchema.optional(),
});

export const createOrderSchema = z
  .object({
    shipperPhoneNumber: z
      .string()
      .trim()
      .min(10, "Shipper phone number is required"),
    shippableItemName: z.string().trim().min(1, "Item name is required"),
    shippableItemQtyInQuintal: z
      .number({ message: "Quantity must be a number" })
      .positive("Quantity must be greater than 0"),
    shippingCost: z
      .number({ message: "Shipping cost must be a number" })
      .nonnegative("Shipping cost cannot be negative"),
    shippingDate: z.string().min(1, "Shipping date is required"),
    deliveryDate: z.string().min(1, "Delivery date is required"),
    numberOfVehicles: z
      .number({ message: "Number of vehicles must be a number" })
      .int("Must be a whole number")
      .min(1, "At least 1 vehicle"),
    requestMode: z.enum(["individual_target", "company_target"]),
    vehicleTypeUniqueId: uuidSchema,
    originDescription: z.string().trim().min(1, "Origin place is required"),
    originLatitude: z
      .string()
      .trim()
      .min(1, "Origin latitude is required")
      .refine((v) => Number.isFinite(Number(v)) && Number(v) >= -90 && Number(v) <= 90, {
        message: "Latitude must be between -90 and 90",
      }),
    originLongitude: z
      .string()
      .trim()
      .min(1, "Origin longitude is required")
      .refine((v) => Number.isFinite(Number(v)) && Number(v) >= -180 && Number(v) <= 180, {
        message: "Longitude must be between -180 and 180",
      }),
    destinationDescription: z.string().trim().min(1, "Destination place is required"),
    destinationLatitude: z
      .string()
      .trim()
      .min(1, "Destination latitude is required")
      .refine((v) => Number.isFinite(Number(v)) && Number(v) >= -90 && Number(v) <= 90, {
        message: "Latitude must be between -90 and 90",
      }),
    destinationLongitude: z
      .string()
      .trim()
      .min(1, "Destination longitude is required")
      .refine((v) => Number.isFinite(Number(v)) && Number(v) >= -180 && Number(v) <= 180, {
        message: "Longitude must be between -180 and 180",
      }),
  })
  .refine((v) => v.deliveryDate >= v.shippingDate, {
    message: "Delivery date cannot be before shipping date",
    path: ["deliveryDate"],
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
export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
export type OverrideFormValues = z.infer<typeof overrideSchema>;
export type QueueOrgProfileFormValues = z.infer<typeof queueOrgProfileSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type SetupOrgFormValues = z.infer<typeof setupOrgSchema>;
