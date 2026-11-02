import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigation,
} from "react-router";

import AppTopbar from "@/components/AppTopbar";
import AppSidebar from "@/components/AppSidebar";
import AppUserLink from "@/components/AppUserLink";
import NavigationLayoutToggle from "@/components/NavigationLayoutToggle";
import ThemeToggle from "@/components/ThemeToggle";
import LoginPage from "@/pages/LoginPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import MailPage from "@/pages/MailPage";
import MaterialsPage from "@/pages/MaterialsPage";
import ProfilePage from "@/pages/ProfilePage";
import ProjectAccessPage from "@/pages/ProjectAccessPage";
import ProjectPage from "@/pages/ProjectPage";
import ProjectsPage from "@/pages/ProjectsPage";
import SectionPage from "@/pages/SectionPage";
import UsersPage from "@/pages/UsersPage";
import { useEffect, useState } from "react";
import { storage, STORAGE_CHANGE_EVENT_NAME } from "@/lib/storage.ts";
import { useProfileStore } from "@/store/useProfileStore";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { setUnauthorizedHandler } from "@/hooks/api_client.ts";

const NAVIGATION_LAYOUT_STORAGE_KEY = "stu_navigation_layout";
const SIDEBAR_EXPANDED_STORAGE_KEY = "stu_sidebar_expanded";

function getInitialNavigationLayout() {
  return localStorage.getItem(NAVIGATION_LAYOUT_STORAGE_KEY) === "topbar"
    ? "topbar"
    : "sidebar";
}

function getInitialSidebarExpanded() {
  return localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY) !== "false";
}

function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function AppShell() {
  const user = useProfileStore((state) => state.user);
  const loadingProfile = useProfileStore((state) => state.loadingProfile);
  const getAvatarUri = useProfileStore((state) => state.getAvatarUri);
  const hydrateProfile = useProfileStore((state) => state.hydrateProfile);
  const syncProfile = useProfileStore((state) => state.syncProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);

  const [navigationLayout, setNavigationLayout] = useState(
    getInitialNavigationLayout,
  );
  const [sidebarExpanded, setSidebarExpanded] = useState(
    getInitialSidebarExpanded,
  );

  const navigate = useNavigate();

  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const mustChangePassword = user?.generated_password_valid === true;
  const role = user?.role?.code;
  const location = useLocation();

  const handleLogout = () => {
    storage.remove("access_token");
    storage.remove("refresh_token");
    storage.remove("user");
    resetProfile();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleLogout();
    });
  }, [navigate]);

  useEffect(() => {
    void hydrateProfile();

    const handleStorageSync = (event) => {
      const key = event.detail?.key || event.key;
      void syncProfile(key);
    };

    window.addEventListener("storage", handleStorageSync);
    window.addEventListener(STORAGE_CHANGE_EVENT_NAME, handleStorageSync);

    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener(STORAGE_CHANGE_EVENT_NAME, handleStorageSync);
    };
  }, [hydrateProfile, syncProfile]);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname, navigationLayout]);

  const handleNavigationLayoutChange = (nextLayout) => {
    setNavigationLayout(nextLayout);
    localStorage.setItem(NAVIGATION_LAYOUT_STORAGE_KEY, nextLayout);
  };

  const handleSidebarExpandedChange = (nextExpanded) => {
    setSidebarExpanded(nextExpanded);
    localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(nextExpanded));
  };

  const canSeeUsers = [
    "director",
    "deputy_director",
    "developer",
    "pto",
  ].includes(role || "");
  const canSeeAnalytics = [
    "director",
    "deputy_director",
    "developer",
    "inzhkom_b_manager",
  ].includes(role || "");
  const canSeeMaterials =
    role === "developer" ||
    role?.includes("pto") ||
    role?.includes("estimator");

  if (loadingProfile && user?.generated_password_valid === undefined) {
    return <div className="app-loading">Загрузка профиля...</div>;
  }

  if (mustChangePassword && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  const avatarUrl = user?.profile_photo_url
    ? getAvatarUri(user.profile_photo_url)
    : null;

  const permissions = {
    analytics: canSeeAnalytics,
    materials: canSeeMaterials,
    users: canSeeUsers,
  };

  return (
    <div
      className={`app-shell app-shell--${navigationLayout}${
        navigationLayout === "sidebar" && sidebarExpanded
          ? " app-shell--sidebar-expanded"
          : ""
      }`}
    >
      {navigationLayout === "topbar" ? (
        <AppTopbar
          navigationHidden={mustChangePassword}
          user={user}
          avatarUrl={avatarUrl}
          permissions={permissions}
          onLayoutChange={handleNavigationLayoutChange}
        />
      ) : (
        <>
          <AppSidebar
            navigationHidden={mustChangePassword}
            user={user}
            avatarUrl={avatarUrl}
            permissions={permissions}
            mobileOpen={sidebarMobileOpen}
            expanded={sidebarExpanded}
            onMobileClose={() => setSidebarMobileOpen(false)}
            onExpandedChange={handleSidebarExpandedChange}
            onLayoutChange={handleNavigationLayoutChange}
          />

          {sidebarMobileOpen ? (
            <button
              className="app-sidebar__backdrop"
              type="button"
              aria-label="Закрыть боковое меню"
              onClick={() => setSidebarMobileOpen(false)}
            />
          ) : null}
        </>
      )}

      <div className="app-workspace">
        {navigationLayout === "sidebar" ? (
          <header className="app-sidebar-mobilebar">
            <button
              className="app-sidebar-mobilebar__menu"
              type="button"
              aria-controls="app-sidebar"
              aria-expanded={sidebarMobileOpen}
              aria-label={
                sidebarMobileOpen
                  ? "Закрыть боковое меню"
                  : "Открыть боковое меню"
              }
              onClick={() => setSidebarMobileOpen((isOpen) => !isOpen)}
            >
              {sidebarMobileOpen ? <HiXMark /> : <HiBars3 />}
            </button>

            <span className="app-sidebar-mobilebar__title">СТУ</span>

            <div className="app-sidebar-mobilebar__account">
              <NavigationLayoutToggle
                layout="sidebar"
                onChange={handleNavigationLayoutChange}
              />

              <ThemeToggle />

              <AppUserLink user={user} avatarUrl={avatarUrl} />
            </div>
          </header>
        ) : null}

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registration" element={<Navigate to="/login" replace />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="mail" element={<MailPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route
          path="projects/:projectId/access"
          element={<ProjectAccessPage />}
        />
        <Route
          path="projects/:projectId/sections/:sectionId"
          element={<SectionPage />}
        />

        <Route path="users" element={<UsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
}
