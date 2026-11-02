import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { HistoryActionIcon } from "@/components/HistoryActionIcon";
import ProjectPaymentTable from "@/components/ProjectPaymentTable";
import { useDeleteProject } from "@/hooks/ProjectDelete";
import { useCreateMaterialSection } from "@/hooks/newSectionHook";
import { useCreateBigSection } from "@/hooks/project/createBigSectionHook";
import { useUpdateBigSection } from "@/hooks/project/updateBigSectionHook";
import { useGetProject } from "@/hooks/projectRefresh";
import { useUpdateProject } from "@/hooks/editProjectHook";
import { useUploadProjectFile } from "@/hooks/project/fileUploadHook";
import { useDeleteProjectFile } from "@/hooks/project/fileDeleteHook";
import { useDownloadProjectFile } from "@/hooks/project/fileGetHook";
import { useUpdateDeadlines } from "@/hooks/project/projectDeadlinsHook";
import { useUpdateStatus } from "@/hooks/project/statusProjectUpdate";
import { useProjectComments } from "@/hooks/project/useProjectComments";
import { useProjectHistory } from "@/hooks/project/useProjectHistory";
import { useProjectWorkers } from "@/hooks/project/useProjectWorkers";
import { useProjectUserAccess } from "@/hooks/project/useProjectUserAccess";
import { useDeleteSection } from "@/hooks/section/SectionDelete";
import { useUpdateSection } from "@/hooks/section/SectionEdit";
import { useDownloadSectionFile } from "@/hooks/section/SectionFileDownload";
import { useDeleteSectionFile } from "@/hooks/section/SectionFileDelete";
import { useProfileStore } from "@/store/useProfileStore";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMoney,
} from "@/lib/format";
import {
  canTransitionProjectStatus,
  canManageProjectUsers,
  canEditBigSections,
  getStatusMeta,
  PROJECT_STATUS_META,
  PROJECT_STATUS_TRANSITIONS,
} from "@/lib/projectMeta";
import { formatProjectHistoryItem } from "@/utils/formatProjectHistoryItem";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  PROJECT_SECTION_ICONS,
} from "@/svg/svg";
import {
  TbChevronDown,
  TbPencil,
  TbPlus,
  TbReload,
  TbShieldSearch,
  TbTrash,
  TbUserMinus,
} from "react-icons/tb";

const initialProjectForm = {
  name: "",
  object_code: "",
  project_code: "",
  comment: "",
  total_materials_cost: "",
};

function formatDateWithDots(value) {
  if (!value) return "Не указано";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatRubles(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "0 рублей";
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(amount)} рублей`;
}

function getFileTypeLabel(file) {
  const name = String(file?.display_name || file?.original_filename || "");
  const extension = name.includes(".") ? name.split(".").pop() : "";
  return extension ? extension.slice(0, 4).toUpperCase() : "ФАЙЛ";
}

function formatSubsectionCount(count) {
  const value = Number(count) || 0;
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${value} подразделов`;
  if (last === 1) return `${value} подраздел`;
  if (last >= 2 && last <= 4) return `${value} подраздела`;
  return `${value} подразделов`;
}

function getWorkerInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function sortByOrder(a, b) {
  return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
}

function getProjectHistoryCategory(action = "") {
  if (action.includes("status") || action.includes("deadline")) return "status";
  if (action.includes("file")) return "file";
  if (action.includes("expense") || action.includes("import")) return "expense";
  if (action.includes("access") || action.includes("worker")) return "access";
  if (action.includes("section")) return "section";
  if (action.includes("comment")) return "comment";
  return "project";
}

const initialBigSectionForm = {
  name: "",
  number: "",
};

const initialInnerSectionForm = {
  number: "",
  subsection_name: "",
  part_number: "",
  part_name: "",
  section_code: "",
  volume: "",
};

function SectionHeading({ children, icon: Icon }) {
  return (
    <h2 className="section-title__heading">
      <Icon />
      <span>{children}</span>
    </h2>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentUser = useProfileStore((state) => state.user);
  const role = currentUser?.role?.code;
  const canManageAccess = canManageProjectUsers(role);
  const canEditStatus = role === "developer";

  const { getProject, refreshing, error } = useGetProject(projectId);
  const { updateProject, loading: savingProject } = useUpdateProject();
  const {
    updateStatus,
    loadingUpdate: savingStatus,
    error: statusUpdateError,
  } = useUpdateStatus();
  const { updateDeadlines, loading: savingDeadlines } = useUpdateDeadlines();
  const { createSection, loadingSection } = useCreateMaterialSection();
  const {
    createBigSection,
    loading: loadingBigSection,
    error: bigSectionError,
  } = useCreateBigSection();
  const {
    updateBigSection,
    loading: savingBigSection,
    error: bigSectionUpdateError,
    clearError: clearBigSectionUpdateError,
  } = useUpdateBigSection();
  const { deleteProject } = useDeleteProject();
  const { updateSection } = useUpdateSection();
  const { deleteSection } = useDeleteSection();
  const {
    uploadFile,
    loadingFile,
    error: projectFileUploadError,
  } = useUploadProjectFile();
  const { deleteProjectFile } = useDeleteProjectFile();
  const { downloadFile } = useDownloadProjectFile();
  const { downloadSectionFile } = useDownloadSectionFile();
  const { deleteSectionFile } = useDeleteSectionFile();
  const {
    listProjectComments,
    addProjectComment,
    deleteProjectComment,
    sendingProjectComment,
  } = useProjectComments();
  const { listProjectHistory, loadingProjectHistory, projectHistoryError } =
    useProjectHistory();
  const {
    listProjectWorkers,
    addProjectWorker,
    deleteProjectWorker,
    loadingWorkersCatalog,
    loadingProjectWorkers,
    savingProjectWorker,
    projectWorkersError,
    searchWorkersCatalog,
  } = useProjectWorkers();
  const { listUserAccess } = useProjectUserAccess();

  const [project, setProject] = useState(null);
  const [activeProjectTab, setActiveProjectTab] = useState("overview");
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [deadlines, setDeadlines] = useState({
    company_deadline: "",
    supplies_deadline: "",
  });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isBigSectionFormOpen, setIsBigSectionFormOpen] = useState(false);
  const [isInnerSectionFormOpen, setIsInnerSectionFormOpen] = useState(false);
  const [selectedBigSectionId, setSelectedBigSectionId] = useState("");
  const [openedBigSections, setOpenedBigSections] = useState([]);
  const [bigSectionForm, setBigSectionForm] = useState(initialBigSectionForm);
  const [editingBigSectionId, setEditingBigSectionId] = useState(null);
  const [innerSectionForm, setInnerSectionForm] = useState(
    initialInnerSectionForm,
  );
  const [commentBody, setCommentBody] = useState("");
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerCatalog, setWorkerCatalog] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [userAccess, setUserAccess] = useState([]);

  const loadProject = async (force = false) => {
    const nextProject = await getProject(projectId, force);
    setProject(nextProject);

    if (nextProject) {
      setProjectForm({
        name: nextProject.name || "",
        object_code: nextProject.object_code || "",
        project_code: nextProject.project_code || "",
        comment: nextProject.comment || "",
        total_materials_cost: nextProject.total_materials_cost || "",
      });

      setDeadlines({
        company_deadline: nextProject.company_deadline?.slice(0, 10) || "",
        supplies_deadline: nextProject.supplies_deadline?.slice(0, 10) || "",
      });
    }

    return nextProject;
  };

  const loadDetails = async (force = false) => {
    const [nextComments, nextHistory, nextWorkers, nextAccess, nextCatalog] =
      await Promise.all([
        listProjectComments(projectId, force),
        listProjectHistory(projectId, force),
        listProjectWorkers(projectId, force),
        canManageAccess
          ? listUserAccess(projectId, force)
          : Promise.resolve([]),
        searchWorkersCatalog(undefined, force),
      ]);

    setComments(nextComments);
    setHistory(nextHistory);
    setWorkers(nextWorkers);
    setUserAccess(nextAccess);
    setWorkerCatalog(nextCatalog);
  };

  useEffect(() => {
    loadProject(false).then(() => loadDetails(false));
  }, [projectId]);

  const projectStatus = getStatusMeta(project?.status);
  const canEditBigSection = canEditBigSections(currentUser, project);
  const busyBigSection = loadingBigSection || savingBigSection;

  const nextStatusTransition = useMemo(
    () =>
      PROJECT_STATUS_TRANSITIONS.find(
        (transition) =>
          transition.from === project?.status &&
          canTransitionProjectStatus(role, transition.from, transition.to),
      ) || null,
    [project?.status, role],
  );

  const sortedBigSections = useMemo(
    () => [...(project?.big_sections || [])].sort(sortByOrder),
    [project?.big_sections],
  );

  const sortedSections = useMemo(() => {
    if (sortedBigSections.length) {
      return sortedBigSections.flatMap((bigSection) =>
        [...(bigSection.inner_sections || [])].sort(sortByOrder),
      );
    }

    return [...(project?.material_sections || [])].sort(sortByOrder);
  }, [project?.material_sections, sortedBigSections]);

  const totalExpenses = useMemo(
    () =>
      sortedSections.reduce(
        (sum, section) => sum + (section.expenses?.length || 0),
        0,
      ),
    [sortedSections],
  );

  const totalSectionFiles = useMemo(
    () =>
      sortedSections.reduce(
        (sum, section) => sum + (section.files?.length || 0),
        0,
      ),
    [sortedSections],
  );

  const projectFilesCount = project?.files?.length || 0;
  const totalProjectFiles = projectFilesCount + totalSectionFiles;
  const sectionFileItems = useMemo(
    () =>
      sortedSections.flatMap((section) =>
        (section.files || []).map((file) => ({
          ...file,
          sectionId: section.id,
          sectionName: section.name || section.subsection_name || "Подраздел",
        })),
      ),
    [sortedSections],
  );

  const participants = project?.participants || [];
  const legalEntitiesCount = useMemo(() => {
    const uniqueCompanies = new Set();

    participants.forEach((participant) => {
      const companyCode =
        participant?.company?.code || participant?.company?.display_name;
      if (companyCode) {
        uniqueCompanies.add(companyCode);
      }
    });

    return uniqueCompanies.size;
  }, [participants]);

  const saveOverview = async (event) => {
    event.preventDefault();
    await updateProject(projectId, projectForm);
    await loadProject(true);
  };

  const saveStatus = async (status) => {
    const updatedProject = await updateStatus(projectId, status);
    if (updatedProject) {
      await loadProject(true);
    }
  };

  const moveToNextStatus = async (transition) => {
    if (
      transition.from === "project_analysis" &&
      !project?.material_expenses?.length
    ) {
      window.alert("Нельзя перейти дальше без добавленных расходов");
      return;
    }

    const nextStatus = getStatusMeta(transition.to);
    if (!window.confirm(`Перевести объект на этап «${nextStatus.label}»?`)) {
      return;
    }

    await saveStatus(transition.to);
  };

  const saveDeadlines = async (event) => {
    event.preventDefault();
    await updateDeadlines(projectId, deadlines);
    await loadProject(true);
  };

  const openBigSectionForm = (section = null) => {
    clearBigSectionUpdateError();
    setEditingBigSectionId(section?.id || null);
    setBigSectionForm(
      section
        ? {
            name: section.name || "",
            number: String(section.number ?? ""),
          }
        : initialBigSectionForm,
    );
    setIsBigSectionFormOpen(true);
  };

  const closeBigSectionForm = () => {
    if (busyBigSection) return;
    setIsBigSectionFormOpen(false);
  };

  const saveProjectBigSection = async (event) => {
    event.preventDefault();
    if (busyBigSection) return;

    if (editingBigSectionId) {
      const response = await updateBigSection(
        projectId,
        editingBigSectionId,
        bigSectionForm.name,
        bigSectionForm.number,
      );
      if (response) {
        setProject(response.project);
        setIsBigSectionFormOpen(false);
        setHistory(await listProjectHistory(projectId, true));
      }
      return;
    }

    const result = await createBigSection(
      projectId,
      bigSectionForm.name,
      bigSectionForm.number,
    );

    if (result) {
      setBigSectionForm(initialBigSectionForm);
      setIsBigSectionFormOpen(false);
      await loadProject(true);
    }
  };

  const openInnerSectionForm = (bigSectionId) => {
    setSelectedBigSectionId(bigSectionId);
    setInnerSectionForm(initialInnerSectionForm);
    setIsInnerSectionFormOpen(true);
  };

  const toggleBigSection = (bigSectionId) => {
    setOpenedBigSections((current) =>
      current.includes(bigSectionId)
        ? current.filter((id) => id !== bigSectionId)
        : [...current, bigSectionId],
    );
  };

  const createProjectSection = async (event) => {
    event.preventDefault();

    const result = await createSection(
      projectId,
      innerSectionForm,
      selectedBigSectionId,
    );

    if (result) {
      setInnerSectionForm(initialInnerSectionForm);
      setSelectedBigSectionId("");
      setIsInnerSectionFormOpen(false);
      await loadProject(true);
    }
  };

  const handleProjectFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedFile = await uploadFile(projectId, "project_pdf", file);
    event.target.value = "";
    if (uploadedFile) {
      await loadProject(true);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!commentBody.trim()) return;

    await addProjectComment(projectId, commentBody.trim());
    setCommentBody("");
    await loadDetails(true);
  };

  const loadCatalog = async (query = "") => {
    const items = await searchWorkersCatalog(query);
    setWorkerCatalog(items);
  };

  const saveWorker = async (event) => {
    event.preventDefault();
    if (!selectedWorkerId) {
      return;
    }

    const worker = await addProjectWorker(projectId, {
      worker_id: selectedWorkerId,
    });
    if (worker) {
      setSelectedWorkerId("");
      await loadDetails(true);
    }
  };

  if (!project && refreshing) {
    return <div className="notice">Загружаем проект...</div>;
  }

  return (
    <div className="page project-workspace">
      <div className="project-workspace__topbar">
        <Link
          className="project-back-link"
          to="/projects"
          aria-label="Вернуться к проектам"
          title="К проектам"
        >
          <ArrowLeftIcon />
        </Link>

        <div className="project-workspace__actions">
          <Link
            className="project-icon-button"
            to={`/projects/${projectId}/access`}
            aria-label="Настроить доступы"
            title="Доступы"
          >
            <TbShieldSearch color="#6b7280" />
          </Link>
          <button
            className="project-icon-button"
            type="button"
            aria-label="Обновить проект"
            title="Обновить"
            onClick={() => loadProject(true).then(() => loadDetails(true))}
          >
            <TbReload size={22} color="#6b7280" />
          </button>

          <button
            className="project-icon-button project-icon-button--danger"
            type="button"
            aria-label="Удалить проект"
            title="Удалить проект"
            onClick={async () => {
              if (window.confirm("Вы действительно хотите удалить проект?")) {
                const success = await deleteProject(projectId);
                if (success) window.location.assign("/projects");
              }
            }}
          >
            <TbTrash size={22} color="#6b7280" />
          </button>
        </div>
      </div>

      <header className="project-overview-header">
        <div className="project-overview-header__main">
          <div className="project-overview-header__identity">
            <div className="project-overview-header__label-row">
              <span className="eyebrow">
                Проект №{project?.number || project?.project_code || "—"}
              </span>
              <span
                className="project-header-status"
                style={{ "--stage-color": projectStatus.color }}
                aria-label={`Текущий статус: ${projectStatus.label}`}
              >
                {projectStatus.label}
              </span>
            </div>

            <h1>{project?.name || "Проект"}</h1>
            <div className="project-overview-header__meta">
              <span>{project?.object_code || "Шифр не указан"}</span>
              <span>{project?.project_code || "Код не указан"}</span>
              <span>Создан {formatDateWithDots(project?.created_at)}</span>
            </div>
          </div>

          <div className="project-overview-header__status">
            {nextStatusTransition ? (
              <button
                // style={{ "--stage-color": nextStatusTransition.color }}
                className="button button--primary project-stage-action svg-button"
                type="button"
                disabled={savingStatus}
                onClick={() => moveToNextStatus(nextStatusTransition)}
              >
                <span>
                  {savingStatus ? "Переводим..." : nextStatusTransition.label}
                  <ArrowUpRightIcon />
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <div className="notice notice--error">{error}</div> : null}
      {statusUpdateError ? (
        <div className="notice notice--error">{statusUpdateError}</div>
      ) : null}

      <nav className="project-tabs" aria-label="Разделы проекта">
        {[
          ["overview", "Обзор", null],
          ["sections", "Разделы", sortedSections.length],
          ["files", "Файлы", totalProjectFiles],
          ["team", "Команда", workers.length],
          ["history", "История", history.length],
          ["table", "Таблица", null],
        ].map(([tab, label, count]) => (
          <button
            className={activeProjectTab === tab ? "is-active" : ""}
            type="button"
            key={tab}
            onClick={() => setActiveProjectTab(tab)}
          >
            <span>{label}</span>
            {count !== null ? <small>{count}</small> : null}
          </button>
        ))}
      </nav>

      <div
        className="project-details-surface project-overview-grid"
        hidden={activeProjectTab !== "overview"}
      >
        <section className="project-detail-section project-detail-section--general">
          <h2>Общие данные</h2>

          <form className="project-detail-form" onSubmit={saveOverview}>
            <label className="field">
              <span>Наименование объекта</span>
              <textarea
                rows={2}
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <div className="project-detail-fields">
              <label className="field">
                <span>Бюджет по договору</span>
                <input
                  value={projectForm.total_materials_cost}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      total_materials_cost: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Код проекта</span>
                <input
                  value={projectForm.project_code}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      project_code: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            {/*<label className="field field--full">*/}
            {/*  <span>Комментарий</span>*/}
            {/*  <textarea*/}
            {/*    rows={3}*/}
            {/*    value={projectForm.comment}*/}
            {/*    onChange={(event) =>*/}
            {/*      setProjectForm((current) => ({*/}
            {/*        ...current,*/}
            {/*        comment: event.target.value,*/}
            {/*      }))*/}
            {/*    }*/}
            {/*  />*/}
            {/*</label>*/}
            <div className="project-detail-form__footer">
              <button
                className="workspace-action workspace-action--primary"
                type="submit"
                disabled={savingProject}
              >
                {savingProject ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
        </section>

        <section className="project-detail-section">
          <h2>Статус и сроки</h2>

          <div className="project-detail-form">
            {canEditStatus ? (
              <label className="field">
                <span>Текущий статус</span>
                <div className="project-detail-select">
                  <select
                    value={project?.status || ""}
                    onChange={(event) => saveStatus(event.target.value)}
                    disabled={savingStatus}
                  >
                    {Object.entries(PROJECT_STATUS_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                  <TbChevronDown aria-hidden="true" />
                </div>
              </label>
            ) : (
              <div className="project-detail-status">
                <span>Текущий статус</span>
                <span
                  className="project-stage-badge"
                  style={{ "--stage-color": projectStatus.color }}
                >
                  {projectStatus.label}
                </span>
              </div>
            )}

            <form className="project-detail-form" onSubmit={saveDeadlines}>
              <div className="project-detail-fields project-detail-fields--dates">
                <label className="field">
                  <span>Срок поставки</span>
                  <input
                    type="date"
                    value={deadlines.supplies_deadline}
                    onChange={(event) =>
                      setDeadlines((current) => ({
                        ...current,
                        supplies_deadline: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Рассчетный срок сдачи объекта</span>
                  <input
                    type="date"
                    value={deadlines.company_deadline}
                    onChange={(event) =>
                      setDeadlines((current) => ({
                        ...current,
                        company_deadline: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="project-detail-form__footer">
                <button
                  className="workspace-action workspace-action--primary"
                  type="submit"
                  disabled={savingDeadlines || savingStatus}
                >
                  Сохранить сроки
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <section
        className="project-files-tab"
        hidden={activeProjectTab !== "files"}
      >
        <div className="project-tab-heading">
          <div className="project-tab-heading__copy">
            <h2>Файлы</h2>
          </div>

          <label className="workspace-action workspace-action--primary project-tab-action">
            <TbPlus aria-hidden="true" />
            {loadingFile ? "Загружаем..." : "Добавить файл"}
            <input
              type="file"
              accept=".pdf,application/pdf"
              hidden
              disabled={loadingFile}
              onChange={handleProjectFileUpload}
            />
          </label>
        </div>

        {projectFileUploadError ? (
          <div className="project-file-upload-error" role="alert">
            {projectFileUploadError}
          </div>
        ) : null}

        <div className="project-files-browser">
          <section className="project-files-group">
            <div className="project-files-group__title">
              <div>
                <strong>Файлы проекта</strong>
              </div>
              <span>{projectFilesCount}</span>
            </div>

            <div className="project-compact-list">
              {(project?.files || []).map((file) => (
                <div className="project-compact-file" key={file.id}>
                  <span className="project-compact-file__icon">
                    {getFileTypeLabel(file)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(projectId, file.id, file.display_name)
                    }
                  >
                    <strong>
                      {file.display_name || file.original_filename}
                    </strong>

                    <small>{formatFileSize(file.size_bytes)}</small>
                  </button>

                  <button
                    className="project-compact-file__delete"
                    type="button"
                    aria-label="Удалить файл"
                    title="Удалить"
                    onClick={async () => {
                      if (window.confirm("Удалить файл проекта?")) {
                        await deleteProjectFile(projectId, file.id);
                        await loadProject(true);
                      }
                    }}
                  >
                    <TbTrash aria-hidden="true" />
                  </button>
                </div>
              ))}
              {!projectFilesCount ? (
                <div className="project-tab-empty">
                  Файлы проекта ещё не загружены.
                </div>
              ) : null}
            </div>
          </section>

          <section className="project-files-group">
            <div className="project-files-group__title">
              <div>
                <strong>Файлы подразделов</strong>
              </div>
              <span>{totalSectionFiles}</span>
            </div>
            <div className="project-compact-list">
              {sectionFileItems.map((file) => (
                <div className="project-compact-file" key={file.id}>
                  <span className="project-compact-file__icon project-compact-file__icon--section">
                    {getFileTypeLabel(file)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadSectionFile(
                        projectId,
                        file.sectionId,
                        file.id,
                        file.display_name,
                      )
                    }
                  >
                    <strong>
                      {file.display_name || file.original_filename}
                    </strong>
                    <small>
                      {file.sectionName} · {formatFileSize(file.size_bytes)}
                    </small>
                  </button>
                  <Link
                    className="project-compact-file__open"
                    to={`/projects/${projectId}/sections/${file.sectionId}`}
                    aria-label="Открыть подраздел"
                    title="Открыть подраздел"
                  >
                    <ArrowUpRightIcon />
                  </Link>
                </div>
              ))}
              {!sectionFileItems.length ? (
                <div className="project-tab-empty">
                  В подразделах пока нет файлов.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <section
        className="project-sections-tab"
        hidden={activeProjectTab !== "sections"}
      >
        <div className="project-tab-heading big-sections-heading">
          <div className="project-tab-heading__copy">
            <h2>Разделы</h2>
          </div>

          <button
            className="workspace-action workspace-action--primary project-tab-action"
            type="button"
            onClick={() => openBigSectionForm()}
          >
            <TbPlus aria-hidden="true" />
            Добавить раздел
          </button>
        </div>

        {sortedBigSections.length ? (
          <div className="big-section-list" role="list">
            {sortedBigSections.map((bigSection) => {
              const isOpen = openedBigSections.includes(bigSection.id);
              const innerSections = [...(bigSection.inner_sections || [])].sort(
                sortByOrder,
              );

              return (
                <article
                  className={`big-section-card${isOpen ? " is-open" : ""}`}
                  key={bigSection.id}
                  role="listitem"
                >
                  <div className="big-section-card__heading-row">
                    <button
                      className="big-section-card__header"
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleBigSection(bigSection.id)}
                    >
                      <TbChevronDown
                        className={`big-section-card__chevron${isOpen ? " is-open" : ""}`}
                        aria-hidden="true"
                      />

                      <span className="big-section-card__identity">
                        <span className="big-section-card__number">
                          {bigSection.number}
                        </span>

                        <strong>{capitalize(bigSection.name)}</strong>
                      </span>

                      <small className="big-section-card__count">
                        {formatSubsectionCount(innerSections.length)}
                      </small>
                    </button>
                    {canEditBigSection ? (
                      <button
                        className="section-card__action"
                        type="button"
                        aria-label={`Изменить раздел ${bigSection.number}: ${bigSection.name}`}
                        title="Изменить раздел"
                        onClick={() => openBigSectionForm(bigSection)}
                      >
                        <TbPencil aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  {isOpen ? (
                    <div className="big-section-card__body">
                      <div className="section-list section-list--nested">
                        {innerSections.map((section) => (
                          <article
                            className="section-card section-card--clickable"
                            key={section.id}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              navigate(
                                `/projects/${projectId}/sections/${section.id}`,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(
                                  `/projects/${projectId}/sections/${section.id}`,
                                );
                              }
                            }}
                          >
                            <div className="section-card__header">
                              <div className="section-card__title-group">
                                <div className="muted">
                                  {section.section_code ||
                                    section.section_cod ||
                                    "Без кода"}
                                </div>
                                <h3>
                                  {capitalize(
                                    section.name || section.subsection_name,
                                  )}
                                </h3>
                                <p className="section-card__summary">
                                  {section.expenses_count ??
                                    section.expenses?.length ??
                                    0}{" "}
                                  расходов
                                  {!["pto", "estimator_plus"].includes(role)
                                    ? ` · ${formatMoney(
                                        section.actual_materials_cost ||
                                          section.total_materials_cost ||
                                          0,
                                      )}`
                                    : ""}
                                </p>
                              </div>

                              <div
                                className="section-card__actions"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  className="section-card__action"
                                  type="button"
                                  aria-label="Переименовать подраздел"
                                  title="Переименовать"
                                  onClick={async () => {
                                    const name = window.prompt(
                                      "Новое имя раздела",
                                      section.name || section.subsection_name,
                                    );
                                    if (name) {
                                      await updateSection(
                                        projectId,
                                        section.id,
                                        name,
                                      );
                                      await loadProject(true);
                                    }
                                  }}
                                >
                                  <TbPencil aria-hidden="true" />
                                </button>
                                <button
                                  className="section-card__action section-card__action--danger"
                                  type="button"
                                  aria-label="Удалить подраздел"
                                  title="Удалить"
                                  onClick={async () => {
                                    if (window.confirm("Удалить раздел?")) {
                                      await deleteSection(
                                        projectId,
                                        section.id,
                                      );
                                      await loadProject(true);
                                    }
                                  }}
                                >
                                  <TbTrash aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            {/*<div*/}
                            {/*  className="list"*/}
                            {/*  onClick={(event) => event.stopPropagation()}*/}
                            {/*>*/}
                            {/*  {(section.files || []).map((file) => (*/}
                            {/*    <div className="list-item" key={file.id}>*/}
                            {/*      <div>*/}
                            {/*        <strong>{file.display_name}</strong>*/}
                            {/*        <div className="muted">*/}
                            {/*          {formatFileSize(file.size_bytes)}*/}
                            {/*        </div>*/}
                            {/*      </div>*/}
                            {/*      <div className="toolbar">*/}
                            {/*        <button*/}
                            {/*          className="button button--ghost"*/}
                            {/*          type="button"*/}
                            {/*          onClick={() =>*/}
                            {/*            downloadSectionFile(*/}
                            {/*              projectId,*/}
                            {/*              section.id,*/}
                            {/*              file.id,*/}
                            {/*              file.display_name,*/}
                            {/*            )*/}
                            {/*          }*/}
                            {/*        >*/}
                            {/*          Скачать*/}
                            {/*        </button>*/}
                            {/*        <button*/}
                            {/*          className="button button--ghost"*/}
                            {/*          type="button"*/}
                            {/*          onClick={async () => {*/}
                            {/*            await deleteSectionFile(*/}
                            {/*              projectId,*/}
                            {/*              section.id,*/}
                            {/*              file.id,*/}
                            {/*            );*/}
                            {/*            await loadProject();*/}
                            {/*          }}*/}
                            {/*        >*/}
                            {/*          Удалить*/}
                            {/*        </button>*/}
                            {/*      </div>*/}
                            {/*    </div>*/}
                            {/*  ))}*/}
                            {/*</div>*/}
                          </article>
                        ))}

                        {!innerSections.length ? (
                          <p className="big-section-card__empty">
                            В этом разделе пока нет подразделов
                          </p>
                        ) : null}

                        <button
                          className="big-section-card__add"
                          type="button"
                          onClick={() => openInnerSectionForm(bigSection.id)}
                        >
                          <TbPlus aria-hidden="true" />
                          Добавить подраздел
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="notice">В проекте пока нет крупных разделов.</div>
        )}
      </section>

      <ProjectPaymentTable
        hidden={activeProjectTab !== "table"}
        projectId={projectId}
        canEdit={["director", "deputy_director", "developer", "material_buyer", "pto", "estimator_plus", "accountant"].includes(role)}
      />

      <div
        className="project-tab-single"
        hidden={!["team", "history"].includes(activeProjectTab)}
      >
        {/*<section className="panel panel--elevated">*/}
        {/*  <div className="section-title">*/}
        {/*    <h2>Обсуждение</h2>*/}
        {/*  </div>*/}
        {/*  <form className="form-grid" onSubmit={submitComment}>*/}
        {/*    <label className="field">*/}
        {/*      <span>Новый комментарий</span>*/}
        {/*      <textarea*/}
        {/*        rows={3}*/}
        {/*        value={commentBody}*/}
        {/*        onChange={(event) => setCommentBody(event.target.value)}*/}
        {/*      />*/}
        {/*    </label>*/}
        {/*    <div className="form-actions">*/}
        {/*      <button*/}
        {/*        className="button button--primary"*/}
        {/*        type="submit"*/}
        {/*        disabled={sendingProjectComment}*/}
        {/*      >*/}
        {/*        Отправить*/}
        {/*      </button>*/}
        {/*    </div>*/}
        {/*  </form>*/}
        {/*  <div className="timeline">*/}
        {/*    {comments.map((comment) => (*/}
        {/*      <div className="timeline-item" key={comment.id}>*/}
        {/*        <div className="timeline-item__head">*/}
        {/*          <strong>{comment.author.full_name}</strong>*/}
        {/*          <span>{formatDateTime(comment.created_at)}</span>*/}
        {/*        </div>*/}
        {/*        <p>{comment.body}</p>*/}
        {/*        {comment.author.id === currentUser.id ? (*/}
        {/*          <button*/}
        {/*            className="button button--ghost"*/}
        {/*            onClick={async () => {*/}
        {/*              await deleteProjectComment(projectId, comment.id);*/}
        {/*              await loadDetails();*/}
        {/*            }}*/}
        {/*          >*/}
        {/*            Удалить*/}
        {/*          </button>*/}
        {/*        ) : null}*/}
        {/*      </div>*/}
        {/*    ))}*/}
        {/*  </div>*/}
        {/*</section>*/}

        <section
          className="project-details-surface project-team-tab"
          hidden={activeProjectTab !== "team"}
        >
          <div className="project-tab-heading">
            <div className="project-tab-heading__copy">
              <h2>
                Команда проекта{" "}
                <span className="project-details-count">{workers.length}</span>
              </h2>
            </div>
            {canManageAccess ? (
              <Link
                className="workspace-action workspace-action--secondary"
                to={`/projects/${projectId}/access`}
              >
                <TbShieldSearch aria-hidden="true" />
                Доступы
              </Link>
            ) : null}
          </div>

          <form
            className="project-team-add"
            onSubmit={saveWorker}
            onFocus={() => {
              if (!workerCatalog.length && !loadingWorkersCatalog) {
                loadCatalog();
              }
            }}
          >
            <div className="project-team-add__field">
              <label htmlFor="project-worker-select">Из каталога</label>
              <div className="project-team-add__controls">
                <div className="project-detail-select">
                  <select
                    id="project-worker-select"
                    value={selectedWorkerId}
                    onChange={(event) =>
                      setSelectedWorkerId(event.target.value)
                    }
                    disabled={loadingWorkersCatalog || savingProjectWorker}
                  >
                    <option value="">
                      {loadingWorkersCatalog
                        ? "Загружаем каталог..."
                        : workerCatalog.length
                          ? "Выберите участника"
                          : "Каталог пуст"}
                    </option>

                    {workerCatalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name}{" "}
                        {item.position ? `· ${item.position}` : ""}
                      </option>
                    ))}
                  </select>
                  <TbChevronDown aria-hidden="true" />
                </div>

                <button
                  className="workspace-action workspace-action--primary"
                  type="submit"
                  disabled={!selectedWorkerId || savingProjectWorker}
                >
                  <TbPlus aria-hidden="true" />
                  {savingProjectWorker ? "Добавляем..." : "Добавить участника"}
                </button>
              </div>
            </div>
          </form>

          {projectWorkersError ? (
            <div className="notice notice--error" role="alert">
              {projectWorkersError}
            </div>
          ) : null}

          <div className="project-team-list">
            {workers.length ? (
              <div className="project-team-list__head" aria-hidden="true">
                <span>Участник</span>
                <span>Должность</span>
                <span>Телефон</span>
                <span />
              </div>
            ) : null}
            {workers.map((worker) => (
              <div className="project-team-row" key={worker.id}>
                <div className="project-team-row__identity">
                  <span className="project-team-row__avatar" aria-hidden="true">
                    {getWorkerInitials(worker.full_name)}
                  </span>
                  <strong>{worker.full_name}</strong>
                </div>
                <span className="project-team-row__position">
                  {worker.position || "Без должности"}
                </span>
                {worker.phone ? (
                  <a
                    className="project-team-row__phone"
                    href={`tel:${worker.phone}`}
                  >
                    {worker.phone}
                  </a>
                ) : (
                  <span className="project-team-row__phone">—</span>
                )}
                <button
                  className="project-team-row__remove"
                  type="button"
                  disabled={savingProjectWorker}
                  aria-label={`Убрать ${worker.full_name} из проекта`}
                  title="Убрать из проекта"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Убрать ${worker.full_name} из команды проекта?`,
                      )
                    )
                      return;
                    await deleteProjectWorker(projectId, worker.worker_id);
                    await loadDetails(true);
                  }}
                >
                  <TbUserMinus aria-hidden="true" />
                </button>
              </div>
            ))}
            {!workers.length ? (
              <div className="project-details-empty">
                <strong>
                  {loadingProjectWorkers
                    ? "Загружаем команду..."
                    : "В команде пока нет участников"}
                </strong>
                {!loadingProjectWorkers ? (
                  <p>Выберите участника из каталога и добавьте его в проект.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section
          className="project-details-surface project-history-tab"
          hidden={activeProjectTab !== "history"}
        >
          <div className="project-tab-heading">
            <div className="project-tab-heading__copy">
              <h2>
                История проекта{" "}
                <span className="project-details-count">{history.length}</span>
              </h2>
            </div>
          </div>

          {projectHistoryError ? (
            <div className="notice notice--error" role="alert">
              {projectHistoryError}
            </div>
          ) : null}

          <ol className="project-activity-list">
            {(isHistoryExpanded ? history : history.slice(0, 5)).map((item) => {
              const category = getProjectHistoryCategory(item.action);

              return (
                <li className="project-activity-row" key={item.id}>
                  <HistoryActionIcon type={category} />
                  <div className="project-activity-row__content">
                    <div className="project-activity-row__meta">
                      <strong>{item.changed_by?.full_name || "Система"}</strong>
                      <time dateTime={item.created_at}>
                        {formatDateTime(item.created_at)}
                      </time>
                    </div>
                    <p>{formatProjectHistoryItem(item)}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {!history.length ? (
            <div className="project-details-empty">
              <strong>
                {loadingProjectHistory
                  ? "Загружаем историю..."
                  : "В истории пока нет событий"}
              </strong>
              {!loadingProjectHistory ? (
                <p>
                  Здесь появятся изменения данных, статусов и файлов проекта.
                </p>
              ) : null}
            </div>
          ) : null}

          {history.length > 5 && (
            <div className="project-activity-footer">
              <button
                className="workspace-action workspace-action--secondary"
                type="button"
                aria-expanded={isHistoryExpanded}
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              >
                {isHistoryExpanded
                  ? "Свернуть"
                  : `Показать все события (${history.length})`}
                <TbChevronDown
                  className={isHistoryExpanded ? "is-open" : ""}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </section>
      </div>

      {isBigSectionFormOpen ? (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeBigSectionForm();
            }
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="big-section-form-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeBigSectionForm();
            }}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">Разделы проекта</span>
                <h2 id="big-section-form-title">
                  {editingBigSectionId ? "Изменить раздел" : "Новый раздел"}
                </h2>
              </div>
              <button
                className="project-icon-button svg-button"
                type="button"
                onClick={closeBigSectionForm}
                disabled={busyBigSection}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <form className="form-grid" onSubmit={saveProjectBigSection}>
              <label className="field">
                <span>Название раздела</span>
                <input
                  required
                  disabled={busyBigSection}
                  value={bigSectionForm.name}
                  onChange={(event) =>
                    setBigSectionForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Номер раздела</span>
                <input
                  required
                  disabled={busyBigSection}
                  inputMode="numeric"
                  value={bigSectionForm.number}
                  onChange={(event) =>
                    setBigSectionForm((current) => ({
                      ...current,
                      number: event.target.value,
                    }))
                  }
                />
              </label>

              {(
                editingBigSectionId ? bigSectionUpdateError : bigSectionError
              ) ? (
                <div className="notice notice--error" role="alert">
                  {editingBigSectionId
                    ? bigSectionUpdateError
                    : bigSectionError}
                </div>
              ) : null}

              <div className="modal-card__footer">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={closeBigSectionForm}
                  disabled={busyBigSection}
                >
                  Отмена
                </button>

                <button
                  className="button button--primary"
                  type="submit"
                  disabled={busyBigSection}
                >
                  {busyBigSection
                    ? editingBigSectionId
                      ? "Сохранение..."
                      : "Создание..."
                    : editingBigSectionId
                      ? "Сохранить"
                      : "Создать"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isInnerSectionFormOpen ? (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsInnerSectionFormOpen(false);
            }
          }}
        >
          <section
            className="modal-card modal-card--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inner-section-form-title"
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">Разделы проекта</span>
                <h2 id="inner-section-form-title">Создать подраздел</h2>
              </div>
              <button
                className="modal-card__close"
                type="button"
                onClick={() => setIsInnerSectionFormOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <form
              className="form-grid form-grid--two"
              onSubmit={createProjectSection}
            >
              <label className="field">
                <span>Номер подраздела</span>
                <input
                  inputMode="numeric"
                  value={innerSectionForm.number}
                  onChange={(event) =>
                    setInnerSectionForm((current) => ({
                      ...current,
                      number: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Наименование подраздела</span>
                <input
                  value={innerSectionForm.subsection_name}
                  onChange={(event) =>
                    setInnerSectionForm((current) => ({
                      ...current,
                      subsection_name: event.target.value,
                    }))
                  }
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Номер части</span>
                <input
                  inputMode="numeric"
                  value={innerSectionForm.part_number}
                  onChange={(event) =>
                    setInnerSectionForm((current) => ({
                      ...current,
                      part_number: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Наименование части</span>
                <input
                  value={innerSectionForm.part_name}
                  onChange={(event) =>
                    setInnerSectionForm((current) => ({
                      ...current,
                      part_name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Шифр раздела</span>
                <input
                  value={innerSectionForm.section_code}
                  onChange={(event) =>
                    setInnerSectionForm((current) => ({
                      ...current,
                      section_code: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Том</span>
                <input
                  value={innerSectionForm.volume}
                  onChange={(event) =>
                    setInnerSectionForm((current) => ({
                      ...current,
                      volume: event.target.value,
                    }))
                  }
                />
              </label>

              {/*{errorSection ? (*/}
              {/*  <div className="notice notice--error field--full">*/}
              {/*    {errorSection}*/}
              {/*  </div>*/}
              {/*) : null}*/}

              <div className="modal-card__footer field--full">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => setIsInnerSectionFormOpen(false)}
                >
                  Отмена
                </button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={loadingSection}
                >
                  {loadingSection ? "Создание..." : "Создать"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
