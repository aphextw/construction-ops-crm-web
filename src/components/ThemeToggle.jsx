import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const THEME_STORAGE_KEY = "stu_theme";

function getInitialTheme() {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#191919" : "#f6f5f4");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme = isDark ? "light" : "dark";
  const label = isDark
    ? "Включить светлую тему"
    : "Включить тёмную тему";

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? <FiSun /> : <FiMoon />}
      </span>
    </button>
  );
}
