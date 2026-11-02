import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { COMPANY_OPTIONS } from "@/lib/authOptions";
import { useRegistration } from "@/hooks/useRegistration";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { register, loading, error, setError } = useRegistration();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    company_code: "",
  });

  const formIsValid = useMemo(() => {
    return (
      form.full_name.trim().length > 1 &&
      form.email.trim().length > 3 &&
      form.password.length >= 8 &&
      !!form.company_code
    );
  }, [form]);

  if (localStorage.getItem("access_token")) {
    return <Navigate to="/profile" replace />;
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Введите имя и фамилию");
      return;
    }

    if (form.email.trim().length <= 3) {
      setError("Введите корректный email");
      return;
    }

    if (!form.company_code) {
      setError("Выберите компанию");
      return;
    }

    if (form.password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    const result = await register({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      company_code: form.company_code,
    });

    if (!result.success) {
      return;
    }

    navigate("/profile", { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--mobile auth-card--register">
        <div className="auth-card__header auth-card__header--compact">
          <h1>Регистрация</h1>
          <p className="auth-subtitle">Новый аккаунт</p>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <input
              placeholder="Имя и фамилия"
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
            />
          </label>

          <label className="field">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>

          <label className="field">
            <input
              type="password"
              placeholder="Пароль не короче 8 символов"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
          </label>

          <div className="company-picker">
            {COMPANY_OPTIONS.map((item) => {
              const selected = form.company_code === item.code;

              return (
                <button
                  key={item.code}
                  type="button"
                  className={`company-card ${selected ? "company-card--active" : ""}`}
                  onClick={() => updateField("company_code", item.code)}
                >
                  <span className="company-card__title">
                    {item.code === "tsk_stu" ? "СТУ" : item.label}
                  </span>
                  <span className="company-card__meta">{item.description}</span>
                </button>
              );
            })}
          </div>

          {error ? <div className="notice notice--error">{error}</div> : null}

          <button
            className="button button--primary button--full"
            type="submit"
            disabled={loading || !formIsValid}
          >
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>

          <Link to="/login" className="auth-link">
            Уже есть аккаунт? <span>Войти</span>
          </Link>
        </form>
      </div>
    </div>
  );
}
