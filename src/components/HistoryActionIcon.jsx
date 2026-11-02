const ICON_PATHS = {
  status: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5M10 13h5M10 17h5" />
    </>
  ),
  expense: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 15h2" />
    </>
  ),
  access: (
    <>
      <path d="M12 3 20 7v5c0 4.4-3 7.8-8 9-5-1.2-8-4.6-8-9V7z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  section: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="7" height="6" rx="1.5" />
      <rect x="15" y="14" width="5" height="6" rx="1.5" />
    </>
  ),
  comment: (
    <path d="M5 5h14v11H9l-4 4z" />
  ),
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m4 17 5-4 3 2 3-3 5 5" />
    </>
  ),
  project: (
    <>
      <path d="M4 20V7l8-4 8 4v13" />
      <path d="M8 10h8M8 14h8M8 18h8" />
    </>
  ),
};

export function HistoryActionIcon({ type = "project" }) {
  return (
    <span className={`history-action-icon history-action-icon--${type}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS[type] || ICON_PATHS.project}
      </svg>
    </span>
  );
}
