import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  FiCamera,
  FiChevronRight,
  FiFileText,
  FiLock,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";

import { storage } from "@/lib/storage";
import { initials } from "@/lib/format";
import useHandlePassportSubmit from "@/hooks/passport/passportSubmit.ts";
import useHandlePassportGet from "@/hooks/passport/passportGet.ts";
import { useProfileStore } from "@/store/useProfileStore";

const formatDepartmentCode = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 6);
  return digits.length > 3
    ? `${digits.slice(0, 3)}-${digits.slice(3)}`
    : digits;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useProfileStore((state) => state.user);
  const savingProfile = useProfileStore((state) => state.savingProfile);
  const photoLoading = useProfileStore((state) => state.photoLoading);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const refreshProfile = useProfileStore((state) => state.refreshProfile);
  const uploadAvatar = useProfileStore((state) => state.uploadAvatar);
  const deleteAvatar = useProfileStore((state) => state.deleteAvatar);
  const getAvatarUri = useProfileStore((state) => state.getAvatarUri);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const [passwordDraft, setPasswordDraft] = useState({
    current_password: "",
    password: "",
  });
  const [passwordTouched, setPasswordTouched] = useState({});
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [passportDraft, setPassportDraft] = useState({
    passport_series: "",
    passport_number: "",
    issued_by: "",
    department_code: "",
    issue_date: "",
    birth_date: "",
    birth_place: "",
    registration_address: "",
  });
  const [passportSaving, setPassportSaving] = useState(false);
  const [passportLoading, setPassportLoading] = useState(false);
  const [passportStatus, setPassportStatus] = useState(null);
  const passportPanelRef = useRef(null);

  useEffect(() => {
    if (!isPasswordModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !savingProfile) {
        setIsPasswordModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPasswordModalOpen, savingProfile]);

  useEffect(() => {
    if (!isPassportModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPassportModalOpen(false);
      }
    };

    const scrollTimer = window.setTimeout(() => {
      if (!passportPanelRef.current) return;

      const top =
        passportPanelRef.current.getBoundingClientRect().top +
        window.scrollY +
        80;

      window.scrollTo({ top, behavior: "smooth" });
    }, 100);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(scrollTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPassportModalOpen]);

  const avatarUrl = getAvatarUri();
  const mustChangeGeneratedPassword = user?.generated_password_valid === true;

  const handleLogout = () => {
    storage.remove("access_token");
    storage.remove("refresh_token");
    storage.remove("user");
    resetProfile();
    navigate("/login", { replace: true });
  };

  const passwordErrors = {
    current_password: (
      mustChangeGeneratedPassword
        ? user?.generated_password
        : passwordDraft.current_password
    )
      ? ""
      : mustChangeGeneratedPassword
        ? "Не удалось получить временный пароль"
        : "Введите текущий пароль",
    password:
      passwordDraft.password.length >= 8
        ? ""
        : "Пароль должен содержать минимум 8 символов",
  };

  const handlePasswordInput = (field, value) => {
    setPasswordStatus(null);
    setPasswordDraft((current) => ({ ...current, [field]: value }));
  };

  const openPasswordModal = () => {
    setPasswordDraft({ current_password: "", password: "" });
    setPasswordTouched({});
    setPasswordStatus(null);
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (savingProfile) {
      return;
    }

    setIsPasswordModalOpen(false);
    setPasswordDraft({ current_password: "", password: "" });
    setPasswordTouched({});
    setPasswordStatus(null);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordTouched({ current_password: true, password: true });

    if (Object.values(passwordErrors).some(Boolean)) {
      return;
    }

    const result = await updateProfile({
      current_password: mustChangeGeneratedPassword
        ? user.generated_password
        : passwordDraft.current_password,
      password: passwordDraft.password,
    });

    if (result) {
      const refreshedUser = await refreshProfile();

      if (
        mustChangeGeneratedPassword &&
        result?.generated_password_valid !== false &&
        refreshedUser?.generated_password_valid !== false
      ) {
        setPasswordStatus("error");
        return;
      }

      setPasswordDraft({ current_password: "", password: "" });
      setPasswordTouched({});
      setPasswordStatus("success");
      return;
    }

    setPasswordStatus("error");
  };

  const handlePassportInput = (field, value) => {
    setPassportStatus(null);
    setPassportDraft((current) => ({ ...current, [field]: value }));
  };

  const handlePassportSubmit = async (event) => {
    event.preventDefault();

    setPassportSaving(true);
    setPassportStatus(null);

    const payload = {
      passport_series_number: [
        passportDraft.passport_series.trim(),
        passportDraft.passport_number.trim(),
      ]
        .filter(Boolean)
        .join(" "),
      issued_by: passportDraft.issued_by.trim(),
      department_code: formatDepartmentCode(passportDraft.department_code),
      issue_date: passportDraft.issue_date || null,
      birth_date: passportDraft.birth_date || null,
      birth_place: passportDraft.birth_place.trim(),
      registration_address: passportDraft.registration_address.trim(),
    };

    let result = await useHandlePassportSubmit(payload);
    if (result) {
      setPassportStatus("success");
      setPassportSaving(false);
      return;
    }
    setPassportStatus("error");
    setPassportSaving(false);
  };

  const loadPassportDetails = async () => {
    if (!user?.id) {
      setPassportStatus("load-error");
      return;
    }

    setPassportLoading(true);
    setPassportStatus(null);

    const response = await useHandlePassportGet(user.id);

    if (response) {
      const details =
        response?.passport_details ||
        response?.data?.passport_details ||
        response?.data ||
        response ||
        {};
      const seriesNumber = String(
        details.passport_series_number ||
          [details.passport_series, details.passport_number]
            .filter(Boolean)
            .join(" ") ||
          "",
      ).trim();
      const [passportSeries = "", ...passportNumberParts] =
        seriesNumber.split(/\s+/);

      setPassportDraft({
        passport_series: passportSeries,
        passport_number: passportNumberParts.join(" "),
        issued_by: details.issued_by || "",
        department_code: formatDepartmentCode(details.department_code),
        issue_date: details.issue_date
          ? String(details.issue_date).slice(0, 10)
          : "",
        birth_date: details.birth_date
          ? String(details.birth_date).slice(0, 10)
          : "",
        birth_place: details.birth_place || "",
        registration_address: details.registration_address || "",
      });

      setPassportLoading(false);
      return;
    }
    setPassportStatus("load-error");
    setPassportLoading(false);
  };

  const passwordForm = (
    <form className="form-grid" onSubmit={handlePasswordSubmit} noValidate>
      {!mustChangeGeneratedPassword ? (
        <label
          className={`field ${
            passwordTouched.current_password && passwordErrors.current_password
              ? "field--invalid"
              : ""
          }`}
        >
          <span>Текущий пароль</span>
          <input
            type="password"
            autoComplete="current-password"
            value={passwordDraft.current_password}
            onChange={(event) =>
              handlePasswordInput("current_password", event.target.value)
            }
            onBlur={() =>
              setPasswordTouched((current) => ({
                ...current,
                current_password: true,
              }))
            }
          />
          {passwordTouched.current_password &&
          passwordErrors.current_password ? (
            <small className="field__error">
              {passwordErrors.current_password}
            </small>
          ) : null}
        </label>
      ) : null}

      <label
        className={`field ${
          passwordTouched.password && passwordErrors.password
            ? "field--invalid"
            : ""
        }`}
      >
        <span>Новый пароль</span>
        <input
          type="password"
          autoComplete="new-password"
          value={passwordDraft.password}
          onChange={(event) =>
            handlePasswordInput("password", event.target.value)
          }
          onBlur={() =>
            setPasswordTouched((current) => ({
              ...current,
              password: true,
            }))
          }
        />
        {passwordTouched.password && passwordErrors.password ? (
          <small className="field__error">{passwordErrors.password}</small>
        ) : null}
      </label>

      {passwordStatus === "success" ? (
        <div className="notice">Пароль успешно изменен</div>
      ) : null}
      {passwordStatus === "error" ? (
        <div className="notice notice--error">
          Не удалось изменить пароль. Проверьте введенные данные.
        </div>
      ) : null}

      <div className="form-actions">
        <button
          className="button button--primary"
          type="submit"
          disabled={savingProfile}
        >
          {savingProfile ? "Сохраняем..." : "Сменить пароль"}
        </button>
      </div>
    </form>
  );

  if (mustChangeGeneratedPassword) {
    return (
      <div className="page required-password-page">
        <section className="panel required-password-card">
          <div className="section-title required-password-card__title">
            <h1>Придумайте новый пароль</h1>
          </div>
          {passwordForm}
        </section>
      </div>
    );
  }

  return (
    <div className="page workspace-page profile-page">
      <header className="workspace-page-header profile-page__header">
        <div className="workspace-page-header__heading">
          <h1>Профиль</h1>
        </div>
      </header>

      <div className="profile-page__content">
        <div className="profile-overview">
          <section className="profile-identity" aria-labelledby="profile-name">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.full_name || "avatar"} />
                ) : (
                  <span className="profile-avatar__initials">
                    {initials(user?.full_name)}
                  </span>
                )}
              </div>
            </div>

            <div className="profile-identity__body">
              <div className="profile-identity__copy">
                <h2 id="profile-name">{user?.full_name || "Без имени"}</h2>
                <p>{user?.role?.display_name || "Без роли"}</p>
              </div>
              <div className="profile-photo-actions">
                <label className="profile-photo-action">
                  <FiCamera aria-hidden="true" />
                  {photoLoading
                    ? "Загрузка..."
                    : avatarUrl
                      ? "Сменить фото"
                      : "Добавить фото"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={photoLoading}
                    onChange={(event) =>
                      uploadAvatar(event.target.files?.[0] || null)
                    }
                  />
                </label>
                {avatarUrl ? (
                  <button
                    className="profile-photo-action profile-photo-action--danger"
                    type="button"
                    onClick={() => deleteAvatar()}
                    disabled={photoLoading}
                  >
                    <FiTrash2 aria-hidden="true" />
                    Удалить
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section
            className="profile-settings"
            aria-labelledby="profile-settings-title"
          >
            <div className="profile-settings__header">
              <h2 id="profile-settings-title">Настройки аккаунта</h2>
              <p>Документы и безопасность</p>
            </div>
            <div className="profile-settings__list">
              <button
                className={`profile-setting-row ${isPassportModalOpen ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setPassportStatus(null);
                  setIsPassportModalOpen(true);
                  void loadPassportDetails();
                }}
              >
                <span className="profile-setting-row__icon">
                  <FiFileText aria-hidden="true" />
                </span>
                <span className="profile-setting-row__copy">
                  <strong>Паспортные данные</strong>
                  <small>Серия, номер и данные о выдаче</small>
                </span>
                <FiChevronRight
                  className="profile-setting-row__chevron"
                  aria-hidden="true"
                />
              </button>

              <button
                className="profile-setting-row"
                type="button"
                onClick={openPasswordModal}
              >
                <span className="profile-setting-row__icon">
                  <FiLock aria-hidden="true" />
                </span>
                <span className="profile-setting-row__copy">
                  <strong>Сменить пароль</strong>
                  <small>Обновить пароль для входа в систему</small>
                </span>
                <FiChevronRight
                  className="profile-setting-row__chevron"
                  aria-hidden="true"
                />
              </button>

              <button
                className="profile-setting-row profile-setting-row--danger"
                type="button"
                onClick={handleLogout}
              >
                <span className="profile-setting-row__icon">
                  <FiLogOut aria-hidden="true" />
                </span>
                <span className="profile-setting-row__copy">
                  <strong>Выйти из аккаунта</strong>
                  <small>Завершить текущий сеанс</small>
                </span>

                <FiChevronRight
                  className="profile-setting-row__chevron"
                  aria-hidden="true"
                />
              </button>
            </div>
          </section>
        </div>

        <section
          className={`profile-passport-panel ${isPassportModalOpen ? "is-open" : ""}`}
          aria-labelledby="profile-passport-modal-title"
          ref={passportPanelRef}
        >
          <div className="profile-passport-panel__inner">
            <div className="profile-password-modal__header">
              <h2 id="profile-passport-modal-title">Паспортные данные</h2>
              <button
                className="profile-password-modal__close"
                type="button"
                onClick={() => {
                  if (!passportSaving && !passportLoading) {
                    setIsPassportModalOpen(false);
                  }
                }}
                disabled={passportSaving || passportLoading}
                aria-label="Закрыть окно"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <form
              className="form-grid form-grid--two"
              onSubmit={handlePassportSubmit}
            >
              <label className="field">
                <span>Серия паспорта</span>
                <input
                  maxLength={4}
                  inputMode="numeric"
                  value={passportDraft.passport_series}
                  onChange={(event) =>
                    handlePassportInput(
                      "passport_series",
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Номер паспорта</span>
                <input
                  maxLength={6}
                  inputMode="numeric"
                  value={passportDraft.passport_number}
                  onChange={(event) =>
                    handlePassportInput(
                      "passport_number",
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />
              </label>
              <label className="field field--full">
                <span>Кем выдан</span>
                <input
                  value={passportDraft.issued_by}
                  onChange={(event) =>
                    handlePassportInput("issued_by", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Код подразделения</span>
                <input
                  maxLength={7}
                  inputMode="numeric"
                  value={passportDraft.department_code}
                  onChange={(event) =>
                    handlePassportInput(
                      "department_code",
                      formatDepartmentCode(event.target.value),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Дата выдачи</span>
                <input
                  type="date"
                  value={passportDraft.issue_date}
                  onChange={(event) =>
                    handlePassportInput("issue_date", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Дата рождения</span>
                <input
                  type="date"
                  value={passportDraft.birth_date}
                  onChange={(event) =>
                    handlePassportInput("birth_date", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Место рождения</span>
                <input
                  value={passportDraft.birth_place}
                  onChange={(event) =>
                    handlePassportInput("birth_place", event.target.value)
                  }
                />
              </label>
              <label className="field field--full">
                <span>Адрес регистрации</span>
                <textarea
                  rows={3}
                  value={passportDraft.registration_address}
                  onChange={(event) =>
                    handlePassportInput(
                      "registration_address",
                      event.target.value,
                    )
                  }
                />
              </label>
              {passportStatus === "success" ? (
                <div className="notice">Паспортные данные сохранены</div>
              ) : null}
              {/*{passportStatus === "load-error" ? (*/}
              {/*  <div className="notice notice--error">*/}
              {/*    Не удалось загрузить паспортные данные. Попробуйте открыть*/}
              {/*    этот раздел ещё раз.*/}
              {/*  </div>*/}
              {/*) : null}*/}
              {/*{passportStatus === "error" ? (*/}
              {/*  <div className="notice notice--error">*/}
              {/*    Не удалось сохранить паспортные данные. Проверьте введенные*/}
              {/*    данные.*/}
              {/*  </div>*/}
              {/*) : null}*/}

              <div className="profile-passport-panel__footer">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => setIsPassportModalOpen(false)}
                  disabled={passportSaving || passportLoading}
                >
                  Отменить
                </button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={passportSaving || passportLoading}
                >
                  {passportSaving ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {isPasswordModalOpen ? (
        <div
          className="profile-password-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePasswordModal();
            }
          }}
        >
          <section
            className="profile-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-password-modal-title"
          >
            <div className="profile-password-modal__header">
              <h2 id="profile-password-modal-title">Смена пароля</h2>
              <button
                className="profile-password-modal__close"
                type="button"
                onClick={closePasswordModal}
                disabled={savingProfile}
                aria-label="Закрыть окно"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {passwordForm}
          </section>
        </div>
      ) : null}
    </div>
  );
}
