import { getStatusMeta } from "@/lib/projectMeta";

function getValue(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

const getSectionName = (source) =>
  getValue(source, [
    "subsection_name",
    "section_name",
    "name",
    "material_section_name",
  ]);

const getFileName = (source) =>
  getValue(source, [
    "display_name",
    "original_filename",
    "filename",
    "file_name",
    "name",
  ]);

const getExpenseName = (source) =>
  getValue(source, ["material_type", "name"]);

const getUserName = (source) =>
  getValue(source, ["user_full_name", "full_name", "name"]);

export function formatProjectHistoryItem(item) {
  const action = item?.action || "";
  const before = item?.before || {};
  const after = item?.after || {};

  switch (action) {
    case "project.created":
    case "project_created":
      return "Создал проект";
    case "project.updated":
    case "project_updated":
      return "Обновил данные проекта";
    case "project_status_updated":
    case "project.status_updated": {
      const from = getStatusMeta(before?.status).label;
      const to = getStatusMeta(after?.status).label;
      return before?.status
        ? `Изменил статус проекта с "${from}" на "${to}"`
        : `Изменил статус проекта на "${to}"`;
    }
    case "project_deadlines_updated":
    case "project.deadlines_updated":
      return "Обновил сроки проекта";
    case "material_section_created":
    case "project.material_section_created":
      return `Создал подраздел "${getSectionName(after) || "без названия"}"`;
    case "material_section_updated":
    case "project.material_section_updated":
      return `Обновил подраздел "${getSectionName(after) || getSectionName(before) || "без названия"}"`;
    case "material_section_deleted":
    case "project.material_section_deleted":
      return `Удалил подраздел "${getSectionName(before) || "без названия"}"`;
    case "big_section_created":
    case "project.big_section_created":
      return `Создал раздел "${getSectionName(after) || "без названия"}"`;
    case "big_section_updated":
    case "project.big_section_updated":
      return `Обновил раздел "${getSectionName(after) || getSectionName(before) || "без названия"}"`;
    case "big_section_deleted":
    case "project.big_section_deleted":
      return `Удалил раздел "${getSectionName(before) || "без названия"}"`;
    case "project_file_uploaded":
    case "project.file_uploaded":
      return `Загрузил файл проекта "${getFileName(after) || "без названия"}"`;
    case "project_file_renamed":
    case "project.file_renamed": {
      const from = getFileName(before);
      const to = getFileName(after);
      return from && to && from !== to
        ? `Переименовал файл проекта "${from}" в "${to}"`
        : `Переименовал файл проекта "${to || from || "без названия"}"`;
    }
    case "project_file_deleted":
    case "project.file_deleted":
      return `Удалил файл проекта "${getFileName(before) || "без названия"}"`;
    case "material_section_file_uploaded":
    case "project.material_section_file_uploaded":
      return `Загрузил файл в подраздел "${getSectionName(after) || "без названия"}"`;
    case "material_section_file_renamed":
    case "project.material_section_file_renamed":
      return `Переименовал файл подраздела "${getFileName(after) || getFileName(before) || "без названия"}"`;
    case "material_section_file_deleted":
    case "project.material_section_file_deleted":
      return `Удалил файл подраздела "${getFileName(before) || "без названия"}"`;
    case "project.material_expense_created":
      return `Добавил расход "${getExpenseName(after) || "без названия"}"`;
    case "project.material_expense_updated":
      return `Обновил расход "${getExpenseName(after) || getExpenseName(before) || "без названия"}"`;
    case "project.material_expense_deleted":
      return `Удалил расход "${getExpenseName(before) || "без названия"}"`;
    case "project.material_expense_paid":
      return `Отметил расход "${getExpenseName(after) || getExpenseName(before) || "без названия"}" как оплаченный`;
    case "project.material_expense_unpaid":
      return `Снял отметку оплаты с расхода "${getExpenseName(after) || getExpenseName(before) || "без названия"}"`;
    case "project.material_import_uploaded":
      return `Загрузил файл импорта "${getFileName(after) || "без названия"}"`;
    case "project.material_import_parsed":
      return `Распознал импорт "${getFileName(after?.material_import || after) || "без названия"}"`;
    case "material_import_added_to_expenses":
    case "project.material_import_added_to_expenses":
      return "Добавил позиции из импорта в расходы";
    case "project_material_import_deleted":
    case "project.material_import_deleted":
      return `Удалил импорт "${getFileName(before?.material_import || before) || "без названия"}"`;
    case "project_comment_created":
    case "project.comment_created":
      return "Добавил комментарий";
    case "project_comment_deleted":
    case "project.comment_deleted":
      return "Удалил комментарий";
    case "project_access_created":
    case "project.access_granted":
      return "Выдал доступ к проекту";
    case "project_access_updated":
    case "project.access_updated":
      return "Обновил ролевой доступ к проекту";
    case "project_access_deleted":
    case "project.access_revoked":
      return "Удалил ролевой доступ к проекту";
    case "project_user_access_created":
    case "project.user_access_granted":
      return `Выдал персональный доступ пользователю "${getUserName(after) || "без имени"}"`;
    case "project_user_access_updated":
    case "project.user_access_updated":
      return `Обновил персональный доступ пользователя "${getUserName(after) || getUserName(before) || "без имени"}"`;
    case "project_user_access_deleted":
    case "project.user_access_revoked":
      return `Удалил персональный доступ пользователя "${getUserName(before) || "без имени"}"`;
    case "project_worker_created":
      return `Добавил работника "${getUserName(after) || "без имени"}"`;
    case "project_worker_deleted":
      return `Удалил работника "${getUserName(before) || "без имени"}"`;
    default:
      return action
        ? action
            .replace(/^project[._]?/, "")
            .replace(/^material_/, "material ")
            .replace(/[_\.]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "Изменил проект";
  }
}
