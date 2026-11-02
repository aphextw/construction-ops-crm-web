import { Link, Navigate } from "react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FiArrowUpRight,
  FiBarChart2,
  FiBriefcase,
  FiDollarSign,
  FiFileText,
} from "react-icons/fi";

import { useGetProjects } from "@/hooks/getProjects";
import { useProfileStore } from "@/store/useProfileStore";
import { formatDate, formatMoney, pluralize } from "@/lib/format";
import { getStatusMeta, withAlpha } from "@/lib/projectMeta";
import { MdCurrencyRuble } from "react-icons/md";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";

const ANALYTICS_ROLES = [
  "director",
  "deputy_director",
  "developer",
  "inzhkom_b_manager",
];

const MONTH_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
});

const COMPACT_MONEY_FORMATTER = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function parseAmount(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getProjectChartCeiling(value) {
  if (!Number.isFinite(value) || value <= 0) return 4;
  return Math.max(4, Math.ceil((value * 1.3) / 2) * 2);
}

function getBudgetChartCeiling(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const padded = value * 1.1;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
  const step = steps.find((candidate) => candidate >= normalized) || 10;

  return step * magnitude;
}

function formatCompactMoney(value) {
  if (!value) return "0 ₽";
  return `${COMPACT_MONEY_FORMATTER.format(value)} ₽`;
}

function buildDonutSegments(rows) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return rows.map((row) => {
    const length = circumference * row.share;
    const segment = {
      ...row,
      radius,
      circumference,
      strokeDasharray: `${length} ${circumference - length}`,
      strokeDashoffset: -offset,
    };

    offset += length;
    return segment;
  });
}

function buildMonthlyFlow(projects) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    return {
      key,
      label: MONTH_FORMATTER.format(date).replace(".", ""),
      projects: 0,
      budget: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  projects.forEach((project) => {
    const createdAt = parseDate(project?.created_at);
    if (!createdAt) return;

    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (!bucket) return;

    bucket.projects += 1;
    bucket.budget += parseAmount(
      project?.actual_materials_cost || project?.total_materials_cost,
    );
  });

  return buckets;
}

function AnalyticsSkeleton() {
  return (
    <>
      <section className="analytics-summary analytics-summary--loading">
        {Array.from({ length: 4 }, (_, index) => (
          <article
            className="analytics-summary__item"
            key={`analytics-stat-${index}`}
          >
            <span className="skeleton-line skeleton-line--sm shimmer-block" />
            <span className="skeleton-line skeleton-line--lg shimmer-block" />
          </article>
        ))}
      </section>

      <section className="analytics-dashboard-grid">
        <article className="analytics-section analytics-section--skeleton">
          <span className="skeleton-line skeleton-line--sm shimmer-block" />
          <span className="analytics-skeleton-circle shimmer-block" />
          <span className="skeleton-line skeleton-line--md shimmer-block" />
        </article>

        <article className="analytics-section analytics-section--skeleton">
          <span className="skeleton-line skeleton-line--sm shimmer-block" />
          <div className="analytics-skeleton-bars">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                className="analytics-skeleton-bar shimmer-block"
                key={`analytics-bar-${index}`}
              />
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

export default function AnalyticsPage() {
  const user = useProfileStore((state) => state.user);
  const loadingProfile = useProfileStore((state) => state.loadingProfile);
  const role = user?.role?.code;
  const { projects, loading, error } = useGetProjects();
  const [chartMetric, setChartMetric] = useState("projects");

  const analytics = useMemo(() => {
    const totals = projects.reduce(
      (acc, project) => {
        const budget = parseAmount(
          project?.actual_materials_cost || project?.total_materials_cost,
        );
        const expensesCount = Array.isArray(project?.material_expenses)
          ? project.material_expenses.length
          : 0;

        acc.totalBudget += budget;
        acc.totalExpenses += expensesCount;

        if (project?.status) {
          const bucket = acc.byStatus[project.status] || {
            count: 0,
            budget: 0,
          };
          bucket.count += 1;
          bucket.budget += budget;
          acc.byStatus[project.status] = bucket;
        }

        return acc;
      },
      { totalBudget: 0, totalExpenses: 0, byStatus: {} },
    );

    const projectCount = projects.length;
    const averageBudget = projectCount ? totals.totalBudget / projectCount : 0;

    const statusRows = Object.entries(totals.byStatus)
      .map(([statusKey, value]) => {
        const count = value.count || 0;
        const budget = value.budget || 0;
        const share = projectCount ? count / projectCount : 0;

        return {
          key: statusKey,
          count,
          budget,
          share,
          ...getStatusMeta(statusKey),
        };
      })
      .sort((a, b) => b.count - a.count);

    const donutSegments = buildDonutSegments(
      statusRows.filter((row) => row.share > 0),
    );

    const topProjects = [...projects]
      .sort(
        (a, b) =>
          parseAmount(b?.actual_materials_cost || b?.total_materials_cost) -
          parseAmount(a?.actual_materials_cost || a?.total_materials_cost),
      )
      .slice(0, 5);

    const recentProjects = [...projects]
      .sort((a, b) => {
        const left = parseDate(a?.created_at)?.getTime() || 0;
        const right = parseDate(b?.created_at)?.getTime() || 0;
        return right - left;
      })
      .slice(0, 5);

    const monthlyFlow = buildMonthlyFlow(projects);
    const maxMonthlyCount = Math.max(
      ...monthlyFlow.map((bucket) => bucket.projects),
      1,
    );
    const maxMonthlyBudget = Math.max(
      ...monthlyFlow.map((bucket) => bucket.budget),
      0,
    );
    return {
      projectCount,
      totalBudget: totals.totalBudget,
      totalExpenses: totals.totalExpenses,
      averageBudget,
      activeStatuses: statusRows.length,
      statusRows,
      donutSegments,
      topProjects,
      recentProjects,
      monthlyFlow,
      maxMonthlyCount,
      maxMonthlyBudget,
    };
  }, [projects]);

  const chartIsBudget = chartMetric === "budget";
  const chartMaximum = chartIsBudget
    ? getBudgetChartCeiling(analytics.maxMonthlyBudget)
    : getProjectChartCeiling(analytics.maxMonthlyCount);
  const chartMiddle = chartMaximum / 2;
  const formatChartValue = chartIsBudget
    ? formatCompactMoney
    : (value) => String(Math.round(value));

  if (loadingProfile) {
    return <div className="notice">Загружаем профиль...</div>;
  }

  if (!ANALYTICS_ROLES.includes(role || "")) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="page workspace-page analytics-page">
      <WorkspacePageHeader
        title="Панель проектов"
        description="Ключевые показатели, этапы и динамика по объектам."
      />

      {error ? <div className="notice notice--error">{error}</div> : null}
      {loading ? <AnalyticsSkeleton /> : null}

      {!loading ? (
        <>
          <section
            className="analytics-summary"
            aria-label="Ключевые показатели"
          >
            <article className="analytics-summary__item analytics-summary__item--primary">
              <div className="analytics-summary__label">
                <FiBriefcase aria-hidden="true" />
                <span>Всего проектов</span>
              </div>
              <strong>{analytics.projectCount}</strong>
              <p>
                {pluralize(
                  analytics.projectCount,
                  "объект",
                  "объекта",
                  "объектов",
                )}{" "}
                в системе
              </p>
            </article>

            <article className="analytics-summary__item">
              <div className="analytics-summary__label">
                <MdCurrencyRuble aria-hidden="true" />
                <span>Общий бюджет</span>
              </div>
              <strong>{formatMoney(analytics.totalBudget)}</strong>
              <p>По сумме материалов в текущем портфеле</p>
            </article>

            <article className="analytics-summary__item">
              <div className="analytics-summary__label">
                <FiBarChart2 aria-hidden="true" />
                <span>Средний бюджет</span>
              </div>
              <strong>{formatMoney(analytics.averageBudget)}</strong>
              <p>Средняя стоимость материалов на проект</p>
            </article>

            <article className="analytics-summary__item">
              <div className="analytics-summary__label">
                <FiFileText aria-hidden="true" />
                <span>Расходов заведено</span>
              </div>
              <strong>{analytics.totalExpenses}</strong>
              <p>{analytics.activeStatuses} активных статусов в работе</p>
            </article>
          </section>

          <section className="analytics-dashboard-grid">
            <article className="analytics-section analytics-section--statuses">
              <div className="analytics-section__header analytics-section__header--stacked">
                <h2>Статусы проектов</h2>
                <span className="analytics-muted">
                  Распределение текущего портфеля
                </span>
              </div>

              <div className="analytics-donut-layout">
                <div className="analytics-donut">
                  <svg viewBox="0 0 180 180" aria-hidden="true">
                    <circle
                      className="analytics-donut__track"
                      cx="90"
                      cy="90"
                      r="66"
                    />
                    {analytics.donutSegments.map((segment) => (
                      <circle
                        key={segment.key}
                        cx="90"
                        cy="90"
                        r={segment.radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="14"
                        strokeDasharray={segment.strokeDasharray}
                        strokeDashoffset={segment.strokeDashoffset}
                        transform="rotate(-90 90 90)"
                      />
                    ))}
                  </svg>

                  <div className="analytics-donut__center">
                    <strong>{analytics.projectCount}</strong>
                    <span>проектов</span>
                  </div>
                </div>

                <div className="analytics-status-list">
                  {analytics.statusRows.map((status) => (
                    <div
                      className="analytics-status-row"
                      key={status.key}
                      style={{
                        "--status-color": status.color,
                        "--status-tint": withAlpha(status.color, 0.1),
                      }}
                    >
                      <span
                        className="analytics-status-row__swatch"
                        aria-hidden="true"
                      />
                      <div className="analytics-status-row__name">
                        <strong>{status.label}</strong>
                        <small>
                          {Math.round(status.share * 100)}% портфеля
                        </small>
                      </div>

                      <div className="analytics-status-row__metric analytics-status-row__metric--budget">
                        <span>Общая сумма:</span>
                        <strong>{formatMoney(status.budget)}</strong>
                      </div>

                      <div className="analytics-status-row__metric">
                        <span>Всего:</span>
                        <strong>{status.count}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="analytics-section analytics-section--flow">
              <div className="analytics-section__header analytics-section__header--chart">
                <div>
                  <h2>Динамика за 6 месяцев</h2>
                  <span className="analytics-muted">
                    {chartIsBudget
                      ? "Бюджет новых проектов по месяцам"
                      : "Количество новых проектов по месяцам"}
                  </span>
                </div>

                <div
                  className="analytics-chart-switch"
                  aria-label="Показатель графика"
                >
                  {[
                    ["projects", "Проекты"],
                    ["budget", "Бюджет"],
                  ].map(([value, label]) => (
                    <button
                      className={chartMetric === value ? "is-active" : ""}
                      key={value}
                      type="button"
                      aria-pressed={chartMetric === value}
                      onClick={() => setChartMetric(value)}
                    >
                      {chartMetric === value ? (
                        <motion.span
                          className="analytics-chart-switch__active"
                          layoutId="analytics-chart-metric"
                          transition={{
                            duration: 0.2,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      ) : null}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="analytics-column-chart"
                role="img"
                aria-label={
                  chartIsBudget
                    ? "Динамика бюджета новых проектов за шесть месяцев"
                    : "Динамика количества новых проектов за шесть месяцев"
                }
              >
                <div className="analytics-column-chart__plot">
                  <div
                    className="analytics-column-chart__axis"
                    aria-hidden="true"
                  >
                    <span>{formatChartValue(chartMaximum)}</span>
                    <span>{formatChartValue(chartMiddle)}</span>
                    <span>{chartIsBudget ? "0 ₽" : "0"}</span>
                  </div>

                  <div className="analytics-column-chart__columns">
                    <i className="analytics-column-chart__grid-line analytics-column-chart__grid-line--top" />
                    <i className="analytics-column-chart__grid-line analytics-column-chart__grid-line--middle" />
                    <i className="analytics-column-chart__grid-line analytics-column-chart__grid-line--bottom" />

                    {analytics.monthlyFlow.map((bucket) => (
                      <div
                        className="analytics-column-chart__column"
                        key={bucket.key}
                        aria-label={`${bucket.label}: ${bucket.projects} проектов, бюджет ${formatMoney(bucket.budget)}`}
                      >
                        <div
                          className="analytics-column-chart__bar-area"
                          aria-hidden="true"
                        >
                          <motion.span
                            className={`analytics-column-chart__bar analytics-column-chart__bar--${chartMetric}`}
                            initial={false}
                            animate={{
                              height: `${((chartIsBudget ? bucket.budget : bucket.projects) / chartMaximum) * 100}%`,
                            }}
                            transition={{
                              duration: 0.28,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="analytics-column-chart__months">
                  {analytics.monthlyFlow.map((bucket) => (
                    <div key={`${bucket.key}-label`}>
                      <strong>{bucket.label}</strong>
                      <span
                        className={`analytics-column-chart__value analytics-column-chart__value--${chartMetric}`}
                      >
                        {chartIsBudget
                          ? formatCompactMoney(bucket.budget)
                          : bucket.projects}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>

          <section className="analytics-dashboard-grid analytics-dashboard-grid--secondary">
            <article className="analytics-section">
              <div className="analytics-section__header analytics-section__header--stacked">
                <h2>Топ по бюджету</h2>
                <span className="analytics-muted">
                  Проекты с наибольшей стоимостью материалов
                </span>
              </div>

              <div className="analytics-project-list">
                {analytics.topProjects.map((project) => {
                  const status = getStatusMeta(project.status);
                  const budget = parseAmount(
                    project?.actual_materials_cost ||
                      project?.total_materials_cost,
                  );

                  return (
                    <Link
                      className="analytics-project-row"
                      key={project.id}
                      to={`/projects/${project.id}`}
                    >
                      <div className="analytics-project-row__main">
                        <strong>{project.name}</strong>
                        <span>
                          {project.object_code || "Без кода"} ·{" "}
                          {project.project_code || "Без кода проекта"}
                        </span>
                      </div>
                      <div className="analytics-project-row__side">
                        <span
                          className="status-pill status-pill--analytics"
                          style={{
                            color: status.color,
                            borderColor: withAlpha(status.color, 0.22),
                            backgroundColor: withAlpha(status.color, 0.1),
                          }}
                        >
                          {status.label}
                        </span>
                        <strong>{formatMoney(budget)}</strong>
                        <FiArrowUpRight aria-hidden="true" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </article>

            <article className="analytics-section">
              <div className="analytics-section__header analytics-section__header--stacked">
                <h2>Недавно добавлены</h2>
                <span className="analytics-muted">
                  Последние проекты в системе
                </span>
              </div>

              <div className="analytics-project-list">
                {analytics.recentProjects.map((project) => (
                  <Link
                    className="analytics-project-row"
                    key={project.id}
                    to={`/projects/${project.id}`}
                  >
                    <div className="analytics-project-row__main">
                      <strong>{project.name}</strong>
                      <span>
                        {formatDate(project?.created_at)} ·{" "}
                        {pluralize(
                          project?.material_expenses?.length || 0,
                          "1 расход",
                          `${project?.material_expenses?.length || 0} расхода`,
                          `${project?.material_expenses?.length || 0} расходов`,
                        )}
                      </span>
                    </div>
                    <div className="analytics-project-row__side">
                      <strong>
                        {formatMoney(
                          project?.actual_materials_cost ||
                            project?.total_materials_cost,
                        )}
                      </strong>
                      <FiArrowUpRight aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
