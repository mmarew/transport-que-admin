import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { insaFocusAreas } from "@/data/insaStandard";

export function FocusAreaAccordion() {
  const { t } = useTranslation();
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set([insaFocusAreas[0]?.id ?? ""]),
  );

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="sec-focus-card">
      <h2 className="sec-card-title">
        {t("security.focusAreas.title", "Focus Area Requirements")}
      </h2>
      <p className="sec-card-subtitle">
        {t(
          "security.focusAreas.subtitle",
          "Minimum security requirements per website lifecycle focus area",
        )}
      </p>

      <div className="sec-accordion">
        {insaFocusAreas.map((area) => {
          const isOpen = openIds.has(area.id);
          const mustCount = area.requirements.filter(
            (r) => r.level === "must",
          ).length;
          return (
            <div
              key={area.id}
              className={`sec-accordion-item ${isOpen ? "open" : ""}`}
            >
              <button
                type="button"
                className="sec-accordion-header"
                onClick={() => toggle(area.id)}
                aria-expanded={isOpen}
              >
                <span className="sec-accordion-section">{area.section}</span>
                <span className="sec-accordion-title">
                  {t(area.titleKey, area.id)}
                </span>
                <span className="sec-accordion-meta">
                  {mustCount > 0 && (
                    <span className="sec-level-chip sec-level-chip--must">
                      {mustCount} {t("security.level.mustShort", "mandatory")}
                    </span>
                  )}
                  <span className="sec-accordion-count">
                    {area.requirements.length}
                  </span>
                  <ChevronDown
                    size={17}
                    className={`sec-accordion-chevron ${isOpen ? "open" : ""}`}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="sec-accordion-body">
                  <p className="sec-objective">{area.objective}</p>
                  <ul className="sec-requirement-list">
                    {area.requirements.map((req) => (
                      <li key={req.id} className="sec-requirement-item">
                        <div className="sec-requirement-head">
                          <span className="sec-requirement-id">{req.id}</span>
                          <span
                            className={`sec-level-chip sec-level-chip--${req.level}`}
                          >
                            {t(`security.level.${req.level}`, req.level.toUpperCase())}
                          </span>
                        </div>
                        <p className="sec-requirement-text">{req.text}</p>
                        {req.subItems && req.subItems.length > 0 && (
                          <ol className="sec-subitem-list">
                            {req.subItems.map((sub, idx) => (
                              <li key={idx}>{sub}</li>
                            ))}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FocusAreaAccordion;
