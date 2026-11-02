import { useState } from "react";
import { Navigate } from "react-router";

import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/auth.js";

const logo = "/stu_logo_no_background_zoom.png";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (localStorage.getItem("access_token")) {
    return <Navigate to="/profile" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await login(email, password);

    if (success) {
      window.location.assign("/profile");
    }
  };

  const EyeIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div className="auth-page">
      <ThemeToggle className="auth-page__theme-toggle" />
      <div className="auth-card auth-card--mobile">
        <div className="auth-card__header">
          <div className="auth-logo-wrap">
            <img className="auth-logo" src={logo} alt="STU" />
          </div>
          <h1>Вход</h1>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {error ? <div className="notice notice--error">{error}</div> : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="Введите логин"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Пароль</span>

            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button
            className="button button--primary button--full"
            type="submit"
            disabled={loading}
          >
            {loading ? "Входим..." : "Войти"}
          </button>

          {/* Публичная регистрация отключена: учетные записи создаются администраторами. */}
        </form>
      </div>
    </div>
  );
}
