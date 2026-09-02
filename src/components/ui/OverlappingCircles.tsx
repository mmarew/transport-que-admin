import { ChevronLeft } from "lucide-react";
import React, { type ReactNode } from "react";
import ellipse24 from "../../assets/Ellipse_24.svg";
import ellipse25 from "../../assets/Ellipse_25.svg";
import "../../styles/auth.css";

interface OverlappingCirclesProps {
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  onBack?: () => void;
}

export const OverlappingCircles: React.FC<OverlappingCirclesProps> = ({
  className = "",
  title,
  subtitle,
  children,
  onBack,
}) => {
  return (
    <div className={`otp-header-wrapper ${className}`}>
      {/* Background circles */}
      <div className="overlapping-circles-container">
        <img
          src={ellipse25}
          alt="Background Circle Right"
          className="circle-right"
        />
        <img
          src={ellipse24}
          alt="Background Circle Left"
          className="circle-left"
        />
      </div>

      {/* Foreground content */}
      <div className="otp-header-content">
        {onBack && (
          <button
            type="button"
            className="otp-back-btn"
            onClick={onBack}
            aria-label="Go back"
            style={{ position: "relative", zIndex: 1 }}
          >
            <ChevronLeft size={28} strokeWidth={2} />
          </button>
        )}

        {children}

        <div className="otp-header-text-group">
          {title && (
            <h1 className="otp-fullscreen-title">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="otp-fullscreen-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlappingCircles;
