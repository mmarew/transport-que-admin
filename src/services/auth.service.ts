import { api } from "../lib/api";
import type { LoginResponse, VerifyOtpResponse } from "../types/queue";

/** Request a login OTP for an existing user */
export const requestLoginOtp = (phoneNumber: string) =>
  api.post<LoginResponse>("/user/loginUser", {
    phoneNumber,
    roleId: 11,
    statusId: 1,
  });

/** Verify an OTP and receive a JWT token */
export const verifyOtp = (phoneNumber: string, OTP: string) =>
  api.post<VerifyOtpResponse>("/user/verifyUserByOTP", {
    phoneNumber,
    roleId: 11,
    OTP: Number(OTP),
  });

/** Create a new user account (registration) */
export const registerUser = (body: {
  fullName: string;
  phoneNumber: string;
  email?: string | null;
}) =>
  api.post<LoginResponse>("/user/createUser", {
    fullName: body.fullName,
    phoneNumber: body.phoneNumber,
    email: body.email || undefined,
    roleId: 11,
    statusId: 1,
    userRoleStatusDescription:
      "this role is used to manage queue organizations, drivers, and dispatches",
  });
