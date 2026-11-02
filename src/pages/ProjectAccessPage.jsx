import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { useGetProject } from "@/hooks/projectRefresh";
import { useProjectUserAccess } from "@/hooks/project/useProjectUserAccess";
import { useUsers } from "@/hooks/useUsers";
import { useProfileStore } from "@/store/useProfileStore";
import { canManageProjectUsers } from "@/lib/projectMeta";
import { TbReload } from "react-icons/tb";
import { FaCheck } from "react-icons/fa";
import { IoPersonRemove } from "react-icons/io5";

export default function ProjectAccessPage() {
  const { projectId } = useParams();
  const currentUser = useProfileStore((state) => state.user);
  const role = currentUser?.role?.code;
  const canManage = canManageProjectUsers(role);

  const { getProject, refreshing } = useGetProject(projectId);
  const { getUsers } = useUsers();
  const {
    listUserAccess,
    addUserAccess,
    updateUserAccess,
    deleteUserAccess,
    savingUserAccess,
    errorUserAccess,
  } = useProjectUserAccess();

  const [project, setProject] = useState(null);
  const [accessList, setAccessList] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_edit: false,
  });
  const [selectedAccess, setSelectedAccess] = useState(null);

  const load = async (force = false) => {
    const [nextProject, nextAccess, nextUsers] = await Promise.all([
      getProject(projectId, force),
      listUserAccess(projectId, force),
      getUsers(force),
    ]);

    setProject(nextProject);
    setAccessList(nextAccess);
    setUsers(nextUsers);
  };

  useEffect(() => {
    void load(false);
  }, [projectId]);

  const availableUsers = useMemo(
    () =>
      users.filter(
        (user) => !accessList.some((access) => access.user.id === user.id),
      ),
    [users, accessList],
  );

  const resetEditor = () => {
    setSelectedAccess(null);
    setSelectedUserId("");
    setPermissions({ can_view: true, can_edit: false });
  };

  const submit = async () => {
    if (!canManage) return;

    if (selectedAccess) {
      await updateUserAccess(projectId, selectedAccess.id, {
        user_id: selectedAccess.user.id,
        ...permissions,
      });
    } else if (selectedUserId) {
      await addUserAccess(projectId, {
        user_id: selectedUserId,
        ...permissions,
      });
    }

    resetEditor();
    await load(true);
  };

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
          className="project-icon-button"
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

        <button className="project-icon-button" onClick={load}>
          <TbReload size={22} color="#6b7280" />
        </button>
      </div>

      <div className="page-header">
        <div>
          <span className="eyebrow">Доступы</span>

          <h1>{project?.name || "Проект"}</h1>
          <p>Персональный доступ пользователей к проекту.</p>
        </div>
      </div>

      {errorUserAccess ? (
        <div className="notice notice--error">{errorUserAccess}</div>
      ) : null}
      {refreshing ? <div className="notice">Загружаем доступы...</div> : null}

      <div className="two-column">
        {/*<section className="panel">*/}
        {/*  <div className="section-title">*/}
        {/*    <h2>Ролевой доступ</h2>*/}
        {/*  </div>*/}

        {/*  <div className="chip-row">*/}
        {/*    {(project?.visible_roles || []).map((roleItem) => (*/}
        {/*      <span className="chip chip--static" key={roleItem.code}>*/}
        {/*        {roleItem.display_name || roleItem.code}*/}
        {/*      </span>*/}
        {/*    ))}*/}
        {/*  </div>*/}
        {/*</section>*/}

        {canManage ? (
          <section className="panel">
            <div className="section-title">
              <h2>
                {selectedAccess ? "Редактировать доступ" : "Выдать доступ"}
              </h2>
            </div>

            <div className="form-grid">
              {!selectedAccess ? (
                <label className="field">
                  <span>Пользователь</span>
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                  >
                    <option value="">Выберите пользователя</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} - {user.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="checkbox-field">
                <span>Разрешить просмотр</span>
                <input
                  type="checkbox"
                  checked={permissions.can_view}
                  onChange={(event) =>
                    setPermissions((current) => ({
                      ...current,
                      can_view: event.target.checked,
                    }))
                  }
                />
              </label>

              <label className="checkbox-field">
                <span>Разрешить редактирование</span>
                <input
                  type="checkbox"
                  checked={permissions.can_edit}
                  onChange={(event) =>
                    setPermissions((current) => ({
                      ...current,
                      can_edit: event.target.checked,
                    }))
                  }
                />
              </label>

              <div className="toolbar">
                <button
                  className="button button--primary svg-button"
                  onClick={submit}
                  disabled={savingUserAccess}
                >
                  {selectedAccess ? "Сохранить" : "Выдать доступ"}
                  <FaCheck size={13} />
                </button>
                {selectedAccess ? (
                  <button
                    className="button button--ghost"
                    onClick={resetEditor}
                  >
                    Отмена
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className="panel">
        <div className="section-title">
          <h2>Персональные доступы</h2>
        </div>

        <div className="table">
          <div className="table__head">
            <span>Пользователь</span>
            <span>Компания</span>
            <span>Права</span>
            <span>Действия</span>
          </div>

          {accessList.map((access) => (
            <div className="table__row" key={access.id}>
              <div>
                <strong>{access.user.full_name}</strong>
                <div className="muted">{access.user.email}</div>
              </div>
              <div>{access.user.company?.display_name || "-"}</div>
              <div>
                {[
                  access.can_view ? "Просмотр" : null,
                  access.can_edit ? "Редактирование" : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              <div className="toolbar">
                {canManage ? (
                  <>
                    <button
                      className="button button--ghost"
                      onClick={() => {
                        setSelectedAccess(access);
                        setPermissions({
                          can_view: access.can_view,
                          can_edit: access.can_edit,
                        });
                      }}
                    >
                      Изменить
                    </button>

                    <button
                      className="button button--danger svg-button"
                      onClick={async () => {
                        if (window.confirm("Удалить доступ?")) {
                          await deleteUserAccess(projectId, access.id);
                          await load(true);
                        }
                      }}
                    >
                      Удалить
                      <IoPersonRemove size={14} />
                    </button>
                  </>
                ) : (
                  <span className="muted">Только просмотр</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
