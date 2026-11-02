import { useRef, useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export const MATERIAL_IMPORT_ACCEPT = ".pdf,.xlsx,.docx";
export const MAX_MATERIAL_IMPORT_SIZE = 200 * 1024 * 1024;

export function validateMaterialImportFile(file: File) {
  if (!(file instanceof File)) return "Выберите файл на компьютере";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "xlsx", "docx"].includes(extension || "")) {
    return "Для импорта подходят только PDF, XLSX и DOCX";
  }
  if (!file.size) return "Выбранный файл пуст";
  if (file.size > MAX_MATERIAL_IMPORT_SIZE) return "Файл не должен превышать 200 МБ";
  return null;
}

function readImportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  try {
    return JSON.parse(message);
  } catch {
    return { error: message };
  }
}

function getImportError(error: unknown, fallback: string) {
  const failure = readImportFailure(error);
  const messages: Record<string, string> = {
    "material import parse failed": "Не удалось распознать строки расходов в файле",
    "material import not parsed": "Сначала обработайте файл и проверьте найденные строки",
    "project material import not found": "Файл импорта не найден. Обновите страницу",
    "project forbidden": "Нет доступа к этому действию в проекте",
    "forbidden": "Ваша роль не позволяет выполнить это действие",
    "file must be pdf, xlsx, or docx": "Выберите файл PDF, XLSX или DOCX",
    "file must be 20MB or smaller": "Файл превышает допустимый сервером размер",
    "file must be 200MB or smaller": "Файл не должен превышать 200 МБ",
    "cannot save file": "Сервер не смог сохранить файл",
  };
  return messages[failure?.error] || failure?.error || fallback;
}

function syncImportProject(project: { id: string } | undefined) {
  if (!project?.id) return;
  const cache = useDataCacheStore.getState();
  cache.setResource(`project:${project.id}`, project);
  cache.invalidateResource(`projectHistory:${project.id}`);
  if (cache.resources.projects?.loaded) {
    cache.updateResource<{ id: string }[]>(
      "projects",
      (projects) => projects.map((item) => item.id === project.id ? project : item),
      [],
    );
  }
}

export type ProjectMaterialImport = {
  id: string;
  project_id: string;
  source_file_type: "pdf" | "xlsx" | "docx";
  status: "uploaded" | "parsed" | "confirmed" | "failed";
  parse_error?: string | null;
  url: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by?: string | null;
  created_at: string;
};

export type ProjectMaterialImportItem = {
  id: string;
  row_index: number;
  type: string;
  material_type: string;
  quantity: string;
  unit_price?: string | null;
  raw_row: string;
  created_at: string;
};

type MaterialImportDetailResponse = {
  material_import: ProjectMaterialImport;
  items: ProjectMaterialImportItem[];
};

export function useMaterialImport() {
  const pending = useRef(false);
  const [uploadingImport, setUploadingImport] = useState(false);
  const [loadingImportDraft, setLoadingImportDraft] = useState(false);
  const [parsingImport, setParsingImport] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [materialImportError, setMaterialImportError] = useState<string | null>(
    null,
  );

  const uploadImport = async (projectId: string, file: File) => {
    if (pending.current) return null;
    const validationError = validateMaterialImportFile(file);
    if (validationError || !projectId) {
      setMaterialImportError(validationError || "Проект не указан");
      return null;
    }
    pending.current = true;
    try {
      setUploadingImport(true);
      setMaterialImportError(null);

      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await api.request(
        `api/v1/projects/${projectId}/material-imports`,
        {
          method: "POST",
          body: formData,
          headers: {
            accept: "application/json",
          },
        },
      );

      if (!response?.material_import?.id) {
        throw new Error("Сервер не подтвердил загрузку файла");
      }
      syncImportProject(response.project);
      return response.material_import as ProjectMaterialImport;
    } catch (error: unknown) {
      setMaterialImportError(getImportError(error, "Не удалось загрузить файл"));
      return null;
    } finally {
      setUploadingImport(false);
      pending.current = false;
    }
  };

  const getImportDraft = async (
    projectId: string,
    importId: string,
  ): Promise<MaterialImportDetailResponse | null> => {
    if (pending.current) return null;
    pending.current = true;
    try {
      setLoadingImportDraft(true);
      setMaterialImportError(null);

      const response = await api.get(
        `api/v1/projects/${projectId}/material-imports/${importId}`,
      );

      return response ?? null;
    } catch (error: unknown) {
      setMaterialImportError(
        getImportError(error, "Не удалось получить черновик импорта"),
      );
      return null;
    } finally {
      setLoadingImportDraft(false);
      pending.current = false;
    }
  };

  const parseImport = async (
    projectId: string,
    importId: string,
  ): Promise<MaterialImportDetailResponse | null> => {
    if (pending.current) return null;
    pending.current = true;
    try {
      setParsingImport(true);
      setMaterialImportError(null);

      const response = await api.request(
        `api/v1/projects/${projectId}/material-imports/${importId}/parse`,
        {
          method: "POST",
        },
      );

      useDataCacheStore.getState().invalidateResource(`project:${projectId}`);
      return response ?? null;
    } catch (error: unknown) {
      setMaterialImportError(getImportError(error, "Не удалось обработать файл"));
      const failure = readImportFailure(error);
      if (failure?.material_import?.id === importId) {
        return { material_import: failure.material_import, items: failure.items || [] };
      }
      return null;
    } finally {
      setParsingImport(false);
      pending.current = false;
    }
  };

  const addImportToExpenses = async (
    projectId: string,
    importId: string,
    sectionId?: string | null,
  ) => {
    if (pending.current) return null;
    pending.current = true;
    try {
      setConfirmingImport(true);
      setMaterialImportError(null);

      const response = await api.request(
        `api/v1/projects/${projectId}/material-imports/${importId}/add-to-expenses`,
        {
          method: "POST",
          body: JSON.stringify(sectionId ? { section_id: sectionId } : {}),
        },
      );

      if (response?.project?.id !== projectId) {
        throw new Error("Сервер не подтвердил добавление расходов");
      }
      syncImportProject(response.project);
      return response;
    } catch (error: unknown) {
      setMaterialImportError(
        getImportError(error, "Не удалось добавить расходы из черновика"),
      );
      return null;
    } finally {
      setConfirmingImport(false);
      pending.current = false;
    }
  };

  return {
    uploadingImport,
    loadingImportDraft,
    parsingImport,
    confirmingImport,
    materialImportError,
    uploadImport,
    getImportDraft,
    parseImport,
    addImportToExpenses,
    clearMaterialImportError: () => setMaterialImportError(null),
  };
}
