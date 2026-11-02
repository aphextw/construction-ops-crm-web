function SvgIcon({ children, viewBox = "0 0 24 24", ...props }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

const sectionIconProps = {
  width: 22,
  height: 22,
};

export function ProjectGeneralIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 9h8M8 12h8M8 15h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

export function ProjectStatusIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A8.5 8.5 0 0 0 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 7v5l3.5 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function ProjectSectionsIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M4 8h16M4 12h16M4 16h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 6.5v3M11 10.5v3M15 14.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

export function ProjectFilesIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M7 3.5h7l4 4v13H7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5v4.5h4M10 12h5M10 16h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

export function ProjectWorkersIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <circle
        cx="9"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M16 5.5a3 3 0 0 1 0 5.5M17 13.5a4.5 4.5 0 0 1 3.5 4.4V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function ProjectAccessIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M12 3.5 20 7v5c0 4.2-2.9 7.9-8 8.5-5.1-.6-8-4.3-8-8.5V7l8-3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.2 11 13.7l3.5-3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function ProjectPersonalAccessIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M12 3.5 20 7v5c0 4.2-2.9 7.9-8 8.5-5.1-.6-8-4.3-8-8.5V7l8-3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.2 11 13.7l3.5-3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8.25" r="1.1" fill="currentColor" />
    </SvgIcon>
  );
}

export function ProjectServiceIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M5 6.5h14M8 4.5h8l1 2v11l-1 2H8l-1-2v-11l1-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 11h6M9 14.5h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

export function ProjectHistoryIcon(props) {
  return (
    <SvgIcon {...sectionIconProps} {...props}>
      <path
        d="M12 7v5l3.2 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 6.2A8.5 8.5 0 1 1 4 12h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12 2.5 9.5M4 12l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <SvgIcon {...props}>
      <path
        d="m14.5 6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function AccessShieldIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3 20 7v5c0 4.2-2.9 7.9-8 8.5-5.1-.6-8-4.3-8-8.5V7z" />
      <path d="m9 12 2 2 4-4" />
    </SvgIcon>
  );
}

export function RefreshIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </SvgIcon>
  );
}

export function DeleteIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </SvgIcon>
  );
}

export function ChevronRightIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </SvgIcon>
  );
}

export function ArrowUpRightIcon(props) {
  return (
    <SvgIcon {...props}>
      <path
        d="M6.75 17.25 17.25 6.75M8.25 6.75h9v9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export const PROJECT_SECTION_ICONS = {
  general: ProjectGeneralIcon,
  status: ProjectStatusIcon,
  sections: ProjectSectionsIcon,
  files: ProjectFilesIcon,
  workers: ProjectWorkersIcon,
  access: ProjectAccessIcon,
  personalAccess: ProjectPersonalAccessIcon,
  service: ProjectServiceIcon,
  history: ProjectHistoryIcon,
};
