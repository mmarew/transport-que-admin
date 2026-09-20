import React from "react";
import { Loader2 } from "lucide-react";

export interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}

export function SubmitButton({
  isLoading = false,
  loadingText,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: SubmitButtonProps) {
  const variantClass = `btn-${variant}`;

  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`btn ${variantClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="btn-inner-flex" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <Loader2 size={16} className="animate-spin" />
          <span>{loadingText || children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default SubmitButton;
