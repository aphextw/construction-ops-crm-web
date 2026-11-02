import { Link } from "react-router";
import { TbArrowUpRight } from "react-icons/tb";

import { formatDate, formatMoney } from "@/lib/format";
import { getStatusMeta, withAlpha } from "@/lib/projectMeta";

export function ProjectCardSkeleton({ delay = 0 }) {
  return (
    <div
      className="project-card project-card--skeleton"
      style={{ animationDelay: `${delay}s` }}
      aria-hidden="true"
    >
      <div className="project-card__head">
        <div className="project-card__eyebrow">
          <span className="skeleton-line skeleton-line--sm shimmer-block" />
        </div>
        <span className="status-pill status-pill--skeleton shimmer-block" />
      </div>

      <div className="project-card__title-group">
        <span className="skeleton-line skeleton-line--lg shimmer-block" />
        <span className="skeleton-line skeleton-line--md shimmer-block" />
      </div>

      <div className="project-card__footer">
        <div className="project-card__meta">
          <span className="project-meta-item">
            <span className="skeleton-line skeleton-line--xs shimmer-block" />
            <span className="skeleton-line skeleton-line--sm shimmer-block" />
          </span>

          <span className="project-meta-item project-meta-item--budget">
            <span className="skeleton-line skeleton-line--xs shimmer-block" />
            <span className="skeleton-line skeleton-line--sm shimmer-block" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProjectCard({ project }) {
  const status = getStatusMeta(project.status);
  const budget = formatMoney(
    project.actual_materials_cost || project.total_materials_cost,
  );

  return (
    <Link
      to={`/projects/${project.id}`}
      className="project-card"
      aria-label={`Открыть объект ${project.name}`}
    >
      <div className="project-card__head">
        <div className="project-card__eyebrow">
          <span className="project-card__code">
            {project.object_code || "Без шифра"}
          </span>
          <span className="project-card__number">
            № {project.number || "Авто"}
          </span>
        </div>

        <span
          className="status-pill status-pill--project"
          style={{
            "--status-color": status.color,
            "--status-bg": withAlpha(status.color, 0.12),
            "--status-border": withAlpha(status.color, 0.34),
          }}
        >
          {status.label}
        </span>
      </div>

      <div className="project-card__title-group">
        <h2>{project.name}</h2>
      </div>

      <div className="project-card__footer">
        <div className="project-card__meta">
          <span className="project-meta-item">
            <strong>Создан</strong>
            <span>{formatDate(project.created_at)}</span>
          </span>
          <span className="project-meta-item project-meta-item--budget">
            <strong>Материалы</strong>
            <span className="project-card__budget">{budget}</span>
          </span>
        </div>

        <span className="project-card__open" aria-hidden="true">
          <TbArrowUpRight />
        </span>
      </div>
    </Link>
  );
}
