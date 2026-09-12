import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./DatePickerField.css";

interface DatePickerFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (val: string) => void;
  error?: string;
}

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_NAMES_AM = [
  "ጃንዋሪ", "ፌብሩዋሪ", "ማርች", "ኤፕሪል", "ሜይ", "ጁን",
  "ጁላይ", "ኦገስት", "ሴፕቴምበር", "ኦክቶበር", "ኖቬምበር", "ዲሴምበር"
];

const WEEKDAY_LABELS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_LABELS_AM = ["እሁ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "አር", "ቅዳ"];

function parseDate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10) - 1,
    day: parseInt(match[3], 10),
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function DatePickerField({
  label,
  value,
  placeholder,
  onChange,
  error,
}: DatePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const isAm = i18n.language === "am";
  const monthNames = isAm ? MONTH_NAMES_AM : MONTH_NAMES_EN;
  const weekdayLabels = isAm ? WEEKDAY_LABELS_AM : WEEKDAY_LABELS_EN;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseDate(value), [value]);

  const today = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, []);

  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? today.month);

  // Synchronize view year/month when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [parsed?.year, parsed?.month]);

  // Close when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    const formatted = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const formatted = `${today.year}-${pad(today.month + 1)}-${pad(today.day)}`;
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{ day: number; isCurrent: boolean; dateStr: string }> = [];

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        day: d,
        isCurrent: false,
        dateStr: `${prevYear}-${pad(prevMonth + 1)}-${pad(d)}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        isCurrent: true,
        dateStr: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`,
      });
    }

    // Next month padding to complete grid (multiples of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        cells.push({
          day: d,
          isCurrent: false,
          dateStr: `${nextYear}-${pad(nextMonth + 1)}-${pad(d)}`,
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  const displayValue = useMemo(() => {
    if (!parsed) return "";
    return `${parsed.year}-${pad(parsed.month + 1)}-${pad(parsed.day)}`;
  }, [parsed]);

  return (
    <div className="com-field-group">
      <label className="com-label">{label}</label>
      <div ref={containerRef} className="date-picker-wrap" onKeyDown={handleKeyDown}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`date-picker-trigger ${isOpen ? "open" : ""} ${error ? "error" : ""}`}
        >
          <span className={`date-picker-value ${!displayValue ? "date-picker-placeholder" : ""}`}>
            {displayValue || placeholder || t("orders.selectDate")}
          </span>
          <Calendar size={16} className="date-picker-icon" />
        </button>

        {isOpen && (
          <div className="date-picker-popover" role="dialog" aria-modal="true">
            {/* Header */}
            <div className="date-picker-header">
              <span className="date-picker-month-year">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="date-picker-nav-btn"
                  title={t("orders.prevMonth", "Previous month")}
                  aria-label={t("orders.prevMonth", "Previous month")}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="date-picker-nav-btn"
                  title={t("orders.nextMonth", "Next month")}
                  aria-label={t("orders.nextMonth", "Next month")}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="date-picker-weekdays">
              {weekdayLabels.map((w) => (
                <span key={w} className="date-picker-weekday">
                  {w}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="date-picker-grid">
              {calendarCells.map((cell, idx) => {
                const isSelected = parsed && cell.isCurrent && cell.day === parsed.day && viewMonth === parsed.month && viewYear === parsed.year;
                const isToday = cell.isCurrent && cell.day === today.day && viewMonth === today.month && viewYear === today.year;

                return (
                  <button
                    type="button"
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => handleSelectDay(cell.day, cell.isCurrent)}
                    className={`date-picker-day ${
                      !cell.isCurrent ? "other-month" : ""
                    } ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                    disabled={!cell.isCurrent}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="date-picker-footer">
              <button
                type="button"
                onClick={handleClear}
                className="date-picker-action-btn clear"
              >
                {t("common.clear", "Clear")}
              </button>
              <button
                type="button"
                onClick={handleSelectToday}
                className="date-picker-action-btn"
              >
                {t("common.today", "Today")}
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="com-error-text">{error}</p>}
    </div>
  );
}

export default DatePickerField;
