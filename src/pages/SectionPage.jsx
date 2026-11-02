import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";

import { HistoryActionIcon } from "@/components/HistoryActionIcon";
import { SectionMaterialImport } from "@/components/SectionMaterialImport";
import { SectionExport } from "@/components/SectionExport";
import { useCreateExpense } from "@/hooks/expenses/expenseAdd";
import { useDeleteExpense } from "@/hooks/expenses/expenseDelete";
import { useToggleExpensePaid } from "@/hooks/expenses/expense_is_paid";
import { useExpenseHistory } from "@/hooks/expenses/useExpenseHistory";
import { useUploadExpensePhoto } from "@/hooks/expenses/expense_photo_hook";
import { useDeleteExpensePhoto } from "@/hooks/expenses/expense_photo_delete";
import { useExpensePhotos } from "@/hooks/expenses/expense_photo_download";
import { useUpdateExpense } from "@/hooks/expenses/expenseEdit";
import { useGetProject } from "@/hooks/projectRefresh";
import { useDeleteSectionFile } from "@/hooks/section/SectionFileDelete";
import { useDownloadSectionFile } from "@/hooks/section/SectionFileDownload";
import { useUploadSectionFile } from "@/hooks/section/SectionFileUpload";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMoney,
} from "@/lib/format";
import { TbReload } from "react-icons/tb";
import {
  FiBox,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiImage,
  FiPlus,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

const emptyExpense = {
  type: "",
  shop: "",
  material_type: "",
  quantity: "",
  unit_price: "",
  actual_unit_price: "",
  due_at: "",
  comment: "",
};

const SECTION_FILE_TYPE_META = {
  pdf: { label: "PDF", shortLabel: "PDF" },
  excel: { label: "Таблицы", shortLabel: "XLS" },
  word: { label: "Документы", shortLabel: "DOC" },
  image: { label: "Изображения", shortLabel: "IMG" },
  archive: { label: "Архивы", shortLabel: "ZIP" },
  other: { label: "Прочее", shortLabel: "FILE" },
};

const ALLOWED_SECTION_FILE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpeg",
  "jpg",
  "png",
]);

const MAX_SECTION_FILE_SIZE = 200 * 1024 * 1024;

function getSectionFileLabel(file) {
  return file?.display_name || file?.original_filename || "Файл";
}

function getSectionFileExtension(file) {
  const name = file?.original_filename || file?.display_name || "";
  return name.includes(".") ? name.split(".").pop().toLowerCase() : "";
}

function getSectionFileType(file) {
  const contentType = String(file?.content_type || "").toLowerCase();
  const extension = getSectionFileExtension(file);

  if (contentType.includes("pdf") || extension === "pdf") return "pdf";
  if (
    contentType.includes("excel") ||
    contentType.includes("sheet") ||
    extension === "xls" ||
    extension === "xlsx"
  ) {
    return "excel";
  }
  if (
    contentType.includes("word") ||
    contentType.includes("document") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return "word";
  }
  if (
    contentType.includes("image") ||
    ["jpg", "jpeg", "png"].includes(extension)
  ) {
    return "image";
  }
  if (["zip", "rar", "7z"].includes(extension)) return "archive";
  return "other";
}

function groupSectionFiles(files = []) {
  const groups = Object.keys(SECTION_FILE_TYPE_META).reduce((result, type) => {
    result[type] = [];
    return result;
  }, {});

  files.forEach((file) => groups[getSectionFileType(file)].push(file));

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([type, items]) => ({
      type,
      meta: SECTION_FILE_TYPE_META[type],
      files: [...items].sort(
        (first, second) =>
          new Date(second.created_at || 0).getTime() -
          new Date(first.created_at || 0).getTime(),
      ),
    }));
}

function SectionFileIcon({ type }) {
  const meta = SECTION_FILE_TYPE_META[type] || SECTION_FILE_TYPE_META.other;

  return (
    <span className={`section-file-icon section-file-icon--${type}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5" />
        {type === "image" ? (
          <>
            <circle cx="10" cy="12" r="1.2" />
            <path d="m8 18 3-3 2 2 2-2 2 2" />
          </>
        ) : type === "excel" ? (
          <path d="M9 11h6M9 15h6M12 10v7" />
        ) : (
          <path d="M9 12h6M9 16h6" />
        )}
      </svg>
      <small>{meta.shortLabel}</small>
    </span>
  );
}

function toApiDateTime(value) {
  return value ? `${value}T18:00:00+03:00` : null;
}

const EXPENSE_HISTORY_FIELD_LABELS = {
  material_type: "Название",
  quantity: "Количество",
  unit_price: "Плановая цена",
  actual_unit_price: "Фактическая цена",
  comment: "Комментарий",
  shop: "Магазин",
  due_at: "Срок оплаты",
  is_paid: "Оплата",
};

const HIDDEN_EXPENSE_HISTORY_FIELDS = new Set([
  "id",
  "project_id",
  "expense_id",
  "section_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "paid_by",
  "paid_at",
  "key_words",
  "photos",
  "files",
  "type",
]);

function normalizeExpenseHistoryValue(value) {
  return value === null || value === undefined || value === "" ? null : value;
}

function formatExpenseHistoryValue(field, value) {
  const normalized = normalizeExpenseHistoryValue(value);
  if (normalized === null) return "Не указано";

  if (field === "unit_price" || field === "actual_unit_price") {
    return formatMoney(normalized);
  }

  if (field === "due_at") {
    const date = new Date(normalized);
    return Number.isNaN(date.getTime())
      ? String(normalized)
      : new Intl.DateTimeFormat("ru-RU", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(date);
  }

  if (field === "is_paid") {
    return normalized ? "Оплачено" : "Не оплачено";
  }

  if (Array.isArray(normalized)) return normalized.join(", ");
  return String(normalized);
}

function getExpenseHistoryChanges(item) {
  if (item?.action === "photo_uploaded" || item?.action === "photo_deleted") {
    return [];
  }

  const before = item?.before || {};
  const after = item?.after || {};

  return Object.keys({ ...before, ...after })
    .filter(
      (field) =>
        !HIDDEN_EXPENSE_HISTORY_FIELDS.has(field) &&
        JSON.stringify(before[field]) !== JSON.stringify(after[field]),
    )
    .map((field) => ({
      field,
      label: EXPENSE_HISTORY_FIELD_LABELS[field] || field,
      before: formatExpenseHistoryValue(field, before[field]),
      after: formatExpenseHistoryValue(field, after[field]),
    }));
}

function formatExpenseHistoryItem(item) {
  const before = item?.before || {};
  const after = item?.after || {};
  const expenseName =
    after.material_type || before.material_type || "без названия";

  switch (item?.action) {
    case "created":
      return {
        title: `Создал расход «${expenseName}»`,
        changes: [],
        category: "expense",
      };
    case "created_from_import":
      return {
        title: `Добавил расход «${expenseName}» из импорта`,
        changes: [],
        category: "expense",
      };
    case "updated":
      return {
        title: `Изменил расход «${expenseName}»`,
        changes: getExpenseHistoryChanges(item),
        category: "expense",
      };
    case "paid_status_changed":
      return {
        title: after.is_paid
          ? `Отметил расход «${expenseName}» как оплаченный`
          : `Снял отметку оплаты с расхода «${expenseName}»`,
        changes: [],
        category: "status",
      };
    case "photo_uploaded":
      return {
        title: `Добавил фото к расходу «${expenseName}»`,
        changes: [],
        category: "photo",
      };
    case "photo_deleted":
      return {
        title: `Удалил фото у расхода «${expenseName}»`,
        changes: [],
        category: "photo",
      };
    case "deleted":
      return {
        title: `Удалил расход «${expenseName}»`,
        changes: [],
        category: "expense",
      };
    default:
      return {
        title: `Изменил данные расхода «${expenseName}»`,
        changes: getExpenseHistoryChanges(item),
        category: "expense",
      };
  }
}

export default function SectionPage() {
  const { projectId, sectionId } = useParams();
  const { getProject, refreshing } = useGetProject(projectId);
  const { createExpense, loadingAdd, error } = useCreateExpense();
  const { updateExpense, loadingUpdate } = useUpdateExpense();
  const { deleteExpense } = useDeleteExpense();
  const { togglePaid } = useToggleExpensePaid();
  const { getExpenseHistory } = useExpenseHistory();
  const { uploadPhoto, loadingMap: photoUploadLoadingMap } =
    useUploadExpensePhoto();
  const { deletePhoto, loadingMap: photoDeleteLoadingMap } =
    useDeleteExpensePhoto();
  const { getPhotoUri, loadingMap: photoDownloadLoadingMap } =
    useExpensePhotos();
  const {
    uploadSecFile,
    loadingSecFile,
    error: sectionFileError,
    clearError: clearSectionFileError,
  } = useUploadSectionFile();
  const {
    downloadSectionFile,
    loadingDownload: loadingSectionFileDownload,
    error: sectionFileDownloadError,
  } = useDownloadSectionFile();
  const {
    deleteSectionFile,
    loading: loadingSectionFileDelete,
    error: sectionFileDeleteError,
  } = useDeleteSectionFile();

  const [project, setProject] = useState(null);
  const [draft, setDraft] = useState(emptyExpense);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [historyMap, setHistoryMap] = useState({});
  const [historyOpenMap, setHistoryOpenMap] = useState({});
  const [historyLoadingMap, setHistoryLoadingMap] = useState({});
  const [photosOpenMap, setPhotosOpenMap] = useState({});
  const [photoPreviewMap, setPhotoPreviewMap] = useState({});
  const [photoUploadErrorMap, setPhotoUploadErrorMap] = useState({});
  const [draggingPhotoExpenseId, setDraggingPhotoExpenseId] = useState(null);
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);
  const [sectionFileDragging, setSectionFileDragging] = useState(false);
  const [sectionFileUploadNotice, setSectionFileUploadNotice] = useState("");
  const [sectionFilesUploading, setSectionFilesUploading] = useState(false);
  const sectionFilesPendingRef = useRef(false);
  const sectionFileInputRef = useRef(null);
  const expenseFormRef = useRef(null);
  const photoPreviewUrlsRef = useRef(new Set());

  const loadProject = async (force = false) => {
    const nextProject = await getProject(projectId, force);
    setProject(nextProject);
  };

  useEffect(() => {
    void loadProject(false);
  }, [projectId, sectionId]);

  useEffect(
    () => () => {
      photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const section = useMemo(() => {
    const nestedSections = (project?.big_sections || []).flatMap(
      (bigSection) => bigSection.inner_sections || [],
    );

    return (
      nestedSections.find((item) => item.id === sectionId) ||
      project?.material_sections?.find((item) => item.id === sectionId) ||
      null
    );
  }, [project, sectionId]);

  const groupedSectionFiles = useMemo(
    () => groupSectionFiles(section?.files || []),
    [section?.files],
  );

  const startEditing = (expense) => {
    setEditingExpenseId(expense.id);
    setDraft({
      material_type: expense.material_type || "",
      type: expense.type || "",
      shop: expense.shop || "",
      quantity: expense.quantity || "",
      unit_price: expense.unit_price || "",
      actual_unit_price: expense.actual_unit_price || "",
      due_at: expense.due_at?.slice(0, 10) || "",
      comment: expense.comment || "",
    });

    if (expenseFormRef.current) {
      const top =
        expenseFormRef.current.getBoundingClientRect().top +
        window.scrollY -
        25;

      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const resetDraft = () => {
    setEditingExpenseId(null);
    setDraft(emptyExpense);
  };

  const submit = async (event) => {
    event.preventDefault();

    const payload = {
      ...draft,
      due_at: toApiDateTime(draft.due_at),
      actual_unit_price: draft.actual_unit_price.trim() || null,
    };

    if (editingExpenseId) {
      await updateExpense(projectId, editingExpenseId, {
        ...payload,
        section_id: sectionId,
      });
    } else {
      await createExpense(
        {
          ...payload,
          section_id: sectionId,
        },
        projectId,
      );
    }

    resetDraft();
    await loadProject(true);
  };

  const toggleHistory = async (expenseId) => {
    const isOpen = Boolean(historyOpenMap[expenseId]);

    setHistoryOpenMap((current) => ({
      ...current,
      [expenseId]: !isOpen,
    }));

    if (isOpen || historyMap[expenseId]) return;

    setHistoryLoadingMap((current) => ({ ...current, [expenseId]: true }));
    const items = await getExpenseHistory(projectId, expenseId);
    setHistoryMap((current) => ({ ...current, [expenseId]: items }));
    setHistoryLoadingMap((current) => ({ ...current, [expenseId]: false }));
  };

  const ensurePhotoPreviews = async (expense) => {
    const missingPhotos = (expense.photos || []).filter(
      (photo) => !photoPreviewMap[photo.id],
    );

    if (!missingPhotos.length) return;

    const previews = await Promise.all(
      missingPhotos.map(async (photo) => ({
        photo,
        url: await getPhotoUri(expense.id, projectId, photo.id),
      })),
    );

    const loadedPreviews = {};
    previews.forEach(({ photo, url }) => {
      if (!url) return;
      photoPreviewUrlsRef.current.add(url);
      loadedPreviews[photo.id] = url;
    });

    if (Object.keys(loadedPreviews).length) {
      setPhotoPreviewMap((current) => ({ ...current, ...loadedPreviews }));
    }
  };

  useEffect(() => {
    (section?.expenses || [])
      .filter((expense) => photosOpenMap[expense.id])
      .forEach((expense) => ensurePhotoPreviews(expense));
  }, [section]);

  useEffect(() => {
    if (!activePhotoPreview) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setActivePhotoPreview(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activePhotoPreview]);

  const togglePhotos = async (expense) => {
    const willOpen = !photosOpenMap[expense.id];
    setPhotosOpenMap((current) => ({
      ...current,
      [expense.id]: !current[expense.id],
    }));

    if (willOpen) await ensurePhotoPreviews(expense);
  };

  const openPhoto = async (expense, photo) => {
    const cachedUrl = photoPreviewMap[photo.id];
    if (cachedUrl) {
      setActivePhotoPreview({ ...photo, url: cachedUrl });
      return;
    }

    const url = await getPhotoUri(expense.id, projectId, photo.id);
    if (url) {
      photoPreviewUrlsRef.current.add(url);
      setPhotoPreviewMap((current) => ({ ...current, [photo.id]: url }));
      setActivePhotoPreview({ ...photo, url });
    }
  };

  const uploadExpensePhotos = async (expense, files) => {
    const imageFiles = Array.from(files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (!imageFiles.length) {
      setPhotoUploadErrorMap((current) => ({
        ...current,
        [expense.id]: "Выберите изображения в формате JPG, PNG или WebP.",
      }));
      return;
    }

    setPhotoUploadErrorMap((current) => ({
      ...current,
      [expense.id]: "",
    }));
    setPhotosOpenMap((current) => ({ ...current, [expense.id]: true }));

    let failedCount = 0;
    for (const file of imageFiles) {
      const result = await uploadPhoto(expense.id, projectId, file);
      if (!result) failedCount += 1;
    }

    await loadProject(true);

    if (failedCount) {
      setPhotoUploadErrorMap((current) => ({
        ...current,
        [expense.id]: `Не удалось загрузить ${failedCount} из ${imageFiles.length} фото.`,
      }));
    }
  };

  const uploadSectionFiles = async (files) => {
    if (sectionFilesPendingRef.current) return;
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    clearSectionFileError();

    const invalidFile = selectedFiles.find(
      (file) =>
        !ALLOWED_SECTION_FILE_EXTENSIONS.has(
          file.name.split(".").pop()?.toLowerCase(),
        ),
    );
    if (invalidFile) {
      setSectionFileUploadNotice(
        `Файл «${invalidFile.name}» не поддерживается. Выберите PDF, DOC, DOCX, XLS, XLSX, JPG или PNG.`,
      );
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_SECTION_FILE_SIZE,
    );
    if (oversizedFile) {
      setSectionFileUploadNotice(
        `Файл «${oversizedFile.name}» превышает допустимый размер 200 МБ.`,
      );
      return;
    }

    setSectionFileUploadNotice("");
    sectionFilesPendingRef.current = true;
    setSectionFilesUploading(true);
    let uploadedCount = 0;

    try {
      for (const file of selectedFiles) {
        const result = await uploadSecFile(projectId, sectionId, file);
        if (result) {
          uploadedCount += 1;
          setProject(result.project);
        }
      }

      setSectionFileUploadNotice(
        uploadedCount === selectedFiles.length
          ? uploadedCount === 1
            ? "Файл успешно добавлен в подраздел."
            : `Загружено файлов: ${uploadedCount}.`
          : uploadedCount
            ? `Загружено ${uploadedCount} из ${selectedFiles.length} файлов. Остальные не удалось сохранить.`
            : "Файлы не загрузились. Проверьте формат, размер и доступ к подразделу.",
      );
    } finally {
      sectionFilesPendingRef.current = false;
      setSectionFilesUploading(false);
    }
  };

  const handleSectionFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await uploadSectionFiles(files);
  };

  if (!section && refreshing) {
    return <div className="notice">Загружаем раздел...</div>;
  }

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Link
          className="button project-icon-button"
          to={`/projects/${projectId}`}
          aria-label="Вернуться к проектам"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m14.5 6-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <button
          className="button project-icon-button"
          onClick={() => loadProject(true)}
        >
          <TbReload size={22} color="#6b7280" />
        </button>
      </div>

      <div className="page-header">
        <div>
          <span className="eyebrow">Раздел</span>
          <h1>{section?.name || "Раздел проекта"}</h1>
          <p>
            Проект {project?.name || "?"} · Код {section?.section_code || "?"}
          </p>
        </div>
      </div>

      <div className="two-column two-column--wide section-expense-layout">
        <section
          className={`panel section-expense-editor ${editingExpenseId ? "panel--editing-expense" : ""}`}
          ref={expenseFormRef}
        >
          <div className="section-expense-editor__heading">
            <h2>
              {editingExpenseId ? "Редактировать расход" : "Новый расход"}
            </h2>
          </div>

          {error ? (
            <div className="notice notice--error" role="alert">
              Ошибка: {error}
            </div>
          ) : null}
          <form
            className="section-expense-form"
            onSubmit={submit}
            aria-busy={loadingAdd || loadingUpdate}
          >
            <label className="field section-expense-form__material">
              <span>Материал</span>
              <input
                value={draft.material_type}
                placeholder="Название материала"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    material_type: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field section-expense-form__quantity">
              <span>Количество</span>
              <input
                value={draft.quantity}
                inputMode="decimal"
                placeholder="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field section-expense-form__price">
              <span>Плановая цена</span>
              <div className="section-expense-form__money">
                <input
                  value={draft.unit_price}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      unit_price: event.target.value,
                    }))
                  }
                  required
                />
                <span aria-hidden="true">₽</span>
              </div>
            </label>

            <label className="field section-expense-form__price">
              <span>Фактическая цена</span>
              <div className="section-expense-form__money">
                <input
                  value={draft.actual_unit_price}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      actual_unit_price: event.target.value,
                    }))
                  }
                />
                <span aria-hidden="true">₽</span>
              </div>
            </label>

            <label className="field section-expense-form__date">
              <span>Срок оплаты</span>
              <input
                type="date"
                value={draft.due_at}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    due_at: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field section-expense-form__type">
              <span>Тип</span>
              <input
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field section-expense-form__shop">
              <span>Магазин</span>
              <input
                value={draft.shop}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    shop: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="section-expense-form__actions">
              <button
                className="button button--primary"
                type="submit"
                disabled={loadingAdd || loadingUpdate}
              >
                {editingExpenseId ? (
                  <FiSave aria-hidden="true" />
                ) : (
                  <FiPlus aria-hidden="true" />
                )}
                {loadingAdd || loadingUpdate
                  ? "Сохраняем..."
                  : editingExpenseId ? "Сохранить расход" : "Добавить расход"}
              </button>

              {editingExpenseId ? (
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={resetDraft}
                  disabled={loadingAdd || loadingUpdate}
                >
                  Отмена
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-title">
            <h2>Сводка раздела</h2>
          </div>

          <div className="list" style={{ fontWeight: 200 }}>
            <div className="list-item">
              <strong>План</strong>
              <span>
                {formatMoney(
                  section?.planned_materials_cost ||
                    section?.total_materials_cost,
                )}
              </span>
            </div>
            <div className="list-item">
              <strong>Факт</strong>
              <span>
                {formatMoney(
                  section?.actual_materials_cost ||
                    section?.total_materials_cost,
                )}
              </span>
            </div>
            <div className="list-item">
              <strong>Расходов</strong>
              <span>{section?.expenses?.length || 0}</span>
            </div>
          </div>
        </section>
      </div>

      <SectionMaterialImport
        key={`${projectId}:${sectionId}`}
        project={project}
        section={section}
        onProjectUpdated={setProject}
      />

      <section className="panel section-files-panel">
        <div className="section-files-panel__header">
          <div>
            <h2>Файлы раздела</h2>
            <p>
              {(section?.files || []).length
                ? `${section.files.length} прикреплено`
                : "Документы, таблицы и изображения"}
            </p>
          </div>
        </div>

        <label
          className={`section-file-dropzone ${sectionFileDragging ? "is-dragging" : ""} ${sectionFilesUploading ? "is-loading" : ""}`}
          role="button"
          tabIndex={sectionFilesUploading ? -1 : 0}
          aria-label="Добавить файлы в подраздел"
          aria-disabled={sectionFilesUploading}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!sectionFilesUploading) sectionFileInputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setSectionFileDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setSectionFileDragging(false);
            }
          }}
          onDrop={async (event) => {
            event.preventDefault();
            setSectionFileDragging(false);
            await uploadSectionFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={sectionFileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpeg,.jpg,.png"
            disabled={sectionFilesUploading || loadingSecFile}
            onChange={handleSectionFileUpload}
          />
          <span className="section-file-dropzone__icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4M8 8l4-4 4 4" />
              <path d="M5 14v5h14v-5" />
            </svg>
          </span>
          <span className="section-file-dropzone__copy">
            <strong>
              {sectionFilesUploading
                ? "Загружаем файлы..."
                : "Перетащите файлы или выберите на компьютере"}
            </strong>
            <small>PDF, Word, Excel, JPG и PNG · до 200 МБ</small>
          </span>
          {!sectionFilesUploading && (
            <span className="button button--ghost">Выбрать файлы</span>
          )}
        </label>

        {sectionFileError ||
        sectionFileDownloadError ||
        sectionFileDeleteError ? (
          <div className="notice notice--error section-files-notice">
            {sectionFileError ||
              sectionFileDownloadError ||
              sectionFileDeleteError}
          </div>
        ) : sectionFileUploadNotice ? (
          <div className="notice section-files-notice">
            {sectionFileUploadNotice}
          </div>
        ) : null}

        {groupedSectionFiles.length > 0 ? (
          <div className="section-file-groups">
            {groupedSectionFiles.map((group) => (
              <div className="section-file-group" key={group.type}>
                <div className="section-file-group__header">
                  <div>
                    <span
                      className={`section-file-group__mark section-file-group__mark--${group.type}`}
                    />
                    <strong>{group.meta.label}</strong>
                  </div>
                  <span>{group.files.length}</span>
                </div>

                <div className="section-file-list">
                  {group.files.map((file) => (
                    <article className="section-file-card" key={file.id}>
                      <SectionFileIcon type={group.type} />
                      <button
                        className="section-file-card__open"
                        type="button"
                        disabled={loadingSectionFileDownload}
                        onClick={() =>
                          downloadSectionFile(
                            projectId,
                            sectionId,
                            file.id,
                            getSectionFileLabel(file),
                          )
                        }
                      >
                        <strong title={getSectionFileLabel(file)}>
                          {getSectionFileLabel(file)}
                        </strong>
                        <span>
                          {formatFileSize(file.size_bytes)}
                          {file.created_at
                            ? ` · ${formatDate(file.created_at)}`
                            : ""}
                        </span>
                      </button>
                      <div className="section-file-card__actions">
                        <button
                          type="button"
                          aria-label={`Скачать ${getSectionFileLabel(file)}`}
                          title="Скачать"
                          disabled={loadingSectionFileDownload}
                          onClick={() =>
                            downloadSectionFile(
                              projectId,
                              sectionId,
                              file.id,
                              getSectionFileLabel(file),
                            )
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
                          </svg>
                        </button>
                        <button
                          className="is-danger"
                          type="button"
                          aria-label={`Удалить ${getSectionFileLabel(file)}`}
                          title="Удалить"
                          disabled={loadingSectionFileDelete}
                          onClick={async () => {
                            if (
                              window.confirm(
                                `Удалить файл «${getSectionFileLabel(file)}»?`,
                              )
                            ) {
                              const deleted = await deleteSectionFile(
                                projectId,
                                sectionId,
                                file.id,
                              );
                              if (deleted) await loadProject(true);
                            }
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="section-files-empty">
            Загруженные файлы появятся здесь и автоматически разделятся по типу.
          </div>
        )}
      </section>

      <section
        className="panel"
        style={{ padding: "20px 0", borderRadius: 12 }}
      >
        <div className="section-expenses-heading">
          <h2>Расходы раздела</h2>
          <SectionExport key={`${projectId}:${sectionId}`} project={project} section={section} />
        </div>

        <div className="expense-list">
          <div className="expense-list__head" aria-hidden="true">
            <span>Название</span>
            <span>Детали</span>
            <span>Оплачено</span>
            <span>Действия</span>
          </div>
          {(section?.expenses || []).map((expense) => (
            <article
              className={`expense-card ${editingExpenseId === expense.id ? "expense-card--editing" : ""}`}
              key={expense.id}
            >
              <div className="expense-card__identity">
                <span className="expense-card__icon" aria-hidden="true">
                  <FiBox />
                </span>
                <div className="expense-card__title-row">
                  <div className="expense-card__title-line">
                    <h3>{expense.material_type || "Расход без названия"}</h3>
                  </div>

                  <span>
                    {[expense.type, expense.shop].filter(Boolean).join(" · ") ||
                      "Расход"}
                  </span>
                </div>
              </div>

              <div>
                <span
                  className={`chip chip--static expense-card__status ${expense.is_paid ? "chip--success" : "chip--failed"}`}
                >
                  {expense.is_paid ? "Оплачено" : "Не оплачено"}
                </span>
              </div>

              <div className="expense-card__properties">
                <div>
                  <span>Количество х Цена</span>
                  <strong>
                    {expense.quantity || 0} шт ×{" "}
                    {formatMoney(
                      expense.actual_unit_price || expense.unit_price,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Оплатить до</span>
                  <strong>
                    {expense.due_at
                      ? formatDate(expense.due_at, { month: "2-digit" })
                      : "Не указано"}
                  </strong>
                </div>
                {expense.comment ? (
                  <p className="expense-card__comment">{expense.comment}</p>
                ) : null}
              </div>

              <div className="expense-card__actions">
                <button
                  className="expense-action"
                  type="button"
                  aria-label="Изменить расход"
                  title="Изменить"
                  onClick={() => startEditing(expense)}
                >
                  <FiEdit2 aria-hidden="true" />
                </button>

                <button
                  className={`expense-action ${photosOpenMap[expense.id] ? "is-active" : ""}`}
                  type="button"
                  aria-label="Фотографии"
                  title="Фотографии"
                  onClick={() => togglePhotos(expense)}
                >
                  <FiImage aria-hidden="true" />
                  {(expense.photos || []).length > 0 && (
                    <span className="expense-photo-count">
                      {expense.photos.length}
                    </span>
                  )}
                </button>

                <button
                  className={`expense-action ${historyOpenMap[expense.id] ? "is-active" : ""}`}
                  type="button"
                  aria-label="История"
                  title="История"
                  onClick={() => toggleHistory(expense.id)}
                >
                  <FiClock aria-hidden="true" />
                </button>

                <button
                  className={`expense-action ${expense.is_paid ? "is-active" : ""}`}
                  type="button"
                  aria-label={
                    expense.is_paid
                      ? "Снять отметку об оплате"
                      : "Отметить как оплаченный"
                  }
                  title={expense.is_paid ? "Снять оплату" : "Оплачено"}
                  onClick={async () => {
                    await togglePaid(projectId, expense.id, expense.is_paid);
                    await loadProject(true);
                  }}
                >
                  <FiCheckCircle aria-hidden="true" />
                </button>
                <button
                  className="expense-action expense-action--danger"
                  type="button"
                  aria-label="Удалить расход"
                  title="Удалить"
                  onClick={async () => {
                    if (window.confirm("Удалить расход?")) {
                      await deleteExpense(projectId, expense.id);
                      await loadProject(true);
                    }
                  }}
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
              <div
                className={`expense-photos ${photosOpenMap[expense.id] ? "is-open" : ""}`}
                aria-hidden={!photosOpenMap[expense.id]}
              >
                <div className="expense-photos__inner">
                  <div className="expense-photos__header">
                    <div>
                      <h4>Фотографии расхода</h4>
                      <span>
                        {(expense.photos || []).length
                          ? `${expense.photos.length} загружено`
                          : "Пока нет фотографий"}
                      </span>
                    </div>
                  </div>

                  <label
                    className={`expense-photo-dropzone ${draggingPhotoExpenseId === expense.id ? "is-dragging" : ""} ${photoUploadLoadingMap[expense.id] ? "is-loading" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDraggingPhotoExpenseId(expense.id);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setDraggingPhotoExpenseId(null);
                      }
                    }}
                    onDrop={async (event) => {
                      event.preventDefault();
                      setDraggingPhotoExpenseId(null);
                      await uploadExpensePhotos(
                        expense,
                        event.dataTransfer.files,
                      );
                    }}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={photoUploadLoadingMap[expense.id]}
                      onChange={async (event) => {
                        const files = Array.from(event.target.files || []);

                        console.log("files", files);

                        event.target.value = "";

                        await uploadExpensePhotos(expense, files);
                      }}
                    />
                    <span className="expense-photo-dropzone__icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3.5" y="5" width="17" height="14" rx="2" />
                        <circle cx="8.5" cy="9.5" r="1.2" />
                        <path d="m5.5 16 4-4 3 3 2-2 4 3" />
                        <path d="M18.5 3.5v4M16.5 5.5h4" />
                      </svg>
                    </span>
                    <span className="expense-photo-dropzone__copy">
                      <strong>
                        {photoUploadLoadingMap[expense.id]
                          ? "Загружаем фотографии..."
                          : "Выберите или перетащите фотографии"}
                      </strong>

                      <small>Можно загрузить несколько JPG, PNG или WebP</small>
                    </span>
                    {!photoUploadLoadingMap[expense.id] && (
                      <span className="button button--ghost">
                        Выбрать файлы
                      </span>
                    )}
                  </label>

                  {photoUploadErrorMap[expense.id] && (
                    <div className="notice notice--error expense-photo-error">
                      {photoUploadErrorMap[expense.id]}
                    </div>
                  )}

                  {(expense.photos || []).length > 0 && (
                    <div className="photo-grid">
                      {(expense.photos || []).map((photo) => (
                        <div className="photo-card" key={photo.id}>
                          <button
                            className="photo-card__preview"
                            type="button"
                            aria-label={`Открыть ${photo.original_filename || "фотографию"}`}
                            onClick={() => openPhoto(expense, photo)}
                          >
                            {photoPreviewMap[photo.id] ? (
                              <img
                                src={photoPreviewMap[photo.id]}
                                alt={photo.original_filename || "Фото расхода"}
                              />
                            ) : photoDownloadLoadingMap[photo.id] ? (
                              <span className="photo-card__loading">
                                Загружаем превью...
                              </span>
                            ) : (
                              <span className="photo-card__loading">
                                Открыть фотографию
                              </span>
                            )}
                          </button>
                          <div className="photo-card__footer">
                            <span title={photo.original_filename}>
                              {photo.original_filename || "Фотография"}
                            </span>
                            <button
                              className="photo-card__delete"
                              type="button"
                              aria-label="Удалить фотографию"
                              title="Удалить фотографию"
                              disabled={photoDeleteLoadingMap[photo.id]}
                              onClick={async () => {
                                if (window.confirm("Удалить эту фотографию?")) {
                                  await deletePhoto(
                                    expense.id,
                                    projectId,
                                    photo.id,
                                  );
                                  const previewUrl = photoPreviewMap[photo.id];
                                  if (previewUrl) {
                                    URL.revokeObjectURL(previewUrl);
                                    photoPreviewUrlsRef.current.delete(
                                      previewUrl,
                                    );
                                    setPhotoPreviewMap((current) => {
                                      const next = { ...current };
                                      delete next[photo.id];
                                      return next;
                                    });
                                  }
                                  await loadProject(true);
                                }
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div
                className={`expense-history ${historyOpenMap[expense.id] ? "is-open" : ""}`}
                aria-hidden={!historyOpenMap[expense.id]}
              >
                <div className="expense-history__inner">
                  <h4>История</h4>
                  {historyLoadingMap[expense.id] ? (
                    <div className="muted">Загружаем историю...</div>
                  ) : historyMap[expense.id]?.length ? (
                    <div className="timeline">
                      {historyMap[expense.id].map((item) => {
                        const formattedItem = formatExpenseHistoryItem(item);

                        return (
                          <div
                            className={`timeline-item timeline-item--with-icon timeline-item--${formattedItem.category}`}
                            key={item.id}
                          >
                            <HistoryActionIcon type={formattedItem.category} />
                            <div className="timeline-item__content">
                              <div className="timeline-item__head">
                                <strong>
                                  {item.changed_by?.full_name || "Система"}
                                </strong>
                                <span>{formatDateTime(item.created_at)}</span>
                              </div>
                              <p>{formattedItem.title}</p>
                              {formattedItem.changes.length > 0 && (
                                <div className="expense-history__changes">
                                  {formattedItem.changes.map((change) => (
                                    <div
                                      className="expense-history__change"
                                      key={change.field}
                                    >
                                      <span>{change.label}</span>
                                      <div>
                                        <del>{change.before}</del>
                                        <span aria-hidden="true">→</span>
                                        <strong>{change.after}</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="muted">История пока пуста.</div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {activePhotoPreview && (
        <div
          className="expense-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фотографии расхода"
          onClick={() => setActivePhotoPreview(null)}
        >
          <div
            className="expense-photo-lightbox__content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="expense-photo-lightbox__close"
              type="button"
              aria-label="Закрыть"
              title="Закрыть"
              onClick={() => setActivePhotoPreview(null)}
            >
              ×
            </button>

            <img
              src={activePhotoPreview.url}
              alt={activePhotoPreview.original_filename || "Фото расхода"}
            />
            <div>{activePhotoPreview.original_filename || "Фотография"} </div>
          </div>
        </div>
      )}
    </div>
  );
}
