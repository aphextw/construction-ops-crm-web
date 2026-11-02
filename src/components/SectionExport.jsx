import { useEffect, useRef, useState } from "react";
import { TbChevronDown, TbDownload, TbFileText, TbTable } from "react-icons/tb";

import { EXCEL_EXPORT_ROLES, useSectionExport } from "@/hooks/section/useSectionExport";
import { useProfileStore } from "@/store/useProfileStore";

export function SectionExport({ project, section }) {
  const user = useProfileStore((state) => state.user);
  const { exportFile, loading, error } = useSectionExport();
  const [notice, setNotice] = useState("");
  const [openAbove, setOpenAbove] = useState(false);
  const menuRef = useRef(null);
  const canExportExcel = EXCEL_EXPORT_ROLES.includes(user?.role?.code);

  useEffect(() => {
    const closeOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const download = async (format) => {
    menuRef.current.open = false;
    menuRef.current.querySelector("summary")?.focus();
    setNotice("");
    const name = format === "word"
      ? `Подраздел ${section.name || section.subsection_name || section.id}`
      : `Расходы объекта ${project.number || project.id}`;
    if (await exportFile(project.id, section.id, format, name)) {
      setNotice(format === "word" ? "Скачивание документа Word началось" : "Скачивание расходов объекта в Excel началось");
    }
  };

  if (user?.status !== "active" || !project?.id || !section?.id) return null;

  return (
    <div className="section-export">
      <details className="section-export__menu" ref={menuRef}
        onToggle={(event) => {
          const menu = event.currentTarget;
          if (!menu.open) return;
          const bottom = menu.querySelector("summary").getBoundingClientRect().bottom;
          const height = menu.querySelector(".section-export__options").offsetHeight;
          setOpenAbove(bottom + height + 6 > window.innerHeight);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            menuRef.current.open = false;
            menuRef.current.querySelector("summary")?.focus();
          }
        }}>
        <summary className="button button--ghost" aria-disabled={loading}
          onClick={(event) => { if (loading) event.preventDefault(); }}>
          <TbDownload aria-hidden="true" />
          {loading ? "Готовим файл..." : "Экспорт"}
          <TbChevronDown aria-hidden="true" />
        </summary>
        <div className="section-export__options" data-placement={openAbove ? "above" : "below"}>
          <button type="button" disabled={loading} onClick={() => download("word")}>
            <TbFileText aria-hidden="true" />
            <span><strong>Документ подраздела</strong><small>Word · DOCX</small></span>
          </button>
          {canExportExcel ? (
            <button type="button" disabled={loading} onClick={() => download("excel")}>
              <TbTable aria-hidden="true" />
              <span><strong>Расходы всего объекта</strong><small>Excel · XLSX · все подразделы</small></span>
            </button>
          ) : null}
        </div>
      </details>
      {error ? <p className="section-export__error" role="alert">{error}</p>
        : notice ? <p className="section-export__notice" role="status">{notice}</p> : null}
    </div>
  );
}
