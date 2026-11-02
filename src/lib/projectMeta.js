export const PROJECT_STATUS_META = {
  project_analysis: {
    label: "Анализ проекта",
    color: "#f6741b",
  },
  preparing_material_list: { label: "Формирование списка", color: "#38a89d" },
  preparing_work_schedule: { label: "Формирование графика", color: "#8a41d0" },
  preparing_contract: { label: "Подготовка договора", color: "#1f8a55" },
  purchase_request: { label: "Заявка на закупку", color: "#1768d6" },
  supply: { label: "В снабжении", color: "#cb4b53" },
  delivery_confirmation: { label: "Поставка подтверждена", color: "#228b5f" },
};

export const PROJECT_STATUS_TRANSITIONS = [
  {
    from: "project_analysis",
    to: "preparing_material_list",
    label: "На формирование списка",
    color: "#e4a755",
  },
  {
    from: "preparing_material_list",
    to: "preparing_work_schedule",
    label: "Формирование графика",
    color: "#324e83",
  },
  {
    from: "preparing_work_schedule",
    to: "preparing_contract",
    label: "Подготовка договора",
    color: "#6a4c93",
  },
  {
    from: "preparing_contract",
    to: "purchase_request",
    label: "Заявка на закупку",
    color: "#198754",
  },
  {
    from: "purchase_request",
    to: "supply",
    label: "В снабжение",
    color: "#0d6efd",
  },
  {
    from: "supply",
    to: "delivery_confirmation",
    label: "Подтвердить поставку",
    color: "#dc3545",
  },
];

export function canTransitionProjectStatus(role, from, to) {
  if (
    ["developer", "director", "deputy_director", "inzkhkom_manager"].includes(
      role,
    )
  ) {
    return true;
  }

  if (["pto", "head_pto", "estimator_plus"].includes(role)) {
    return from === "project_analysis" && to === "preparing_material_list";
  }

  if (role === "brigadier") {
    return (
      (from === "project_analysis" && to === "preparing_material_list") ||
      (from === "preparing_material_list" &&
        to === "preparing_work_schedule") ||
      (from === "preparing_contract" && to === "purchase_request")
    );
  }

  if (role === "material_buyer") {
    return (
      (from === "purchase_request" && to === "supply") ||
      (from === "supply" && to === "delivery_confirmation")
    );
  }

  return false;
}

export const PROJECT_SORT_OPTIONS = {
  newest: "Сначала новые",
  oldest: "Сначала старые",
  name: "По алфавиту",
};

export function getStatusMeta(status) {
  return (
    PROJECT_STATUS_META[status] ?? {
      label: status || "Без статуса",
      color: "#6b7280",
    }
  );
}

export function withAlpha(hexColor, alpha) {
  const hex = hexColor.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  const int = Number.parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function canCreateProject(role) {
  return [
    "director",
    "deputy_director",
    "site_manager",
    "developer",
    "estimator_plus",
    "pto",
  ].includes(role || "");
}

export function canManageProjectUsers(role) {
  return [
    "director",
    "deputy_director",
    "developer",
    "pto",
    "estimator_plus",
  ].includes(role || "");
}

export function canEditProject(user, project) {
  const role = user?.role?.code;
  const company = user?.company?.code;
  if (user?.status !== "active") return false;

  if (company === "tsk_stu" && [
    "director", "deputy_director", "estimator_plus", "developer",
  ].includes(role)) return true;

  return Boolean(
    project?.user_access?.some((access) =>
      access.user?.id === user.id && access.can_edit) ||
    project?.access?.some((access) =>
      access.company?.code === company && access.role?.code === role && access.can_edit),
  );
}

export function canEditBigSections(user, project) {
  return [
    "director", "deputy_director", "site_manager", "developer",
    "estimator_plus", "pto", "subcontractor",
  ].includes(user?.role?.code) && canEditProject(user, project);
}
