import { useRef, useState } from "react";

import { api } from "@/hooks/api_client";
import { saveBlob } from "@/lib/download";

export const EXCEL_EXPORT_ROLES = [
  "director", "deputy_director", "site_manager", "brigadier",
  "estimator_plus", "pto", "material_buyer", "developer", "inzhkom_b_manager",
];

type ExportFormat = "word" | "excel";

function getExportError(error: unknown) {
  let message = error instanceof Error ? error.message : "";
  try {
    message = JSON.parse(message)?.error || message;
  } catch {
    // Server errors may be plain text.
  }
  const messages: Record<string, string> = {
    "project forbidden": "Нет доступа к экспорту этого объекта",
    "forbidden": "Ваша роль не позволяет выполнить этот экспорт",
    "material section not found": "Подраздел не найден. Обновите страницу",
    "project not found": "Объект не найден. Обновите страницу",
    "internal server error": "Сервер не смог подготовить файл. Попробуйте ещё раз",
  };
  return messages[message] || message || "Не удалось экспортировать файл";
}

function fileName(value: string, fallback: string) {
  return value.replace(/[\x00-\x1f<>:"/\\|?*]/g, "_").trim().slice(0, 120).replace(/[. ]+$/, "") || fallback;
}

export function useSectionExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  const exportFile = async (
    projectId: string,
    sectionId: string,
    format: ExportFormat,
    name: string,
  ) => {
    if (pending.current) return false;
    if (!projectId || (format === "word" && !sectionId)) {
      setError("Объект или подраздел не указан");
      return false;
    }

    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const route = format === "word"
        ? `api/v1/projects/${projectId}/material-sections/${sectionId}/document`
        : `api/v1/projects/${projectId}/material-expenses/export.xlsx`;
      const blob = await api.download(route);
      if (!blob?.size) throw new Error("Сервер вернул пустой файл");
      if (blob.type.includes("json") || blob.type.startsWith("text/")) {
        throw new Error(await blob.text() || "Сервер вернул ошибку вместо файла");
      }
      saveBlob(blob, `${fileName(name, format === "word" ? "Подраздел" : "Расходы объекта")}.${format === "word" ? "docx" : "xlsx"}`);
      return true;
    } catch (requestError) {
      setError(getExportError(requestError));
      return false;
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return { exportFile, loading, error };
}
