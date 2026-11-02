import { LuPanelLeft, LuPanelTop } from "react-icons/lu";

export default function NavigationLayoutToggle({
  layout,
  onChange,
  showLabel = false,
}) {
  const nextLayout = layout === "sidebar" ? "topbar" : "sidebar";
  const label =
    nextLayout === "sidebar"
      ? "Переключить на боковое меню"
      : "Переключить на верхнее меню";

  return (
    <button
      className={`navigation-layout-toggle${showLabel ? " navigation-layout-toggle--labeled" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={() => onChange(nextLayout)}
    >
      <span className="navigation-layout-toggle__icon" aria-hidden="true">
        {nextLayout === "sidebar" ? <LuPanelLeft /> : <LuPanelTop />}
      </span>
      {showLabel ? (
        <span className="navigation-layout-toggle__label">
          {nextLayout === "sidebar" ? "Боковое меню" : "Верхнее меню"}
        </span>
      ) : null}
    </button>
  );
}
