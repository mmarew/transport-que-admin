import { api } from "../lib/api";
import {
  QUEUE_ORG_ADMIN_ROLE,
  type LoginResponse,
  type VerifyOtpResponse,
} from "../types/queue";

/**
 * Request a login OTP for an existing user.
 *
 * roleId is deliberately NOT sent. The backend resolves the account's own role
 * from UserRole, so a queue dispatcher (role 12) can sign in here just as a
 * queue org admin (role 11) can. Asserting 11 client-side made every dispatcher
 * fail with "user not found in this role".
 */
export const requestLoginOtp = (phoneNumber: string) =>
  api.post<LoginResponse>("/user/loginUser", {
    phoneNumber,
    roleId: QUEUE_ORG_ADMIN_ROLE,
    statusId: 1,
  });

/** Verify an OTP and receive a JWT token. Role resolved server-side. */
export const verifyOtp = (phoneNumber: string, OTP: string) =>
  api.post<VerifyOtpResponse>("/user/verifyUserByOTP", {
    phoneNumber,
    roleId: QUEUE_ORG_ADMIN_ROLE,
    OTP: Number(OTP),
  });

/**
 * Create a new user account (registration).
 *
 * roleId IS required here — this is the provisioning path that creates a queue
 * org admin, so the role is the thing being created, not something to infer.
 */
export const registerUser = (body: {
  fullName: string;
  phoneNumber: string;
  email?: string | null;
}) =>
  api.post<LoginResponse>("/user/createUser", {
    fullName: body.fullName,
    phoneNumber: body.phoneNumber,
    email: body.email || undefined,
    roleId: QUEUE_ORG_ADMIN_ROLE,
    statusId: 1,
    userRoleStatusDescription:
      "this role is used to manage queue organizations, drivers, and dispatches",
  });
