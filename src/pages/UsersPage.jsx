import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router";

import { API_URL } from "@/hooks/api_client";
import { useProfileStore } from "@/store/useProfileStore";
import { useUserModeration } from "@/hooks/useUserModeration";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import { COMPANY_OPTIONS, ROLE_OPTIONS } from "@/lib/authOptions";
import { initials, normalizeSearch } from "@/lib/format";
import { FaPlus } from "react-icons/fa6";
import { IoCloseSharp } from "react-icons/io5";
import {
  TbArrowsSort,
  TbCheck,
  TbCopy,
  TbEye,
  TbEyeOff,
  TbReload,
  TbSearch,
  TbUserPlus,
  TbUsers,
  TbX,
} from "react-icons/tb";

const STATUS_META = {
  pending: { label: "Ожидает", tone: "pending" },
  active: { label: "Активен", tone: "active" },
  approved: { label: "Активен", tone: "active" },
  blocked: { label: "Заблокирован", tone: "blocked" },
  rejected: { label: "Отклонён", tone: "blocked" },
};

const USER_SORT_OPTIONS = {
  name: "По ФИО",
  role: "По роли",
  created_at: "Сначала новые",
};

const USER_SORT_ORDER = ["name", "role", "created_at"];

const EMPTY_REGISTRATION_DRAFT = {
  last_name: "",
  first_name: "",
  middle_name: "",
  email: "",
  company_code: "",
  role: "",
  phone_number1: "+7",
  phone_number2: "",
  phone_number3: "",
};

const EMPTY_REGISTRATION_TOUCHED = {
  last_name: false,
  first_name: false,
  middle_name: false,
  email: false,
  company_code: false,
  role: false,
  phone_number1: false,
  phone_number2: false,
  phone_number3: false,
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getRussianSubscriberDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return (
    digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits
  ).slice(0, 10);
}

function formatRussianPhone(value) {
  const digits = getRussianSubscriberDigits(value);
  let formatted = "+7";

  if (digits.length) {
    formatted += ` (${digits.slice(0, 3)}`;
  }
  if (digits.length >= 3) {
    formatted += ")";
  }
  if (digits.length > 3) {
    formatted += ` ${digits.slice(3, 6)}`;
  }
  if (digits.length > 6) {
    formatted += `-${digits.slice(6, 8)}`;
  }
  if (digits.length > 8) {
    formatted += `-${digits.slice(8, 10)}`;
  }

  return formatted;
}

function formatUserPhones(user) {
  const phones = Array.isArray(user?.phones)
    ? user.phones
    : user?.phone
      ? [user.phone]
      : [];

  const values = phones
    .map((phone) =>
      typeof phone === "string"
        ? phone
        : phone?.phone_number || phone?.number || phone?.value,
    )
    .filter(Boolean);

  return values.length ? values.join(", ") : "Не указан";
}

export default function UsersPage() {
  const currentUser = useProfileStore((state) => state.user);
  const loadingProfile = useProfileStore((state) => state.loadingProfile);
  const currentRole = currentUser?.role?.code;
  const canRegisterUsers = currentRole === "developer" || currentRole === "pto";
  const canModerateUsers = [
    "director",
    "deputy_director",
    "developer",
  ].includes(currentRole || "");
  const canViewUsers = canRegisterUsers || canModerateUsers;

  const {
    users,
    loadingModerationUsers,
    savingModerationUser,
    moderationError,
    getModerationUsers,
    rejectUser,
    blockUser,
    registerUser,
    deleteUser,
  } = useUserModeration();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [registrationDraft, setRegistrationDraft] = useState(
    EMPTY_REGISTRATION_DRAFT,
  );
  const [registrationTouched, setRegistrationTouched] = useState(
    EMPTY_REGISTRATION_TOUCHED,
  );
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedPasswordUserId, setCopiedPasswordUserId] = useState(null);
  const [visiblePhoneCount, setVisiblePhoneCount] = useState(1);
  const [registrationSuccess, setRegistrationSuccess] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const loadUsers = useCallback(
    (force = false) => getModerationUsers(force),
    [getModerationUsers],
  );

  useEffect(() => {
    if (canViewUsers) {
      void loadUsers(false);
    }
  }, [canViewUsers, loadUsers]);

  const visibleUsers = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    const filteredUsers = query
      ? users.filter((user) =>
          normalizeSearch(
            [
              user.full_name,
              user.email,
              formatUserPhones(user),
              user.role?.display_name,
              user.company?.display_name,
              STATUS_META[user.status]?.label,
            ]
              .filter(Boolean)
              .join(" "),
          ).includes(query),
        )
      : [...users];

    if (sortKey === "created_at") {
      return filteredUsers.sort((left, right) => {
        const leftDate = new Date(left.created_at || 0).getTime();
        const rightDate = new Date(right.created_at || 0).getTime();
        return rightDate - leftDate;
      });
    }

    if (sortKey === "role") {
      return filteredUsers.sort((left, right) =>
        normalizeSearch(left.role?.display_name || "").localeCompare(
          normalizeSearch(right.role?.display_name || ""),
          "ru",
        ),
      );
    }

    return filteredUsers.sort((left, right) =>
      normalizeSearch(left.full_name || "").localeCompare(
        normalizeSearch(right.full_name || ""),
        "ru",
      ),
    );
  }, [searchQuery, sortKey, users]);

  const registrationErrors = useMemo(
    () => ({
      last_name: registrationDraft.last_name.trim() ? "" : "Введите фамилию",
      first_name: registrationDraft.first_name.trim() ? "" : "Введите имя",
      middle_name: registrationDraft.middle_name.trim()
        ? ""
        : "Введите отчество",
      email: !registrationDraft.email.trim()
        ? "Введите email"
        : isValidEmail(registrationDraft.email)
          ? ""
          : "Введите корректный email",
      company_code: registrationDraft.company_code ? "" : "Выберите компанию",
      role: registrationDraft.role ? "" : "Выберите роль",
      phone_number1:
        getRussianSubscriberDigits(registrationDraft.phone_number1).length ===
        10
          ? ""
          : "Введите 10 цифр после +7",
      phone_number2:
        !getRussianSubscriberDigits(registrationDraft.phone_number2).length ||
        getRussianSubscriberDigits(registrationDraft.phone_number2).length ===
          10
          ? ""
          : "Введите 10 цифр после +7",
      phone_number3:
        !getRussianSubscriberDigits(registrationDraft.phone_number3).length ||
        getRussianSubscriberDigits(registrationDraft.phone_number3).length ===
          10
          ? ""
          : "Введите 10 цифр после +7",
    }),
    [registrationDraft],
  );

  const registrationIsValid = !Object.values(registrationErrors).some(Boolean);

  const pendingUsersCount = useMemo(
    () => users.filter((user) => user.status === "pending").length,
    [users],
  );

  const showRegistrationError = (field) =>
    Boolean(
      registrationErrors[field] &&
      (registrationTouched[field] ||
        (field.startsWith("phone_number")
          ? getRussianSubscriberDigits(registrationDraft[field]).length
          : registrationDraft[field])),
    );

  const updateRegistrationField = (field, value) => {
    setRegistrationDraft((current) => ({ ...current, [field]: value }));
    setRegistrationSuccess("");
  };

  const touchRegistrationField = (field) => {
    setRegistrationTouched((current) => ({ ...current, [field]: true }));
  };

  const removePhoneField = (phoneNumber) => {
    const shouldShiftThirdPhone = phoneNumber === 2 && visiblePhoneCount === 3;

    setRegistrationDraft((current) => ({
      ...current,
      phone_number2:
        phoneNumber === 2
          ? shouldShiftThirdPhone
            ? current.phone_number3
            : ""
          : current.phone_number2,
      phone_number3: "",
    }));
    setRegistrationTouched((current) => ({
      ...current,
      phone_number2:
        phoneNumber === 2
          ? shouldShiftThirdPhone
            ? current.phone_number3
            : false
          : current.phone_number2,
      phone_number3: false,
    }));
    setVisiblePhoneCount((count) => Math.max(1, count - 1));
    setRegistrationSuccess("");
  };

  const addPhoneField = () => {
    if (visiblePhoneCount >= 3) {
      return;
    }

    const nextPhoneNumber = visiblePhoneCount + 1;
    const field = `phone_number${nextPhoneNumber}`;
    setRegistrationDraft((current) => ({
      ...current,
      [field]: current[field] || "+7",
    }));
    setVisiblePhoneCount(nextPhoneNumber);
  };

  const clearRegistrationDraft = () => {
    setRegistrationDraft(EMPTY_REGISTRATION_DRAFT);
    setRegistrationTouched(EMPTY_REGISTRATION_TOUCHED);
    setVisiblePhoneCount(1);
    setRegistrationSuccess("");
  };

  const closeRegistration = () => {
    setRegistrationOpen(false);
    clearRegistrationDraft();
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();

    const fullName = [
      registrationDraft.last_name,
      registrationDraft.first_name,
      registrationDraft.middle_name,
    ]
      .map((namePart) => namePart.trim())
      .filter(Boolean)
      .join(" ");

    if (!fullName || !registrationIsValid) {
      setRegistrationTouched({
        last_name: true,
        first_name: true,
        middle_name: true,
        email: true,
        company_code: true,
        role: true,
        phone_number1: true,
        phone_number2: visiblePhoneCount >= 2,
        phone_number3: visiblePhoneCount >= 3,
      });
      return;
    }

    const createdUser = await registerUser({
      full_name: fullName,
      email: registrationDraft.email.trim().toLowerCase(),
      company_code: registrationDraft.company_code,
      role: registrationDraft.role,
      phones: [
        registrationDraft.phone_number1,
        registrationDraft.phone_number2,
        registrationDraft.phone_number3,
      ].filter((phone) => getRussianSubscriberDigits(phone).length === 10),
    });

    if (!createdUser) {
      return;
    }

    clearRegistrationDraft();
    setRegistrationSuccess("Пользователь зарегистрирован");
    await loadUsers(true);
  };

  const cycleSort = () => {
    setSortKey((currentSort) => {
      const currentIndex = USER_SORT_ORDER.indexOf(currentSort);
      return USER_SORT_ORDER[(currentIndex + 1) % USER_SORT_ORDER.length];
    });
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((current) => ({
      ...current,
      [userId]: !current[userId],
    }));
    setCopiedPasswordUserId(null);
  };

  const copyGeneratedPassword = async (userId, password) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPasswordUserId(userId);
      window.setTimeout(() => {
        setCopiedPasswordUserId((current) =>
          current === userId ? null : current,
        );
      }, 1600);
    } catch {
      setCopiedPasswordUserId(null);
    }
  };

  const runAction = async (action, userId) => {
    await action(userId);
    await loadUsers(true);
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
      return avatarPath;
    }

    return `${API_URL.replace(/\/$/, "")}${avatarPath}`;
  };

  if (loadingProfile) {
    return <div className="notice">Загружаем профиль...</div>;
  }

  if (!canViewUsers) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="page workspace-page users-page">
      <WorkspacePageHeader
        title="Пользователи"
        description={
          users.length
            ? `${users.length} учетных записей${pendingUsersCount ? ` · ${pendingUsersCount} ожидают решения` : ""}`
            : "Регистрация и управление учетными записями"
        }
        actions={
          <>
            <button
              className="workspace-action workspace-action--icon users-icon-button"
              type="button"
              onClick={() => void loadUsers(true)}
              disabled={loadingModerationUsers}
              aria-label="Обновить список пользователей"
              title="Обновить список"
            >
              <TbReload aria-hidden="true" />
            </button>

            {canRegisterUsers ? (
              <button
                className="workspace-action workspace-action--primary users-add-button"
                type="button"
                onClick={() => setRegistrationOpen(true)}
              >
                <TbUserPlus aria-hidden="true" />
                Новый пользователь
              </button>
            ) : null}
          </>
        }
      />

      {canRegisterUsers && registrationOpen ? (
        <div
          className="drawer-backdrop users-registration-backdrop"
          onClick={closeRegistration}
        >
          <aside
            className="drawer drawer--project users-registration-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-registration-title"
          >
            <div className="drawer__header">
              <div className="drawer__title-group">
                <h2 id="users-registration-title">Новый пользователь</h2>
                <p>Создайте учетную запись и назначьте сотруднику роль.</p>
              </div>
              <button
                className="drawer__close"
                type="button"
                onClick={closeRegistration}
                aria-label="Закрыть регистрацию"
              >
                <TbX aria-hidden="true" />
              </button>
            </div>

            <form
              className="drawer__body users-registration-form"
              onSubmit={handleRegistrationSubmit}
            >
              <div className="users-registration-form__section-title">
                <strong>Личные данные</strong>
                <span>ФИО сотрудника</span>
              </div>
              <div className="form-grid form-grid--four">
                <label
                  className={`field ${showRegistrationError("last_name") ? "field--invalid" : ""}`}
                >
                  <span>Фамилия</span>

                  <input
                    value={registrationDraft.last_name}
                    onChange={(event) =>
                      updateRegistrationField("last_name", event.target.value)
                    }
                    onBlur={() => touchRegistrationField("last_name")}
                    autoComplete="family-name"
                    aria-invalid={showRegistrationError("last_name")}
                    required
                  />
                  {showRegistrationError("last_name") ? (
                    <small className="field__error">
                      {registrationErrors.last_name}
                    </small>
                  ) : null}
                </label>

                <label
                  className={`field ${showRegistrationError("first_name") ? "field--invalid" : ""}`}
                >
                  <span>Имя</span>
                  <input
                    value={registrationDraft.first_name}
                    onChange={(event) =>
                      updateRegistrationField("first_name", event.target.value)
                    }
                    onBlur={() => touchRegistrationField("first_name")}
                    autoComplete="given-name"
                    aria-invalid={showRegistrationError("first_name")}
                    required
                  />
                  {showRegistrationError("first_name") ? (
                    <small className="field__error">
                      {registrationErrors.first_name}
                    </small>
                  ) : null}
                </label>

                <label
                  className={`field ${showRegistrationError("middle_name") ? "field--invalid" : ""}`}
                >
                  <span>Отчество</span>
                  <input
                    value={registrationDraft.middle_name}
                    onChange={(event) =>
                      updateRegistrationField("middle_name", event.target.value)
                    }
                    onBlur={() => touchRegistrationField("middle_name")}
                    autoComplete="additional-name"
                    aria-invalid={showRegistrationError("middle_name")}
                    required
                  />
                  {showRegistrationError("middle_name") ? (
                    <small className="field__error">
                      {registrationErrors.middle_name}
                    </small>
                  ) : null}
                </label>
              </div>

              <div className="users-registration-form__section-title">
                <strong>Рабочие данные</strong>
                <span>Контакты, компания и роль</span>
              </div>
              <div className="form-grid form-grid--four">
                <label
                  className={`field ${showRegistrationError("email") ? "field--invalid" : ""}`}
                >
                  <span>Email</span>
                  <input
                    type="email"
                    value={registrationDraft.email}
                    onChange={(event) =>
                      updateRegistrationField("email", event.target.value)
                    }
                    onBlur={() => touchRegistrationField("email")}
                    aria-invalid={showRegistrationError("email")}
                    required
                  />
                  {showRegistrationError("email") ? (
                    <small className="field__error">
                      {registrationErrors.email}
                    </small>
                  ) : null}
                </label>

                <label
                  className={`field ${showRegistrationError("company_code") ? "field--invalid" : ""}`}
                >
                  <span>Компания</span>

                  <select
                    value={registrationDraft.company_code}
                    onChange={(event) =>
                      updateRegistrationField(
                        "company_code",
                        event.target.value,
                      )
                    }
                    onBlur={() => touchRegistrationField("company_code")}
                    aria-invalid={showRegistrationError("company_code")}
                    required
                  >
                    <option value="">Выберите компанию</option>
                    {COMPANY_OPTIONS.map((company) => (
                      <option value={company.code} key={company.code}>
                        {company.label}
                      </option>
                    ))}
                  </select>

                  {showRegistrationError("company_code") ? (
                    <small className="field__error">
                      {registrationErrors.company_code}
                    </small>
                  ) : null}
                </label>

                <label
                  className={`field ${showRegistrationError("role") ? "field--invalid" : ""}`}
                >
                  <span>Роль</span>
                  <select
                    value={registrationDraft.role}
                    onChange={(event) =>
                      updateRegistrationField("role", event.target.value)
                    }
                    onBlur={() => touchRegistrationField("role")}
                    aria-invalid={showRegistrationError("role")}
                    required
                  >
                    <option value="">Выберите роль</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option value={role.code} key={role.code}>
                        {role.label}
                      </option>
                    ))}
                  </select>

                  {showRegistrationError("role") ? (
                    <small className="field__error">
                      {registrationErrors.role}
                    </small>
                  ) : null}
                </label>

                <div className="phone-fields">
                  {Array.from({ length: visiblePhoneCount }, (_, index) => {
                    const phoneNumber = index + 1;
                    const field = `phone_number${phoneNumber}`;

                    return (
                      <label
                        className={`field ${showRegistrationError(field) ? "field--invalid" : ""}`}
                        key={field}
                      >
                        <span>
                          {phoneNumber === 1
                            ? "Номер телефона"
                            : `Дополнительный номер ${phoneNumber}`}
                        </span>
                        <div className="phone-input-control">
                          <input
                            type="tel"
                            value={registrationDraft[field]}
                            onChange={(event) =>
                              updateRegistrationField(
                                field,
                                formatRussianPhone(event.target.value),
                              )
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === "Backspace" &&
                                event.currentTarget.value.endsWith(")")
                              ) {
                                event.preventDefault();
                                const digits = getRussianSubscriberDigits(
                                  event.currentTarget.value,
                                );
                                updateRegistrationField(
                                  field,
                                  formatRussianPhone(
                                    `+7${digits.slice(0, -1)}`,
                                  ),
                                );
                              }
                            }}
                            onBlur={() => touchRegistrationField(field)}
                            inputMode="tel"
                            maxLength={18}
                            placeholder="+7 (___) ___-__-__"
                            aria-invalid={showRegistrationError(field)}
                            required={phoneNumber === 1}
                          />
                          {phoneNumber === 1 && visiblePhoneCount < 3 ? (
                            <button
                              className="button button--ghost phone-add-button svg-button"
                              type="button"
                              onClick={addPhoneField}
                              aria-label="Добавить номер телефона"
                              title="Добавить номер телефона"
                            >
                              <FaPlus
                                size={16}
                                style={{ marginRight: 3, marginLeft: 3 }}
                              />
                            </button>
                          ) : null}
                          {phoneNumber > 1 ? (
                            <button
                              className="button button--ghost phone-add-button svg-button"
                              type="button"
                              onClick={() => removePhoneField(phoneNumber)}
                              aria-label={`Удалить дополнительный номер ${phoneNumber}`}
                              title="Удалить номер"
                            >
                              <IoCloseSharp size={23} />
                            </button>
                          ) : null}
                        </div>
                        {showRegistrationError(field) ? (
                          <small className="field__error">
                            {registrationErrors[field]}
                          </small>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {registrationSuccess ? (
                <div className="notice notice--success">
                  {registrationSuccess}
                </div>
              ) : null}

              <div className="drawer__footer users-registration-form__footer">
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={savingModerationUser || !registrationIsValid}
                >
                  {savingModerationUser
                    ? "Регистрируем..."
                    : "Зарегистрировать"}
                </button>

                <button
                  className="button button--ghost"
                  type="button"
                  onClick={closeRegistration}
                  disabled={savingModerationUser}
                >
                  Отмена
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {moderationError ? (
        <div className="notice notice--error">{moderationError}</div>
      ) : null}

      <section
        className="users-directory"
        aria-labelledby="users-directory-title"
      >
        <div className="users-directory__title-row">
          <div>
            <h2 id="users-directory-title">Учетные записи</h2>
            <span>
              {visibleUsers.length} из {users.length}
            </span>
          </div>
        </div>

        <div className="users-toolbar">
          <label className="users-search">
            <TbSearch aria-hidden="true" />
            <span className="sr-only">Поиск пользователей</span>
            <input
              style={{ backgroundColor: "transparent" }}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по имени, телефону, роли или компании"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Очистить поиск"
              >
                <TbX aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <button
            className="users-sort-button"
            type="button"
            onClick={cycleSort}
            title={`Сортировка: ${USER_SORT_OPTIONS[sortKey]}`}
            aria-label={`Сортировка: ${USER_SORT_OPTIONS[sortKey]}`}
          >
            <TbArrowsSort aria-hidden="true" />
            {USER_SORT_OPTIONS[sortKey]}
          </button>
        </div>

        {loadingModerationUsers ? (
          <div className="users-loading" aria-label="Загружаем пользователей">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="users-loading__row" key={index}>
                <span className="users-loading__avatar" />
                <span className="users-loading__line" />
                <span className="users-loading__line users-loading__line--short" />
              </div>
            ))}
          </div>
        ) : null}

        {!loadingModerationUsers && !visibleUsers.length ? (
          <div className="users-empty">
            <TbUsers aria-hidden="true" />
            <strong>Пользователи не найдены</strong>
            <p>Попробуйте изменить запрос или очистить поиск.</p>
            {searchQuery ? (
              <button
                className="button button--ghost"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                Очистить поиск
              </button>
            ) : null}
          </div>
        ) : null}

        {!loadingModerationUsers && visibleUsers.length ? (
          <div className="table">
            <div className="table__head users-table__head">
              <span>Пользователь</span>
              <span>Номер телефона</span>
              <span>Роль</span>
              <span>Временный пароль</span>
              <span>Статус</span>
              <span>Действия</span>
            </div>

            {visibleUsers.map((user) => {
              const avatarUrl = getAvatarUrl(user.profile_photo_url);
              const isDeveloper = user.role?.code === "developer";
              const passwordIsVisible = Boolean(visiblePasswords[user.id]);
              const passwordWasCopied = copiedPasswordUserId === user.id;

              return (
                <div className="table__row users-table__row" key={user.id}>
                  <div className="user-cell">
                    <div className="user-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" />
                      ) : (
                        <span>{initials(user.full_name)}</span>
                      )}
                    </div>
                    <div className="user-cell__content">
                      <strong>{user.full_name}</strong>

                      <div className="muted">{user.email}</div>

                      <div className="muted">
                        {user.company?.display_name || "Без компании"}
                      </div>
                    </div>
                  </div>

                  <div className="user-phone-cell" data-label="Телефон">
                    {formatUserPhones(user)}
                  </div>

                  <div className="role-cell" data-label="Роль">
                    <strong>{user.role?.display_name || "Без роли"}</strong>
                  </div>

                  <div
                    className="generated-password-cell"
                    data-label="Временный пароль"
                  >
                    {user.generated_password_valid ? (
                      <>
                        <code
                          className={`generated-password-value ${passwordIsVisible ? "" : "is-hidden"}`}
                        >
                          {passwordIsVisible
                            ? user.generated_password
                            : "••••••••"}
                        </code>
                        <button
                          className="button button--ghost user-password-button"
                          type="button"
                          onClick={() => togglePasswordVisibility(user.id)}
                          aria-label={
                            passwordIsVisible
                              ? "Скрыть временный пароль"
                              : "Показать временный пароль"
                          }
                          aria-pressed={passwordIsVisible}
                          title={
                            passwordIsVisible
                              ? "Скрыть пароль"
                              : "Показать пароль"
                          }
                        >
                          {passwordIsVisible ? (
                            <TbEyeOff aria-hidden="true" />
                          ) : (
                            <TbEye aria-hidden="true" />
                          )}
                        </button>

                        {passwordIsVisible ? (
                          <button
                            className="button button--ghost user-password-button"
                            type="button"
                            onClick={() =>
                              copyGeneratedPassword(
                                user.id,
                                user.generated_password,
                              )
                            }
                            aria-label="Скопировать временный пароль"
                            title={
                              passwordWasCopied
                                ? "Скопировано"
                                : "Скопировать пароль"
                            }
                          >
                            {passwordWasCopied ? (
                              <TbCheck aria-hidden="true" />
                            ) : (
                              <TbCopy aria-hidden="true" />
                            )}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <span className="muted">Истёк</span>
                    )}
                  </div>

                  <div data-label="Статус">
                    <span
                      className={`status-badge status-badge--${STATUS_META[user.status]?.tone || "neutral"}`}
                    >
                      {STATUS_META[user.status]?.label || "Неизвестно"}
                    </span>
                  </div>

                  <div className="users-actions" data-label="Действия">
                    {canModerateUsers && !isDeveloper ? (
                      <>
                        {user.status === "active" ||
                        user.status === "approved" ? (
                          <button
                            className="button button--warn button--soft"
                            disabled={savingModerationUser}
                            onClick={() => runAction(blockUser, user.id)}
                          >
                            Заблокировать
                          </button>
                        ) : user.status !== "rejected" &&
                          user.status !== "blocked" ? (
                          <button
                            className="button button--ghost button--soft"
                            disabled={savingModerationUser}
                            onClick={() => runAction(rejectUser, user.id)}
                          >
                            Отклонить
                          </button>
                        ) : null}

                        <button
                          className="button button--danger button--soft"
                          disabled={savingModerationUser}
                          onClick={() => {
                            if (window.confirm("Удалить пользователя?")) {
                              runAction(deleteUser, user.id);
                            }
                          }}
                        >
                          Удалить
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
