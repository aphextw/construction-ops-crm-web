import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import ProjectCard, { ProjectCardSkeleton } from "@/components/ProjectCard";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import { useGetProjects } from "@/hooks/getProjects";
import { useCreateProject } from "@/hooks/project/newProjectHook";
import { useProfileStore } from "@/store/useProfileStore";
import { normalizeSearch, pluralize } from "@/lib/format";
import {
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUS_META,
  canCreateProject,
  getStatusMeta,
} from "@/lib/projectMeta";
import {
  TbArrowsSort,
  TbPlus,
  TbReload,
  TbSearch,
  TbX,
} from "react-icons/tb";

const ALL_STATUSES_FILTER = "all";

const emptyProjectDraft = {
  number: "",
  name: "",
  object_code: "",
  project_code: "",
  comment: "",
  total_materials_cost: "",
  material_expenses: [],
  visible_roles: [],
};

const loadingSkeletonIds = Array.from(
  { length: 8 },
  (_, index) => `project-skeleton-${index}`,
);

function useAnimatedCount(value, duration = 320) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextValue = Math.round(
        startValue + (endValue - startValue) * eased,
      );
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    previousValueRef.current = endValue;

    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return displayValue;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const user = useProfileStore((state) => state.user);
  const { projects, loading, error, getProjects } = useGetProjects();
  const {
    createProject,
    loading: creatingProject,
    error: createError,
  } = useCreateProject();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES_FILTER);
  const [sortKey, setSortKey] = useState("newest");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(emptyProjectDraft);

  const pendingApproval = user?.status === "pending";
  const role = user?.role?.code;
  const canCreate = canCreateProject(role);

  useEffect(() => {
    if (!createOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setCreateOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [createOpen]);

  const filteredProjects = useMemo(() => {
    const query = normalizeSearch(searchQuery);

    return [...projects]
      .filter((project) => {
        const statusMatches =
          statusFilter === ALL_STATUSES_FILTER ||
          project?.status === statusFilter;
        if (!statusMatches) return false;
        if (!query) return true;

        const haystack = normalizeSearch(
          [
            project?.name,
            project?.number,
            project?.object_code,
            project?.project_code,
            getStatusMeta(project?.status)?.label,
          ]
            .filter(Boolean)
            .join(" "),
        );

        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (sortKey === "oldest") {
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }

        if (sortKey === "name") {
          return String(a.name || "").localeCompare(String(b.name || ""), "ru");
        }

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [projects, searchQuery, statusFilter, sortKey]);

  const animatedProjectCount = useAnimatedCount(
    loading ? 0 : filteredProjects.length,
  );

  const statusCounts = useMemo(
    () =>
      projects.reduce((counts, project) => {
        const status = project?.status;
        if (!status) return counts;

        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {}),
    [projects],
  );

  const filterOptions = [
    {
      key: ALL_STATUSES_FILTER,
      label: "Все статусы",
      color: "#615d59",
      count: projects.length,
    },
    ...Object.entries(PROJECT_STATUS_META).map(([key, meta]) => ({
      key,
      label: meta.label,
      color: meta.color,
      count: statusCounts[key] || 0,
    })),
  ];

  const cycleSort = () => {
    setSortKey((current) => {
      if (current === "newest") return "oldest";
      if (current === "oldest") return "name";
      return "newest";
    });
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    const created = await createProject({
      ...draft,
      project_code: "111",
      total_materials_cost: draft.total_materials_cost || "0",
    });

    if (!created?.project?.id) {
      return;
    }

    setDraft(emptyProjectDraft);
    setCreateOpen(false);
    await getProjects();
    navigate(`/projects/${created.project.id}`);
  };

  return (
    <div className="page workspace-page projects-page">
      <WorkspacePageHeader
        title="Объекты"
        actions={
          <>
            <button
              className="workspace-action workspace-action--icon projects-refresh-button"
              type="button"
              onClick={() => getProjects()}
              aria-label="Обновить список объектов"
              title="Обновить список"
              disabled={loading}
            >
              <TbReload aria-hidden="true" />
            </button>
            {canCreate ? (
              <button
                className="workspace-action workspace-action--primary projects-create-button"
                type="button"
                onClick={() => setCreateOpen(true)}
              >
                <TbPlus aria-hidden="true" />
                Новый объект
              </button>
            ) : null}
          </>
        }
      />

      {pendingApproval ? (
        <div className="notice">
          Ваша учетная запись ожидает подтверждения. Доступ к проектам появится
          после одобрения.
        </div>
      ) : null}

      <section className="projects-controls" aria-label="Поиск и фильтры">
        <div className="projects-controls__primary">
          <label className="projects-search">
            <span className="sr-only">Поиск объектов</span>
            <span className="projects-search__icon" aria-hidden="true">
              <TbSearch />
            </span>
            <span className="projects-search__control">
              <input
                placeholder="Название, номер, код объекта"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery ? (
                <button
                  className="projects-search__clear"
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Очистить поиск"
                >
                  <TbX aria-hidden="true" />
                </button>
              ) : null}
            </span>
          </label>

          <button
            className="projects-sort-button"
            type="button"
            onClick={cycleSort}
            title={`Сортировка: ${PROJECT_SORT_OPTIONS[sortKey]}`}
            aria-label={`Сортировка: ${PROJECT_SORT_OPTIONS[sortKey]}`}
          >
            <TbArrowsSort aria-hidden="true" />
            <span>{PROJECT_SORT_OPTIONS[sortKey]}</span>
          </button>

        </div>

        <div
          className="projects-status-filters"
          role="group"
          aria-label="Фильтр по статусу"
        >
          {filterOptions.map((option) => {
            const selected = statusFilter === option.key;

            return (
              <button
                key={option.key}
                type="button"
                className={`projects-status-filter${selected ? " projects-status-filter--active" : ""}`}
                style={{ "--filter-color": option.color }}
                onClick={() => setStatusFilter(option.key)}
                aria-pressed={selected}
              >
                <span className="projects-status-filter__label">
                  {option.label}
                </span>
                <span className="projects-status-filter__count">
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {createOpen ? (
        <div className="drawer-backdrop" onClick={() => setCreateOpen(false)}>
          <aside
            className="drawer drawer--project"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-drawer-title"
          >
            <div className="drawer__header">
              <div className="drawer__title-group">
                <h2 id="project-drawer-title">Новый объект</h2>
                <p>Добавьте основные данные строительного объекта.</p>
              </div>

              <button
                className="drawer__close"
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Закрыть форму создания объекта"
              >
                <TbX aria-hidden="true" />
              </button>
            </div>

            <form
              className="drawer__body form-grid form-grid--two"
              onSubmit={handleCreateProject}
            >
              {createError ? (
                <div className="notice notice--error">{createError}</div>
              ) : null}

              <label className="field field--full">
                <span>Название</span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Шифр объекта</span>
                <input
                  value={draft.object_code}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      object_code: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="field field--full">
                <span>Комментарий</span>
                <textarea
                  rows={5}
                  value={draft.comment}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="drawer__footer">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => setCreateOpen(false)}
                >
                  Отмена
                </button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={creatingProject}
                >
                  {creatingProject ? "Создаём..." : "Создать объект"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {error ? <div className="notice notice--error">{error}</div> : null}

      {loading ? (
        <div className="project-grid project-grid--dense project-grid--loading">
          {loadingSkeletonIds.map((skeletonId, index) => (
            <ProjectCardSkeleton key={skeletonId} delay={index * 0.04} />
          ))}
        </div>
      ) : null}

      {!loading && !filteredProjects.length ? (
        <section className="projects-empty-state">
          <div>
            <h2>Объекты не найдены</h2>
            <p>Попробуйте изменить запрос или сбросить выбранные статусы.</p>
          </div>
          <div className="projects-empty-state__actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter(ALL_STATUSES_FILTER);
                setSortKey("newest");
              }}
            >
              Сбросить фильтры
            </button>
            {canCreate ? (
              <button
                className="button button--primary"
                type="button"
                onClick={() => setCreateOpen(true)}
              >
                Создать объект
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!loading ? (
        <div
          key={`${searchQuery}-${statusFilter}-${sortKey}`}
          className="project-grid project-grid--dense project-grid--animated"
        >
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
