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
  minDate?: string;
  maxDate?: string;
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

function normalizeDateStr(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : dateStr;
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function DatePickerField({
  label,
  value,
  placeholder,
  onChange,
  error,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const isAm = i18n.language === "am";
  const monthNames = isAm ? MONTH_NAMES_AM : MONTH_NAMES_EN;
  const weekdayLabels = isAm ? WEEKDAY_LABELS_AM : WEEKDAY_LABELS_EN;
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedMinDate = useMemo(() => normalizeDateStr(minDate), [minDate]);
  const normalizedMaxDate = useMemo(() => normalizeDateStr(maxDate), [maxDate]);

  const parsed = useMemo(() => parseDate(value), [value]);

  const today = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, []);

  const todayStr = useMemo(
    () => `${today.year}-${pad(today.month + 1)}-${pad(today.day)}`,
    [today]
  );

  const isTodayDisabled = useMemo(() => {
    return Boolean(
      (normalizedMinDate && todayStr < normalizedMinDate) ||
        (normalizedMaxDate && todayStr > normalizedMaxDate)
    );
  }, [normalizedMinDate, normalizedMaxDate, todayStr]);

  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? today.month);

  // Synchronize view year/month when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [parsed?.year, parsed?.month]);

  // Compute position relative to viewport so calendar is never cut off at bottom of screen
  const computePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const POPOVER_HEIGHT = 330;
    const POPOVER_WIDTH = 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If bottom space is insufficient for the full popover, open upward
    if (spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }

    // If right side space is tight, align to right
    const spaceRight = window.innerWidth - rect.left;
    if (spaceRight < POPOVER_WIDTH && rect.right >= POPOVER_WIDTH) {
      setAlignRight(true);
    } else {
      setAlignRight(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      computePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Recalculate position on resize and scroll while open
  useEffect(() => {
    if (!isOpen) return;
    computePosition();

    const handleUpdate = () => {
      computePosition();
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isOpen]);

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

  const isPrevMonthDisabled = useMemo(() => {
    if (!normalizedMinDate) return false;
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0);
    const pYear = prevMonthLastDay.getFullYear();
    const pMonth = prevMonthLastDay.getMonth() + 1;
    const pDay = prevMonthLastDay.getDate();
    const pStr = `${pYear}-${pad(pMonth)}-${pad(pDay)}`;
    return pStr < normalizedMinDate;
  }, [normalizedMinDate, viewYear, viewMonth]);

  const isNextMonthDisabled = useMemo(() => {
    if (!normalizedMaxDate) return false;
    const nextMonthFirstDay = new Date(viewYear, viewMonth + 1, 1);
    const nYear = nextMonthFirstDay.getFullYear();
    const nMonth = nextMonthFirstDay.getMonth() + 1;
    const nDay = nextMonthFirstDay.getDate();
    const nStr = `${nYear}-${pad(nMonth)}-${pad(nDay)}`;
    return nStr > normalizedMaxDate;
  }, [normalizedMaxDate, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (cell: { day: number; isCurrent: boolean; dateStr: string }) => {
    onChange(cell.dateStr);
    const p = parseDate(cell.dateStr);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    if (isTodayDisabled) return;
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange(todayStr);
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
          onClick={handleToggle}
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
          <div
            className={`date-picker-popover ${openUpward ? "open-up" : ""} ${alignRight ? "align-right" : ""}`}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="date-picker-header">
              <span className="date-picker-month-year">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  className={`date-picker-nav-btn ${isPrevMonthDisabled ? "disabled" : ""}`}
                  title={t("orders.prevMonth", "Previous month")}
                  aria-label={t("orders.prevMonth", "Previous month")}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={isNextMonthDisabled}
                  className={`date-picker-nav-btn ${isNextMonthDisabled ? "disabled" : ""}`}
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
                const isSelected = parsed && cell.dateStr === value;
                const isToday = cell.dateStr === todayStr;
                const isDisabled =
                  Boolean(normalizedMinDate && cell.dateStr < normalizedMinDate) ||
                  Boolean(normalizedMaxDate && cell.dateStr > normalizedMaxDate);

                return (
                  <button
                    type="button"
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => !isDisabled && handleSelectDay(cell)}
                    className={`date-picker-day ${
                      !cell.isCurrent ? "other-month" : ""
                    } ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                    disabled={isDisabled}
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
                disabled={isTodayDisabled}
                className={`date-picker-action-btn ${isTodayDisabled ? "disabled" : ""}`}
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
