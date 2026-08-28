import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./MobileHeader.css";

export interface MobileHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
  showBack?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onBack,
  rightAction,
  className = "",
  showBack = true,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`mobile-sub-header ${className}`}>
      <div className="mobile-sub-header__left">
        {showBack && (
          <button
            type="button"
            className="mobile-sub-header__back-btn"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        )}
        <h1 className="mobile-sub-header__title">{title}</h1>
      </div>

      {rightAction && (
        <div className="mobile-sub-header__right">
          {rightAction}
        </div>
      )}
    </header>
  );
};

export default MobileHeader;
