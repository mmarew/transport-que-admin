import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, BookOpen, AlertTriangle, ClipboardCheck } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import MobileHeader from "../../components/common/MobileHeader";
import SecurityScoreCards from "../../components/security/SecurityScoreCards";
import FocusAreaAccordion from "../../components/security/FocusAreaAccordion";
import VulnerabilityTable from "../../components/security/VulnerabilityTable";
import SecurityChecklist from "../../components/security/SecurityChecklist";
import { useSecurityChecklist } from "../../hooks/useSecurityChecklist";
import {
  insaStandardMeta,
  insaPrinciples,
  insaTotalRequirements,
  insaTotalTests,
} from "../../data/insaStandard";
import "./SecurityPage.css";

type SecurityTab = "overview" | "requirements" | "vulnerabilities" | "testing";

export function SecurityPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SecurityTab>("overview");
  const { statuses, setStatus, resetAll, stats, groupStats } =
    useSecurityChecklist();

  const tabs: { key: SecurityTab; label: string; icon: ReactNode }[] = [
    {
      key: "overview",
      label: t("security.tabs.overview", "Overview"),
      icon: <BookOpen size={16} />,
    },
    {
      key: "requirements",
      label: t("security.tabs.requirements", "Focus Areas"),
      icon: <ShieldCheck size={16} />,
    },
    {
      key: "vulnerabilities",
      label: t("security.tabs.vulnerabilities", "Vulnerabilities"),
      icon: <AlertTriangle size={16} />,
    },
    {
      key: "testing",
      label: t("security.tabs.testing", "Security Testing"),
      icon: <ClipboardCheck size={16} />,
    },
  ];

  return (
    <DashboardLayout
      title={t("security.title", "Security Compliance")}
      subtitle={t(
        "security.subtitle",
        "Measure website security against the INSA Secure Website Management Standard",
      )}
      activeTab="security"
    >
      <div className="sec-container">
        {/* Mobile Navigation Header */}
        <div className="sec-mobile-top-header">
          <MobileHeader
            title={t("security.title", "Security Compliance")}
            showBack={false}
          />
          <p className="sec-mobile-subtitle">
            {t(
              "security.subtitle",
              "Measure website security against the INSA Secure Website Management Standard",
            )}
          </p>
        </div>

        {/* Compliance KPI Cards */}
        <SecurityScoreCards
          score={stats.score}
          passed={stats.passed}
          failed={stats.failed}
          untested={stats.untested}
          total={stats.total}
        />

        {/* Section Tabs */}
        <div className="sec-tabs" role="tablist" aria-label={t("security.title", "Security Compliance")}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`sec-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="sec-overview-grid">
            <div className="sec-focus-card">
              <h2 className="sec-card-title">
                {insaStandardMeta.name}
              </h2>
              <p className="sec-card-subtitle">
                {insaStandardMeta.version} · {insaStandardMeta.year} ·{" "}
                {insaStandardMeta.issuedBy}
              </p>

              <div className="sec-overview-section">
                <h3>{t("security.overview.purposeTitle", "Purpose")}</h3>
                <p>
                  {t(
                    "security.overview.purposeText",
                    "The standard assists government and key private organizations in integrating security features into their website design, implementation, hosting, operation, and management based on the services they provide, and provides applicable requirements to prevent the most common security threats to websites.",
                  )}
                </p>
              </div>

              <div className="sec-overview-section">
                <h3>{t("security.overview.scopeTitle", "Scope")}</h3>
                <p>
                  {t(
                    "security.overview.scopeText",
                    "This standard is applicable to Ethiopian federal and regional government and key private organizations of the country.",
                  )}
                </p>
              </div>

              <div className="sec-overview-stats">
                <div className="sec-overview-stat">
                  <span className="sec-overview-stat-val">5</span>
                  <span className="sec-overview-stat-label">
                    {t("security.overview.focusAreas", "Focus areas")}
                  </span>
                </div>
                <div className="sec-overview-stat">
                  <span className="sec-overview-stat-val">
                    {insaTotalRequirements}
                  </span>
                  <span className="sec-overview-stat-label">
                    {t("security.overview.requirements", "Requirements")}
                  </span>
                </div>
                <div className="sec-overview-stat">
                  <span className="sec-overview-stat-val">{insaTotalTests}</span>
                  <span className="sec-overview-stat-label">
                    {t("security.overview.securityTests", "Security tests")}
                  </span>
                </div>
              </div>
            </div>

            <div className="sec-focus-card">
              <h2 className="sec-card-title">
                {t("security.overview.principlesTitle", "Principles")}
              </h2>
              <p className="sec-card-subtitle">
                {t(
                  "security.overview.principlesSubtitle",
                  "Guiding principles for website design, implementation, hosting, operation and management",
                )}
              </p>
              <ul className="sec-principle-list">
                {insaPrinciples.map((principle) => (
                  <li key={principle.titleKey} className="sec-principle-item">
                    <span className="sec-principle-dot" />
                    <div>
                      <p className="sec-principle-name">
                        {t(principle.titleKey, principle.titleKey)}
                      </p>
                      <p className="sec-principle-text">{principle.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "requirements" && <FocusAreaAccordion />}

        {activeTab === "vulnerabilities" && <VulnerabilityTable />}

        {activeTab === "testing" && (
          <SecurityChecklist
            statuses={statuses}
            groupStats={groupStats}
            onSetStatus={setStatus}
            onResetAll={resetAll}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default SecurityPage;
