import { useState } from "react";
import { NavLink } from "react-router";
import {LuPanelLeft, LuPanelRight} from "react-icons/lu";

import AppUserLink from "@/components/AppUserLink";
import NavigationLayoutToggle from "@/components/NavigationLayoutToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { getVisibleNavigationItems } from "@/components/navigationItems";

const logo = "/stu_logo_no_background_zoom.png";

export default function AppSidebar({
  permissions,
  navigationHidden = false,
  user,
  avatarUrl,
  mobileOpen = false,
  expanded = true,
  onMobileClose,
  onExpandedChange,
  onLayoutChange,
}) {
  const visibleItems = getVisibleNavigationItems(permissions);
  const [hoverSuppressed, setHoverSuppressed] = useState(false);

  const handleExpandedChange = (event) => {
    const nextExpanded = !expanded;

    setHoverSuppressed(!nextExpanded);
    event.currentTarget.blur();
    onExpandedChange(nextExpanded);
  };

  return (
    <aside
      id="app-sidebar"
      className={`app-sidebar app-sidebar--${expanded ? "expanded" : "collapsed"}${
        mobileOpen ? " app-sidebar--mobile-open" : ""
      }${hoverSuppressed ? " app-sidebar--hover-suppressed" : ""}`}
      aria-label="Основная навигация"
      onMouseLeave={() => setHoverSuppressed(false)}
    >
      <div className="app-sidebar__header">
        <NavLink
          className="app-brand app-sidebar__brand"
          to="/projects"
          aria-label="СТУ, к объектам"
          onClick={onMobileClose}
        >
          <span className="app-brand__mark app-brand__mark--image">
            <img src={logo} alt="" />
          </span>
        </NavLink>

        <button
          className="app-sidebar__collapse"
          type="button"
          aria-label={
            expanded ? "Свернуть боковое меню" : "Закрепить боковое меню"
          }
          title={expanded ? "Свернуть меню" : "Закрепить меню"}
          onClick={handleExpandedChange}
        >
          {expanded ? <LuPanelLeft /> : <LuPanelRight />}
        </button>
      </div>

      {!navigationHidden ? (
        <nav className="app-nav" aria-label="Разделы сайта">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="app-nav__link"
              onClick={onMobileClose}
            >
              <span className="app-nav__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="app-nav__label">{label}</span>
            </NavLink>
          ))}
        </nav>
      ) : (
        <span />
      )}

      <div className="app-sidebar__footer">
        <div className="app-sidebar__tools">
          <NavigationLayoutToggle
            layout="sidebar"
            onChange={onLayoutChange}
            showLabel
          />
          <ThemeToggle />
        </div>
        <AppUserLink user={user} avatarUrl={avatarUrl} />
      </div>
    </aside>
  );
}
