import { useTranslation } from "react-i18next";
import { ShieldCheck, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface SecurityScoreCardsProps {
  score: number;
  passed: number;
  failed: number;
  untested: number;
  total: number;
}

export function SecurityScoreCards({
  score,
  passed,
  failed,
  untested,
  total,
}: SecurityScoreCardsProps) {
  const { t } = useTranslation();

  const scoreColor = score >= 80 ? "green" : score >= 50 ? "orange" : "red";

  return (
    <div className="sec-kpi-grid">
      <div className="sec-kpi-card">
        <div className="sec-kpi-head">
          <p className="sec-kpi-label">{t("security.kpi.score", "Compliance Score")}</p>
          <span className="sec-kpi-icon blue">
            <ShieldCheck size={18} />
          </span>
        </div>
        <p className={`sec-kpi-val ${scoreColor}`}>{score}%</p>
        <p className="sec-kpi-sub">
          {t("security.kpi.ofTotal", "{{passed}} of {{total}} tests passed", {
            passed,
            total,
          })}
        </p>
      </div>

      <div className="sec-kpi-card">
        <div className="sec-kpi-head">
          <p className="sec-kpi-label">{t("security.kpi.passed", "Passed")}</p>
          <span className="sec-kpi-icon green">
            <CheckCircle2 size={18} />
          </span>
        </div>
        <p className="sec-kpi-val green">{passed}</p>
        <p className="sec-kpi-sub green">
          {t("security.kpi.tests", "Security tests")}
        </p>
      </div>

      <div className="sec-kpi-card">
        <div className="sec-kpi-head">
          <p className="sec-kpi-label">{t("security.kpi.failed", "Failed")}</p>
          <span className="sec-kpi-icon red">
            <XCircle size={18} />
          </span>
        </div>
        <p className="sec-kpi-val red">{failed}</p>
        <p className="sec-kpi-sub red">
          {t("security.kpi.needAttention", "Need attention")}
        </p>
      </div>

      <div className="sec-kpi-card">
        <div className="sec-kpi-head">
          <p className="sec-kpi-label">{t("security.kpi.untested", "Untested")}</p>
          <span className="sec-kpi-icon gray">
            <HelpCircle size={18} />
          </span>
        </div>
        <p className="sec-kpi-val">{untested}</p>
        <p className="sec-kpi-sub">
          {t("security.kpi.remaining", "Remaining to test")}
        </p>
      </div>
    </div>
  );
}

export default SecurityScoreCards;
