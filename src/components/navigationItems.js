import { FaRegChartBar } from "react-icons/fa";
import { FaRegEnvelope, FaRegFolderClosed } from "react-icons/fa6";
import { LuLayers3, LuUsersRound } from "react-icons/lu";

export const navigationItems = [
  {
    to: "/projects",
    label: "Объекты",
    icon: FaRegFolderClosed,
  },
  {
    to: "/analytics",
    label: "Аналитика",
    icon: FaRegChartBar,
    permission: "analytics",
  },
  {
    to: "/materials",
    label: "Материалы",
    icon: LuLayers3,
    permission: "materials",
  },
  {
    to: "/mail",
    label: "Почта",
    icon: FaRegEnvelope,
  },
  {
    to: "/users",
    label: "Пользователи",
    icon: LuUsersRound,
    permission: "users",
  },
];

export function getVisibleNavigationItems(permissions) {
  return navigationItems.filter(
    (item) => !item.permission || permissions[item.permission],
  );
}
