import { NavLink } from "react-router";

import { initials } from "@/lib/format";

export default function AppUserLink({ user, avatarUrl }) {
  const displayName = user?.full_name || "Пользователь";

  return (
    <NavLink
      to="/profile"
      className="app-user-link"
      aria-label={`Открыть профиль: ${displayName}`}
    >
      <span className="app-user-link__avatar" aria-hidden="true">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(displayName)}
      </span>
      <span className="app-user-link__name">{displayName}</span>
    </NavLink>
  );
}
