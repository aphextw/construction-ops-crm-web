import { useEffect, useRef, useState } from "react";
import { TbCheck, TbFileImport, TbReload, TbUpload, TbX } from "react-icons/tb";

import {
  MATERIAL_IMPORT_ACCEPT,
  useMaterialImport,
  validateMaterialImportFile,
} from "@/hooks/expenses/useMaterialImport";
import { canEditProject } from "@/lib/projectMeta";
import { useProfileStore } from "@/store/useProfileStore";

const UPLOAD_ROLES = ["director", "deputy_director", "estimator_plus", "pto", "developer"];
const PARSE_ROLES = [...UPLOAD_ROLES, "inzhkom_b_manager"];
const STATUS_LABELS = {
  uploaded: "Файл загружен",
  parsed: "Черновик готов",
  failed: "Не удалось обработать",
  confirmed: "Добавлено в расходы",
};

const importPriceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});

function formatImportPrice(value) {
  if (value == null || value === "") return "Не указана";
  const amount = Number(value);
  return Number.isFinite(amount) ? importPriceFormatter.format(amount) : String(value);
}

export function SectionMaterialImport({ project, section, onProjectUpdated }) {
  const user = useProfileStore((state) => state.user);
  const role = user?.role?.code;
  const canUpload = user?.status === "active" && UPLOAD_ROLES.includes(role);
  const canParse = user?.status === "active" && PARSE_ROLES.includes(role);
  const canConfirm = canParse && canEditProject(user, project);
  const {
    uploadingImport, loadingImportDraft, parsingImport, confirmingImport,
    materialImportError, clearMaterialImportError,
    uploadImport, getImportDraft, parseImport, addImportToExpenses,
  } = useMaterialImport();
  const [currentImport, setCurrentImport] = useState(null);
  const [knownImports, setKnownImports] = useState([]);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  const runOperation = async (operation) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    try {
      await operation();
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  };

  const applyDraft = (draft) => {
    if (!draft?.material_import) return;
    setCurrentImport(draft.material_import);
    rememberImport(draft.material_import);
    setItems(draft.items || []);
  };

  const rememberImport = (materialImport) => {
    setKnownImports((current) => [
      ...current.filter((item) => item.id !== materialImport.id), materialImport,
    ]);
  };

  const handleUpload = (files) => {
    if (!canUpload || pendingRef.current || !project?.id || !section?.id) return;
    const selected = Array.from(files || []);
    if (!selected.length) return;
    clearMaterialImportError();
    const error = selected.length !== 1
      ? "Выберите один файл для импорта"
      : validateMaterialImportFile(selected[0]);
    setValidationError(error || "");
    if (error) return;
    setNotice("");
    setCurrentImport(null);
    setItems([]);
    setOpen(true);
    void runOperation(async () => {
      const uploaded = await uploadImport(project.id, selected[0]);
      if (!uploaded) return;
      setCurrentImport(uploaded);
      rememberImport(uploaded);
      applyDraft(await parseImport(project.id, uploaded.id));
    });
  };

  const openDraft = (materialImport) => {
    if (pendingRef.current) return;
    clearMaterialImportError();
    setValidationError("");
    setCurrentImport(materialImport);
    setItems([]);
    setOpen(true);
    void runOperation(async () => applyDraft(await getImportDraft(project.id, materialImport.id)));
  };

  const handleParse = () => {
    if (!canParse || !currentImport || currentImport.status === "confirmed") return;
    void runOperation(async () => applyDraft(await parseImport(project.id, currentImport.id)));
  };

  const handleConfirm = () => {
    if (!canConfirm || !section?.id || currentImport?.status !== "parsed" || !items.length) return;
    void runOperation(async () => {
      const response = await addImportToExpenses(project.id, currentImport.id, section.id);
      if (!response?.project) return;
      onProjectUpdated(response.project);
      setKnownImports((current) => current.filter((item) => item.id !== currentImport.id));
      setCurrentImport(null);
      setItems([]);
      setOpen(false);
      setNotice(`В подраздел добавлено расходов: ${response.imported_expenses ?? response.expenses?.length ?? 0}.`);
    });
  };

  const close = () => { if (!pendingRef.current) setOpen(false); };
  const handleDialogKey = (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current.querySelectorAll(
      'button:not(:disabled), [href], input:not(:disabled), summary, [tabindex="0"]',
    )).filter((element) => element.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  if (!canParse || !section?.id) return null;
  const drafts = new Map((project?.material_imports || [])
    .filter((item) => item.status !== "confirmed").map((item) => [item.id, item]));
  knownImports.forEach((item) => {
    if (item.status !== "confirmed") drafts.set(item.id, item);
    else drafts.delete(item.id);
  });
  if (currentImport && currentImport.status !== "confirmed") drafts.set(currentImport.id, currentImport);
  const error = materialImportError || validationError;
  const processingLabel = uploadingImport ? "Загружаем файл..."
    : parsingImport ? "Распознаём строки расходов..."
      : confirmingImport ? "Добавляем расходы в подраздел..." : "Загружаем черновик...";

  return (
    <section className="section-material-import" aria-label="Импорт расходов">
      <div
        className={`section-material-import__toolbar${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); if (canUpload && !busy) setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); handleUpload(event.dataTransfer.files); }}
      >
        <TbFileImport aria-hidden="true" />
        <div><h2>Импорт расходов</h2><p>PDF, XLSX, DOCX · до 200 МБ</p></div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={MATERIAL_IMPORT_ACCEPT}
          disabled={!canUpload || busy}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = "";
            handleUpload(files);
          }}
        />
        {canUpload ? (
          <button className="button button--ghost" type="button" disabled={busy}
            onClick={() => inputRef.current?.click()}>
            <TbUpload aria-hidden="true" /> Загрузить файл
          </button>
        ) : null}
      </div>
      {!open && error ? <div className="notice notice--error" role="alert">{error}</div> : null}
      {notice ? <p className="section-material-import__notice" role="status">{notice}</p> : null}
      {drafts.size ? (
        <details className="section-material-import__drafts">
          <summary>Черновики импорта · {drafts.size}</summary>
          {Array.from(drafts.values()).map((draft) => (
            <button key={draft.id} type="button" disabled={busy} onClick={() => openDraft(draft)}>
              <span>{draft.original_filename}</span><small>{STATUS_LABELS[draft.status] || "Черновик"}</small>
            </button>
          ))}
        </details>
      ) : null}
      {open ? (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section className="modal-card material-import-dialog" role="dialog" aria-modal="true"
            aria-labelledby="material-import-title" tabIndex={-1} ref={dialogRef} onKeyDown={handleDialogKey}>
            <header className="material-import-dialog__header">
              <div><h2 id="material-import-title">Импорт расходов</h2><p>Подраздел: {section.name || section.subsection_name}</p></div>
              <button className="section-card__action" type="button" aria-label="Закрыть импорт" title="Закрыть"
                disabled={busy} onClick={close}><TbX aria-hidden="true" /></button>
            </header>
            <div className="material-import-dialog__file">
              <TbFileImport aria-hidden="true" />
              <div><strong>{currentImport?.original_filename || "Новый файл"}</strong>
                <span>{STATUS_LABELS[currentImport?.status] || "Загрузка"}</span></div>
            </div>
            {error ? <div className="notice notice--error" role="alert">{error}</div> : null}
            {currentImport?.parse_error ? <p className="material-import-dialog__error-detail">{currentImport.parse_error}</p> : null}
            <div className="material-import-dialog__body" aria-busy={busy}>
              {busy ? <p className="material-import-dialog__empty" role="status">{processingLabel}</p> : null}
              {!loadingImportDraft && items.length ? (
                <>
                  <h3>Строки черновика · {items.length}</h3>
                  <table className="material-import-table">
                    <thead><tr><th scope="col">№</th><th scope="col">Материал</th><th scope="col">Кол-во</th><th scope="col">Цена</th></tr></thead>
                    <tbody>{items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.row_index}</td>
                        <td><strong>{item.material_type}</strong>{item.type ? <span>{item.type}</span> : null}
                          {item.raw_row ? <details><summary>Исходная строка</summary><p>{item.raw_row}</p></details> : null}</td>
                        <td>{item.quantity}</td><td>{formatImportPrice(item.unit_price)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </>
              ) : !busy ? (
                <p className="material-import-dialog__empty">
                  {currentImport?.status === "confirmed" ? "Этот файл уже добавлен в расходы."
                    : currentImport?.status === "parsed" ? "В файле не найдено строк расходов."
                      : "Строки расходов пока не распознаны."}
                </p>
              ) : null}
            </div>
            <footer className="material-import-dialog__footer">
              <button className="button button--ghost" type="button" disabled={busy} onClick={close}>Закрыть</button>
              {currentImport && currentImport.status !== "confirmed" && (currentImport.status !== "parsed" || !items.length) ? (
                <button className="button button--ghost" type="button" disabled={busy} onClick={handleParse}>
                  <TbReload aria-hidden="true" /> Обработать
                </button>
              ) : null}
              <button className="button button--primary" type="button"
                disabled={busy || !canConfirm || currentImport?.status !== "parsed" || !items.length}
                onClick={handleConfirm}><TbCheck aria-hidden="true" /> Добавить в подраздел</button>
              {!canConfirm ? <p>Для добавления расходов нужен доступ к редактированию проекта.</p> : null}
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
