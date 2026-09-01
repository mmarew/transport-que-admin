import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  User,
  BarChart2,
  Building2,
  Moon,
  Sun,
  Bell,
  Globe,
  HelpCircle,
  Shield,
  Share2,
  LogOut,
  Search,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../components/layout/DashboardLayout";
import MobileHeader from "../components/common/MobileHeader";
import { useListQueueOrganizationsQuery } from "../lib/redux/api";
import { logout } from "../lib/redux/slices/authSlice";
import { setAppLanguage, getAppLanguage } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";
import { useQueueAdminStore } from "../store/queueAdminStore";
import type { RootState } from "../lib/redux/store";
import type { QueueOrgListItem } from "../types/queue";
import { normalizeOrgList } from "../utils/formatters";
import "./SettingsPage.css";

const readBool = (key: string, fallback: boolean): boolean => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
};

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { darkMode, setDarkMode } = useTheme();

  const authData = useSelector((state: RootState) => state.auth.auth);
  const user = authData?.userData;

  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const { data: rawOrgsData } = useListQueueOrganizationsQuery();

  const orgList: QueueOrgListItem[] = useMemo(() => {
    return normalizeOrgList(rawOrgsData);
  }, [rawOrgsData]);

  const activeOrg = useMemo(() => {
    return (
      orgList.find((item) => item.organization?.queueOrganizationUniqueId === selectedOrgId)?.organization ||
      orgList[0]?.organization ||
      null
    );
  }, [orgList, selectedOrgId]);

  // Derived user and org info
  const displayName = activeOrg?.queueOrganizationName || user?.fullName || "Queue Terminal";
  const displayPhone = activeOrg?.queueOrganizationPhone || user?.phoneNumber || "+251929257881";
  const displayEmail = user?.email || "admin@transportque.com";
  const displayAddress = activeOrg?.queueOrganizationAddress || "Dessie, Amhara Region, Ethiopia";

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: displayName,
    phone: displayPhone,
    email: displayEmail,
    address: displayAddress,
  });

  const prevDefaultsRef = useRef({ displayName, displayPhone, displayEmail, displayAddress });
  useEffect(() => {
    if (!isEditing) {
      if (
        prevDefaultsRef.current.displayName !== displayName ||
        prevDefaultsRef.current.displayPhone !== displayPhone ||
        prevDefaultsRef.current.displayEmail !== displayEmail ||
        prevDefaultsRef.current.displayAddress !== displayAddress
      ) {
        prevDefaultsRef.current = { displayName, displayPhone, displayEmail, displayAddress };
        setFormData({
          name: displayName,
          phone: displayPhone,
          email: displayEmail,
          address: displayAddress,
        });
      }
    }
  }, [displayName, displayPhone, displayEmail, displayAddress, isEditing]);

  // Toggles (persisted)
  const [pushNotif, setPushNotif] = useState(() => readBool("app_push_notification", true));
  const [emailNotif, setEmailNotif] = useState(() => readBool("app_email_notification", true));
  const [twoFactor, setTwoFactor] = useState(() => readBool("app_2fa", false));

  // Language Dropdown
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const desktopLangRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (desktopLangRef.current && !desktopLangRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target as Node)) {
        setMobileLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast.success(t("common.success"));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: displayName,
      phone: displayPhone,
      email: displayEmail,
      address: displayAddress,
    });
  };

  const handleTogglePush = (val: boolean) => {
    setPushNotif(val);
    localStorage.setItem("app_push_notification", String(val));
    toast.success(val ? "Push notifications enabled" : "Push notifications disabled");
  };

  const handleToggleEmail = (val: boolean) => {
    setEmailNotif(val);
    localStorage.setItem("app_email_notification", String(val));
    toast.success(val ? "Email alerts enabled" : "Email alerts disabled");
  };

  const handleToggle2FA = (val: boolean) => {
    setTwoFactor(val);
    localStorage.setItem("app_2fa", String(val));
    toast.info(val ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
  };

  const handleToggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    toast.info(val ? "Dark mode activated" : "Light mode activated");
  };

  const handleLanguageChange = (lang: "en" | "am") => {
    setAppLanguage(lang);
    setLangDropdownOpen(false);
    setMobileLangOpen(false);
    toast.success(lang === "en" ? "Language switched to English" : "ቋንቋ ወደ አማርኛ ተቀይሯል");
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    toast.success(t("common.logout"));
  };

  const currentLang = (i18n.language || getAppLanguage() || "en") as "en" | "am";

  return (
    <DashboardLayout
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      activeTab="settings"
    >
      <div className="settings-container">
        {/* ═══════════════════════════════════════════════════════════════════
            MOBILE SETTINGS SCREEN (≤ 768px matching transportCompany)
        ════════════════════════════════════════════════════════════════════ */}
        {showMobileProfile ? (
          <div className="settings-mobile-profile-view animate-fade-in">
            <MobileHeader
              title={t("settings.myProfile")}
              onBack={() => {
                setIsEditing(false);
                setShowMobileProfile(false);
              }}
            />

            <div className="smp-content">
              {/* Avatar Section */}
              <div className="smp-avatar-section">
                <div className="smp-avatar-wrap">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || displayName)}&background=0B4D6D&color=ffffff&size=128`}
                    alt={formData.name || displayName}
                    className="smp-avatar-img"
                  />
                </div>
                <h2 className="smp-name">{formData.name || displayName}</h2>
                <p className="smp-role">{t("settings.role")}</p>
              </div>

              {/* Profile Details Form */}
              <div className="smp-form">
                <div className="smp-field">
                  <label className="smp-label">{t("settings.orgName")}</label>
                  <input
                    type="text"
                    className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.orgNamePlaceholder")}
                  />
                </div>

                <div className="smp-field">
                  <label className="smp-label">{t("settings.phone")}</label>
                  <input
                    type="tel"
                    className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.phonePlaceholder")}
                  />
                </div>

                <div className="smp-field">
                  <label className="smp-label">{t("settings.email")}</label>
                  <input
                    type="email"
                    className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.emailPlaceholder")}
                  />
                </div>

                <div className="smp-field">
                  <label className="smp-label">{t("settings.address")}</label>
                  <input
                    type="text"
                    className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.addressPlaceholder")}
                  />
                </div>

                <div className="smp-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="smp-btn-cancel"
                        onClick={() => {
                          handleCancelEdit();
                        }}
                      >
                        {t("settings.cancel")}
                      </button>
                      <button
                        type="button"
                        className="smp-btn-save"
                        onClick={() => {
                          handleSaveProfile();
                        }}
                      >
                        {t("settings.saveChanges")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="smp-btn-edit-profile"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 size={16} />
                      <span>{t("common.edit", "Edit Profile")}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="settings-mobile" aria-label="Settings screen">
            {/* Header */}
            <div className="settings-header">
              <h1 className="settings-header__title">{t("settings.title")}</h1>
              <button
                type="button"
                className="settings-header__search-btn"
                onClick={() => toast.info("Search")}
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            </div>

            {/* ── Account Section ── */}
            <section className="settings-section">
              <h2 className="settings-section__label">{t("settings.account")}</h2>
              <div className="settings-group">
                <button
                  type="button"
                  className="settings-item"
                  onClick={() => setShowMobileProfile(true)}
                >
                  <span className="settings-item__icon"><User size={18} /></span>
                  <span className="settings-item__label">{t("settings.myProfile")}</span>
                  <ChevronRight size={16} className="settings-item__chevron" />
                </button>

                <button
                  type="button"
                  className="settings-item"
                  onClick={() => navigate("/reports")}
                >
                  <span className="settings-item__icon"><BarChart2 size={18} /></span>
                  <span className="settings-item__label">{t("settings.analytics")}</span>
                  <ChevronRight size={16} className="settings-item__chevron" />
                </button>

                <button
                  type="button"
                  className="settings-item"
                  onClick={() => navigate("/organizations")}
                >
                  <span className="settings-item__icon"><Building2 size={18} /></span>
                  <span className="settings-item__label">{t("nav.organizations")}</span>
                  <ChevronRight size={16} className="settings-item__chevron" />
                </button>
              </div>
            </section>

            {/* ── Theme & Preferences Section ── */}
            <section className="settings-section">
              <h2 className="settings-section__label">{t("settings.theme")}</h2>
              <div className="settings-group">
                {/* Dark Mode */}
                <div className="settings-toggle-row">
                  <span className="settings-toggle-row__icon">
                    {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                  </span>
                  <span className="settings-toggle-row__label">{t("settings.darkMode")}</span>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => handleToggleDarkMode(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Push Notifications */}
                <div className="settings-toggle-row">
                  <span className="settings-toggle-row__icon"><Bell size={18} /></span>
                  <span className="settings-toggle-row__label">{t("settings.pushNotif")}</span>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={pushNotif}
                      onChange={(e) => handleTogglePush(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Email Notifications */}
                <div className="settings-toggle-row">
                  <span className="settings-toggle-row__icon"><Bell size={18} /></span>
                  <span className="settings-toggle-row__label">{t("settings.emailNotif")}</span>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={emailNotif}
                      onChange={(e) => handleToggleEmail(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Two-Factor Auth */}
                <div className="settings-toggle-row">
                  <span className="settings-toggle-row__icon"><Shield size={18} /></span>
                  <span className="settings-toggle-row__label">{t("settings.twoFactor")}</span>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => handleToggle2FA(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>
              </div>
            </section>

            {/* ── More Settings Section ── */}
            <section className="settings-section">
              <h2 className="settings-section__label">{t("settings.more")}</h2>
              <div className="settings-group">
                {/* Language Picker */}
                <div className="settings-item-dropdown" ref={mobileLangRef}>
                  <button
                    type="button"
                    className="settings-item"
                    onClick={() => setMobileLangOpen((v) => !v)}
                  >
                    <span className="settings-item__icon"><Globe size={18} /></span>
                    <span className="settings-item__label">{t("settings.language")}</span>
                    <span className="settings-item__value">
                      {currentLang === "en" ? "English" : "አማርኛ"}
                    </span>
                    <ChevronDown size={15} className={`settings-item__chevron ${mobileLangOpen ? "open" : ""}`} />
                  </button>

                  {mobileLangOpen && (
                    <div className="settings-dropdown-menu">
                      <button
                        type="button"
                        className={`settings-dropdown-option ${currentLang === "en" ? "active" : ""}`}
                        onClick={() => handleLanguageChange("en")}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`settings-dropdown-option ${currentLang === "am" ? "active" : ""}`}
                        onClick={() => handleLanguageChange("am")}
                      >
                        አማርኛ
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="settings-item"
                  onClick={() => toast.info(t("settings.comingSoon"))}
                >
                  <span className="settings-item__icon"><HelpCircle size={18} /></span>
                  <span className="settings-item__label">{t("settings.helpCenter")}</span>
                  <ChevronRight size={16} className="settings-item__chevron" />
                </button>

                <button
                  type="button"
                  className="settings-item"
                  onClick={() => toast.info(t("settings.comingSoon"))}
                >
                  <span className="settings-item__icon"><Shield size={18} /></span>
                  <span className="settings-item__label">{t("settings.privacyPolicy")}</span>
                  <ChevronRight size={16} className="settings-item__chevron" />
                </button>

                <button
                  type="button"
                  className="settings-item"
                  onClick={() => toast.info(t("settings.comingSoon"))}
                >
                  <span className="settings-item__icon"><Share2 size={18} /></span>
                  <span className="settings-item__label">{t("settings.inviteFriends")}</span>
                  <ChevronRight size={16} className="settings-item__chevron" />
                </button>
              </div>
            </section>

            {/* ── Mobile Action Buttons ── */}
            <div className="settings-actions">
              <button
                type="button"
                className="settings-actions__logout"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                {t("settings.signOut")}
              </button>

              <button
                type="button"
                className="settings-actions__delete"
                onClick={() => setShowDeleteModal(true)}
              >
                {t("settings.deleteAccount")}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            DESKTOP SETTINGS SCREEN (> 768px matching transportCompany)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="settings-desktop">
          <div className="sdt-card">
            {/* ── Avatar Row ── */}
            <div className="sdt-avatar-row">
              <div className="sdt-avatar-wrap">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=034b6e&color=ffffff&size=128`}
                  alt={displayName}
                  className="sdt-avatar-img"
                />
                <button
                  type="button"
                  className={`sdt-avatar-edit ${isEditing ? "sdt-avatar-edit--active" : ""}`}
                  title={isEditing ? t("settings.cancel") : t("common.edit")}
                  onClick={() => (isEditing ? handleCancelEdit() : setIsEditing(true))}
                >
                  {isEditing ? <X size={13} /> : <Edit2 size={13} />}
                </button>
              </div>
              <div>
                <div className="sdt-avatar-name">{displayName}</div>
                <div className="sdt-avatar-role">{t("settings.role")}</div>
              </div>
            </div>

            {/* ── Account Details Form ── */}
            <div className="sdt-section">
              <h3 className="sdt-section__title">{t("settings.accountDetails")}</h3>
              <div className="sdt-form-grid">
                <div className="sdt-form-field">
                  <label className="sdt-form-label">{t("settings.orgName")}</label>
                  <input
                    type="text"
                    className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.orgNamePlaceholder")}
                  />
                </div>

                <div className="sdt-form-field">
                  <label className="sdt-form-label">{t("settings.phone")}</label>
                  <input
                    type="tel"
                    className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.phonePlaceholder")}
                  />
                </div>

                <div className="sdt-form-field">
                  <label className="sdt-form-label">{t("settings.email")}</label>
                  <input
                    type="email"
                    className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.emailPlaceholder")}
                  />
                </div>

                <div className="sdt-form-field">
                  <label className="sdt-form-label">{t("settings.address")}</label>
                  <input
                    type="text"
                    className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    readOnly={!isEditing}
                    placeholder={t("settings.addressPlaceholder")}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="sdt-form-actions animate-fade-in">
                  <button type="button" className="sdt-btn-save" onClick={handleSaveProfile}>
                    {t("settings.saveChanges")}
                  </button>
                  <button type="button" className="sdt-btn-cancel" onClick={handleCancelEdit}>
                    {t("settings.cancel")}
                  </button>
                </div>
              )}
            </div>

            {/* ── Preferences Section ── */}
            <div className="sdt-section">
              <h3 className="sdt-section__title">{t("settings.preferences")}</h3>
              <div className="sdt-pref-list">
                {/* Push Notifications */}
                <div className="sdt-pref-row">
                  <div>
                    <div className="sdt-pref-label">{t("settings.pushNotif")}</div>
                    <div className="sdt-pref-desc">{t("settings.pushNotifDesc")}</div>
                  </div>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={pushNotif}
                      onChange={(e) => handleTogglePush(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Email Notifications */}
                <div className="sdt-pref-row">
                  <div>
                    <div className="sdt-pref-label">{t("settings.emailNotif")}</div>
                    <div className="sdt-pref-desc">{t("settings.emailNotifDesc")}</div>
                  </div>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={emailNotif}
                      onChange={(e) => handleToggleEmail(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Two-Factor Auth */}
                <div className="sdt-pref-row">
                  <div>
                    <div className="sdt-pref-label">{t("settings.twoFactor")}</div>
                    <div className="sdt-pref-desc">{t("settings.twoFactorDesc")}</div>
                  </div>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => handleToggle2FA(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Dark Mode */}
                <div className="sdt-pref-row">
                  <div>
                    <div className="sdt-pref-label">{t("settings.darkMode")}</div>
                    <div className="sdt-pref-desc">{t("settings.darkModeDesc")}</div>
                  </div>
                  <label className="sdt-toggle">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => handleToggleDarkMode(e.target.checked)}
                    />
                    <span className="sdt-toggle-slider" />
                  </label>
                </div>

                {/* Preferred Language */}
                <div className="sdt-pref-row">
                  <div>
                    <div className="sdt-pref-label">{t("settings.preferredLang")}</div>
                    <div className="sdt-pref-desc">{t("settings.langDesc")}</div>
                  </div>

                  <div className="settings-lang-wrap" ref={desktopLangRef}>
                    <button
                      type="button"
                      className="settings-lang-btn"
                      onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    >
                      <Globe size={15} />
                      <span>{currentLang === "am" ? "አማርኛ" : "English"}</span>
                      <ChevronDown size={14} />
                    </button>

                    {langDropdownOpen && (
                      <div className="settings-lang-dropdown">
                        <button
                          type="button"
                          className={`settings-lang-option ${currentLang === "en" ? "settings-lang-option--active" : ""}`}
                          onClick={() => handleLanguageChange("en")}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          className={`settings-lang-option ${currentLang === "am" ? "settings-lang-option--active" : ""}`}
                          onClick={() => handleLanguageChange("am")}
                        >
                          አማርኛ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Danger Zone ── */}
            <div className="sdt-danger-section">
              <button type="button" className="sdt-btn-logout" onClick={handleLogout}>
                <LogOut size={16} />
                {t("settings.signOut")}
              </button>

              <button
                type="button"
                className="sdt-btn-delete"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 size={16} />
                {t("settings.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="qm-overlay">
          <div className="qm-modal" style={{ maxWidth: "420px" }}>
            <div className="qm-header">
              <div>
                <h2 className="qm-title" style={{ color: "#dc2626" }}>{t("settings.deleteConfirmTitle")}</h2>
                <p className="qm-subtitle">
                  {t("settings.deleteConfirmDesc")}
                </p>
              </div>
              <button
                type="button"
                className="qm-close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="qm-footer" style={{ marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="qm-btn-cancel"
              >
                {t("settings.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  toast.error("Account deletion requires primary system administrator authorization.");
                }}
                className="qm-btn-danger"
              >
                {t("settings.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default SettingsPage;
