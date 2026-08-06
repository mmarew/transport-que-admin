import type { FormEvent } from "react";
import { useAuthFlow, type AuthMode } from "./useAuthFlow";
import { AuthShell } from "./AuthShell";
import { FieldRenderer } from "./fields";
import { authThemes } from "./themes";
import {
  defaultAuthConfig,
  type AuthConfig,
  type DesignName,
} from "../../lib/authConfig";

export function AuthFlow({
  initialMode = "login",
  design = "classic",
  config = defaultAuthConfig,
  branding = { title: "Queue Admin", subtitle: "Dispatch queue management console" },
}: {
  initialMode?: AuthMode;
  design?: DesignName;
  config?: AuthConfig;
  branding?: { title: string; subtitle: string };
}) {
  const {
    mode,
    origin,
    screenConfig,
    values,
    errors,
    setFieldValue,
    submit,
    goTo,
    pendingPhone,
    isPending,
  } = useAuthFlow(config, initialMode);

  const theme = authThemes[design];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <AuthShell design={design} branding={branding}>
      {screenConfig ? (
        <>
          <h2 className={theme.heading}>{screenConfig.title}</h2>
          {mode === "otp" && (
            <p className={`${theme.subtitle} mt-1`}>
              Enter the 6-digit code sent to{" "}
              <span className="font-medium">{pendingPhone}</span>
            </p>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {screenConfig.fields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={values[field.name] ?? field.defaultValue ?? ""}
                onChange={(v) => setFieldValue(field.name, v)}
                error={errors[field.name]}
                theme={theme}
              />
            ))}
            <button type="submit" disabled={isPending} className={theme.button}>
              {isPending ? "Please wait…" : screenConfig.submitLabel}
            </button>

            {mode === "login" && config.register && (
              <p className={theme.switchText}>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => goTo("register")}
                  className={theme.link}
                >
                  Register
                </button>
              </p>
            )}
            {mode === "register" && (
              <p className={theme.switchText}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => goTo("login")}
                  className={theme.link}
                >
                  Login
                </button>
              </p>
            )}
            {mode === "otp" && (
              <button
                type="button"
                onClick={() => goTo(origin)}
                className={`w-full ${theme.switchText} hover:opacity-80`}
              >
                Change phone number
              </button>
            )}
          </form>
        </>
      ) : (
        <p className={`${theme.subtitle} mt-6`}>This screen is not configured.</p>
      )}
    </AuthShell>
  );
}
