export default function WorkspacePageHeader({
  title,
  description,
  actions,
  className = "",
}) {
  const headerClassName = ["workspace-page-header", className]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className="workspace-page-header__heading">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>

      {actions ? (
        <div className="workspace-page-header__actions">{actions}</div>
      ) : null}
    </header>
  );
}
