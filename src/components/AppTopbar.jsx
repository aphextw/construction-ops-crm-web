import { NavLink } from "react-router";

import AppUserLink from "@/components/AppUserLink";
import NavigationLayoutToggle from "@/components/NavigationLayoutToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { getVisibleNavigationItems } from "@/components/navigationItems";

const logo = "/stu_logo_no_background_zoom.png";

export default function AppTopbar({
  permissions,
  navigationHidden = false,
  user,
  avatarUrl,
  onLayoutChange,
}) {
  const visibleItems = getVisibleNavigationItems(permissions);

  return (
    <header className="app-topbar">
      <NavLink
        className="app-brand"
        to="/projects"
        aria-label="СТУ, к объектам"
      >
        <span className="app-brand__mark app-brand__mark--image">
          <img src={logo} alt="" />
        </span>
      </NavLink>

      {!navigationHidden ? (
        <nav className="app-nav" aria-label="Основная навигация">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="app-nav__link">
              <span className="app-nav__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="app-nav__label">{label}</span>
            </NavLink>
          ))}
        </nav>
      ) : (
        <span className="app-topbar__spacer" aria-hidden="true" />
      )}

      <div className="app-topbar__account">
        <NavigationLayoutToggle layout="topbar" onChange={onLayoutChange} />
        <ThemeToggle />
        <AppUserLink user={user} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
