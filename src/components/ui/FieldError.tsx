import React from "react";
import { AlertCircle } from "lucide-react";

interface FieldErrorProps {
  message?: string | null;
  align?: "left" | "center" | "right";
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  message,
  align = "left",
  className = "",
}) => {
  if (!message) return null;

  return (
    <p
      className={`field-error-msg ${align === "center" ? "center" : ""} ${className}`}
      role="alert"
    >
      <AlertCircle size={14} className="flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
};

export default FieldError;
