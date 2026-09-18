import { storeAuth } from "@/lib/auth";
import appAPIs from "@/utils/constant";
import { api } from "./base";
import type {
  RegisterUserArgs,
  RegisterUserResponse,
  RequestOtpArgs,
  RequestOtpResponse,
  VerifyOtpArgs,
  VerifyOtpResponse,
} from "./types";

export const {
  useRequestLoginOtpMutation,
  useVerifyOtpMutation,
  useRegisterUserMutation,
} = api.injectEndpoints({
  endpoints: (builder) => ({
    requestLoginOtp: builder.mutation<RequestOtpResponse, RequestOtpArgs>({
      query: (body) => ({ url: appAPIs.loginAPI, method: "POST", body }),
    }),

    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpArgs>({
      query: (body) => ({ url: appAPIs.verifyOtpAPI, method: "POST", body }),
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          storeAuth({ token: data.token, userData: data.userData });
        } catch {
          // Ignore failed OTP verification; the error is surfaced by the caller.
        }
      },
    }),

    registerUser: builder.mutation<RegisterUserResponse, RegisterUserArgs>({
      query: (body) => ({ url: appAPIs.registerUserAPI, method: "POST", body }),
    }),
  }),
});