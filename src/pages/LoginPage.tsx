import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { requestLoginOtp, verifyOtp, getApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket, disconnectSocket } from "../lib/socket";

export function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);

  const sendOtp = useMutation({
    mutationFn: () => requestLoginOtp(phoneNumber),
    onSuccess: () => {
      toast.success("OTP sent via SMS");
      setOtpRequested(true);
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const submitOtp = useMutation({
    mutationFn: () => verifyOtp(phoneNumber, otp),
    onSuccess: (res) => {
      const { token, userData } = res.data;
      setAuth({ token, userData });
      disconnectSocket();
      connectSocket({ phoneNumber: userData.phoneNumber });
      toast.success(`Welcome, ${userData.fullName}`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const handleSendOtp = (e: FormEvent) => {
    e.preventDefault();
    sendOtp.mutate();
  };

  const handleSubmitOtp = (e: FormEvent) => {
    e.preventDefault();
    submitOtp.mutate();
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-800">Queue Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Dispatch queue management console</p>

        {!otpRequested ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251912345678"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={sendOtp.isPending}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sendOtp.isPending ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitOtp} className="mt-6 space-y-4">
            <p className="text-sm text-slate-500">
              Enter the 6-digit code sent to <span className="font-medium">{phoneNumber}</span>
            </p>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700">
                OTP code
              </label>
              <input
                id="otp"
                type="text"
                required
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="101010"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitOtp.isPending}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitOtp.isPending ? "Verifying…" : "Verify & Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setOtpRequested(false)}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
