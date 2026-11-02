import { Navigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { useProfileStore } from "@/store/useProfileStore";
import { useMaterials } from "@/hooks/materials/useMaterials";
import { useMaterialSets } from "@/hooks/materials/useMaterialSets";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import { FaPlus } from "react-icons/fa6";
import {
  FiBox,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiLayers,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";

const MATERIALS_ROLES_MATCHERS = [
  (role) => role === "developer",
  (role) => role?.includes("pto"),
  (role) => role?.includes("estimator"),
];

function getMaterialValueLabel(item) {
  return item?.valueLabel || item?.value || "Параметр";
}

function getMaterialUnitLabel(item) {
  return typeof item?.unit === "string"
    ? item.unit
    : item?.unit?.display_name || item?.unit?.code || "";
}

function pluralize(count, one, few, many) {
  const abs = Math.abs(count) % 100;
  const mod = abs % 10;

  if (abs > 10 && abs < 20) return many;
  if (mod > 1 && mod < 5) return few;
  if (mod === 1) return one;
  return many;
}

function canSeeMaterials(role) {
  return MATERIALS_ROLES_MATCHERS.some((matcher) => matcher(role || ""));
}

export default function MaterialsPage() {
  const user = useProfileStore((state) => state.user);
  const loadingProfile = useProfileStore((state) => state.loadingProfile);
  const role = user?.role?.code;

  const [mode, setMode] = useState("materials");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [expandedSetIds, setExpandedSetIds] = useState([]);
  const [sheetSearch, setSheetSearch] = useState("");
  const [initializingCatalog, setInitializingCatalog] = useState(true);
  const [form, setForm] = useState({
    name: "",
    valueLabel: "",
    unit: "",
    measurements: "",
  });

  const {
    materials,
    units,
    loadingMaterials,
    loadingUnits,
    savingMaterial,
    deletingMaterial,
    materialsError,
    materialActionError,
    unitsError,
    getMaterials,
    getMeasurementUnits,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  } = useMaterials();

  const {
    sets,
    loadingSets,
    savingSet,
    deletingSet,
    setsError,
    setActionError,
    getMaterialSets,
    createSetWithItems,
    updateSetWithItems,
    removeMaterialSet,
  } = useMaterialSets();

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        await getMaterials();
        await getMeasurementUnits();
        await getMaterialSets();
      } finally {
        setInitializingCatalog(false);
      }
    };

    void loadCatalog();
  }, [getMaterials, getMeasurementUnits, getMaterialSets]);

  const isMaterialsMode = mode === "materials";

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return materials;

    return materials.filter((item) =>
      [
        item.name,
        getMaterialValueLabel(item),
        item.measurements,
        getMaterialUnitLabel(item),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [materials, search]);

  const filteredSets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sets;

    return sets.filter((item) =>
      [item.name, ...item.set_items.map((entry) => entry.name)]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [sets, search]);

  const availableMaterials = useMemo(() => {
    const query = sheetSearch.trim().toLowerCase();
    if (!query) return materials;

    return materials.filter((item) =>
      [
        item.name,
        getMaterialValueLabel(item),
        item.measurements,
        getMaterialUnitLabel(item),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [materials, sheetSearch]);

  const activeData = isMaterialsMode ? filteredMaterials : filteredSets;
  const activeLoading =
    initializingCatalog || (isMaterialsMode ? loadingMaterials : loadingSets);
  const activeError = isMaterialsMode ? materialsError : setsError;
  const selectedMaterials = useMemo(
    () => materials.filter((item) => selectedMaterialIds.includes(item.id)),
    [materials, selectedMaterialIds],
  );

  if (loadingProfile) {
    return <div className="notice">Загружаем профиль...</div>;
  }

  if (!canSeeMaterials(role)) {
    return <Navigate to="/projects" replace />;
  }

  const resetEditor = () => {
    setForm({
      name: "",
      valueLabel: "",
      unit: "",
      measurements: "",
    });
    setSelectedMaterialIds([]);
    setSheetSearch("");
    setEditingItemId(null);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    resetEditor();
  };

  const openCreate = (nextMode = mode) => {
    setMode(nextMode);
    setSearch("");
    resetEditor();
    setEditorOpen(true);
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setSearch("");
  };

  const reloadActiveData = () => {
    if (isMaterialsMode) {
      void getMaterials(true);
      return;
    }

    void getMaterialSets(true);
  };

  const openEditMaterial = (item) => {
    setEditingItemId(item.id);
    setForm({
      name: item.name || "",
      valueLabel: getMaterialValueLabel(item),
      unit: item.unit?.id || "",
      measurements: item.measurements || "",
    });
    setSelectedMaterialIds([]);
    setSheetSearch("");
    setEditorOpen(true);
  };

  const openEditSet = (item) => {
    setEditingItemId(item.id);
    setForm({
      name: item.name || "",
      valueLabel: "",
      unit: "",
      measurements: "",
    });

    const linkedIds = (item.set_items || [])
      .map((entry) => entry.material_id)
      .filter(Boolean);

    setSelectedMaterialIds(linkedIds);
    setSheetSearch("");
    setEditorOpen(true);
  };

  const toggleMaterialSelection = (materialId) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId],
    );
  };

  const handleDeleteMaterial = async (materialId) => {
    const success = await deleteMaterial(materialId);
    if (success) {
      await getMaterialSets(true);
    }
  };

  const handleDeleteSet = async (setId) => {
    const success = await removeMaterialSet(setId);
    if (success) {
      setExpandedSetIds((prev) => prev.filter((id) => id !== setId));
    }
  };

  const toggleSetExpanded = (setId) => {
    setExpandedSetIds((prev) =>
      prev.includes(setId)
        ? prev.filter((id) => id !== setId)
        : [...prev, setId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    if (isMaterialsMode) {
      const normalizedMeasurement = form.measurements.trim().replace(",", ".");
      const numericMeasurement = Number.parseFloat(normalizedMeasurement);
      if (!form.valueLabel.trim() || !form.unit || !units.length) return;
      if (
        !normalizedMeasurement ||
        Number.isNaN(numericMeasurement) ||
        numericMeasurement <= 0
      )
        return;

      const payload = {
        name: form.name.trim(),
        value: form.valueLabel.trim(),
        unit_id: form.unit,
        measurements: normalizedMeasurement,
      };
      const savedMaterial = editingItemId
        ? await updateMaterial(editingItemId, payload)
        : await createMaterial(payload);
      if (!savedMaterial) return;
      if (editingItemId) await getMaterialSets(true);
    } else {
      if (!selectedMaterialIds.length) return;
      const setItemsPayload = selectedMaterials.map((item, index) => ({
        material_id: item.id,
        measurements: item.measurements,
        sort_order: index,
      }));
      const existingSet = editingItemId
        ? sets.find((item) => item.id === editingItemId)
        : null;
      const savedSet = existingSet
        ? await updateSetWithItems(
            existingSet,
            form.name.trim(),
            setItemsPayload,
          )
        : await createSetWithItems(form.name.trim(), setItemsPayload);
      if (!savedSet) return;
    }

    closeEditor();
  };

  return (
    <div className="page workspace-page materials-page">
      <WorkspacePageHeader
        title="База материалов"
        description="Материалы и комплекты для ПТО и сметных ролей."
        actions={
          <>
            <button
              className="workspace-action workspace-action--secondary materials-create-button materials-create-button--secondary"
              type="button"
              onClick={() => openCreate("sets")}
            >
              <FiLayers aria-hidden="true" />
              Новый комплект
            </button>
            <button
              className="workspace-action workspace-action--primary materials-create-button"
              type="button"
              onClick={() => openCreate("materials")}
            >
              <FaPlus size={14} />
              Новый материал
            </button>
          </>
        }
      />

      <section className="materials-database">
        <div className="materials-toolbar">
          <div className="materials-segmented" role="tablist" aria-label="Вид базы">
            <button
              className={`materials-segmented__button ${isMaterialsMode ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={isMaterialsMode}
              onClick={() => changeMode("materials")}
            >
              <span>Материалы</span>
              <span className="materials-segmented__count">
                {initializingCatalog && !materials.length ? "…" : materials.length}
              </span>
            </button>
            <button
              className={`materials-segmented__button ${!isMaterialsMode ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={!isMaterialsMode}
              onClick={() => changeMode("sets")}
            >
              <span>Комплекты</span>
              <span className="materials-segmented__count">
                {initializingCatalog ? "…" : sets.length}
              </span>
            </button>
          </div>

          <div className="materials-toolbar__meta">
            {activeData.length}{" "}
            {isMaterialsMode
              ? pluralize(
                  activeData.length,
                  "материал",
                  "материала",
                  "материалов",
                )
              : pluralize(
                  activeData.length,
                  "комплект",
                  "комплекта",
                  "комплектов",
                )}
          </div>
        </div>

        <label className="field field--grow search-field materials-search">
          <span className="materials-search__label">Поиск</span>
          <div className="search-field__control">
            <span className="search-field__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              placeholder={
                isMaterialsMode
                  ? "Название, параметр, размер"
                  : "Название комплекта"
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button
                className="search-field__clear"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Очистить поиск"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </label>

        {activeError ? (
          <div className="materials-load-error" role="alert">
            <span>
              {isMaterialsMode
                ? "Не удалось загрузить материалы."
                : "Не удалось загрузить комплекты."}
            </span>
            <button type="button" onClick={reloadActiveData}>
              <FiRefreshCw aria-hidden="true" />
              Повторить
            </button>
          </div>
        ) : null}

        {activeLoading && !activeData.length ? (
          <div className="materials-loading" role="status">
            Загружаем {isMaterialsMode ? "материалы" : "комплекты"}...
          </div>
        ) : !activeData.length && !activeError ? (
          <section className="panel empty-state materials-empty-state">
            <h2>
              {isMaterialsMode ? "Материалов пока нет" : "Комплектов пока нет"}
            </h2>
            <p style={{ paddingBottom: 10 }}>
              {isMaterialsMode
                ? "Добавьте первый материал, чтобы собрать базу для работы."
                : "Создайте комплект из уже добавленных материалов."}
            </p>
            <div className="toolbar">
              <button
                className="button button--primary"
                onClick={() => openCreate(mode)}
              >
                {isMaterialsMode ? "Добавить материал" : "Создать комплект"}
              </button>
            </div>
          </section>
        ) : (
          <div className="materials-list">
            <div className="materials-list__head" aria-hidden="true">
              <span>Название</span>
              <span>{isMaterialsMode ? "Характеристики" : "Состав"}</span>
              <span>Действия</span>
            </div>
            {isMaterialsMode
              ? filteredMaterials.map((item) => (
                  <article className="material-card" key={item.id}>
                    <div className="material-card__identity">
                      <span className="material-card__icon" aria-hidden="true">
                        <FiBox />
                      </span>
                      <div className="material-card__title-row">
                        <h2>{item.name}</h2>
                      </div>
                    </div>
                    <div className="material-card__properties">
                      <div>
                        <span>Параметр</span>
                        <strong>{getMaterialValueLabel(item)}</strong>
                      </div>
                      <div>
                        <span>Значение</span>
                        <strong>
                          {item.measurements} {getMaterialUnitLabel(item)}
                        </strong>
                      </div>
                    </div>
                    <div className="material-card__actions">
                      <button
                        className="material-action"
                        onClick={() => openEditMaterial(item)}
                      >
                        <FiEdit2 aria-hidden="true" />
                        Изменить
                      </button>
                      <button
                        className="material-action material-action--danger"
                        onClick={() => handleDeleteMaterial(item.id)}
                      >
                        <FiTrash2 aria-hidden="true" />
                        Удалить
                      </button>
                    </div>
                  </article>
                ))
              : filteredSets.map((item) => (
                  <article
                    className="material-card material-card--set"
                    key={item.id}
                  >
                    <div className="material-card__identity">
                      <span className="material-card__icon" aria-hidden="true">
                        <FiLayers />
                      </span>
                      <div className="material-card__title-row">
                        <h2>{item.name}</h2>
                      </div>
                    </div>
                    <div className="material-card__properties material-card__properties--set">
                      <div>
                        <span>Материалов</span>
                        <strong>
                          {item.set_items.length}{" "}
                          {pluralize(
                            item.set_items.length,
                            "позиция",
                            "позиции",
                            "позиций",
                          )}
                        </strong>
                      </div>
                      {item.set_items.length ? (
                        <button
                          className="material-set-toggle"
                          type="button"
                          onClick={() => toggleSetExpanded(item.id)}
                        >
                          {expandedSetIds.includes(item.id) ? (
                            <FiChevronUp aria-hidden="true" />
                          ) : (
                            <FiChevronDown aria-hidden="true" />
                          )}
                          {expandedSetIds.includes(item.id)
                            ? "Скрыть состав"
                            : "Показать состав"}
                        </button>
                      ) : null}
                    </div>
                    <div className="material-card__actions">
                      <button
                        className="material-action"
                        onClick={() => openEditSet(item)}
                      >
                        <FiEdit2 aria-hidden="true" />
                        Изменить
                      </button>
                      <button
                        className="material-action material-action--danger"
                        onClick={() => handleDeleteSet(item.id)}
                      >
                        <FiTrash2 aria-hidden="true" />
                        Удалить
                      </button>
                    </div>
                    {expandedSetIds.includes(item.id) ? (
                      <div className="material-set-list">
                        {item.set_items.map((entry, index) => (
                          <span
                            className="material-set-chip"
                            key={`${item.id}-${index}`}
                          >
                            {entry.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
          </div>
        )}
      </section>

      {editorOpen ? (
        <div className="drawer-backdrop" onClick={closeEditor}>
          <aside
            className="drawer drawer--project"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="materials-drawer-title"
          >
            <div className="drawer__header">
              <div className="drawer__title-group">
                <span className="eyebrow">
                  {isMaterialsMode ? "Материал" : "Комплект"}
                </span>
                <h2 id="materials-drawer-title">
                  {editingItemId
                    ? isMaterialsMode
                      ? "Редактирование материала"
                      : "Редактирование комплекта"
                    : isMaterialsMode
                      ? "Новый материал"
                      : "Новый комплект"}
                </h2>
                <p>
                  {isMaterialsMode
                    ? "Добавьте материал в общую базу."
                    : "Соберите комплект из существующих материалов."}
                </p>
              </div>

              <button
                className="drawer__close"
                type="button"
                onClick={closeEditor}
                aria-label="Закрыть"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form
              className="drawer__body form-grid form-grid--two"
              onSubmit={handleSubmit}
            >
              <label className="field field--full">
                <span>Название</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              {isMaterialsMode ? (
                <>
                  <label className="field">
                    <span>Параметр</span>
                    <input
                      value={form.valueLabel}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          valueLabel: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Значение</span>
                    <input
                      value={form.measurements}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          measurements: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Единица</span>
                    <select
                      value={form.unit}
                      disabled={loadingUnits || !units.length}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          unit: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="" disabled>
                        {loadingUnits
                          ? "Загружаем единицы..."
                          : units.length
                            ? "Выберите единицу"
                            : "Единицы недоступны"}
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.display_name}
                        </option>
                      ))}
                    </select>
                    {unitsError ? (
                      <span className="field__error">
                        Не удалось загрузить единицы.
                        <button
                          type="button"
                          onClick={() => void getMeasurementUnits(true)}
                        >
                          Повторить
                        </button>
                      </span>
                    ) : (
                      <small>Выберите единицу измерения из справочника.</small>
                    )}
                  </label>
                </>
              ) : (
                <div className="field field--full">
                  <span>Материалы в комплекте</span>
                  <div className="materials-picker">
                    <label className="field field--full search-field">
                      <span>Поиск</span>
                      <div className="search-field__control">
                        <span className="search-field__icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                          </svg>
                        </span>
                        <input
                          placeholder="Поиск материала"
                          value={sheetSearch}
                          onChange={(event) =>
                            setSheetSearch(event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <div className="materials-picker__list">
                      {availableMaterials.map((item) => {
                        const selected = selectedMaterialIds.includes(item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`materials-picker__item ${selected ? "is-active" : ""}`}
                            onClick={() => toggleMaterialSelection(item.id)}
                          >
                            <div>
                              <strong>{item.name}</strong>
                              <span>
                                {getMaterialValueLabel(item)} ·{" "}
                                {item.measurements} {getMaterialUnitLabel(item)}
                              </span>
                            </div>
                            <span className="materials-picker__check">
                              {selected ? "Выбран" : "Выбрать"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="drawer__footer">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={closeEditor}
                >
                  Отмена
                </button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={
                    savingMaterial ||
                    savingSet ||
                    (isMaterialsMode && (!form.unit || loadingUnits))
                  }
                >
                  {savingMaterial || savingSet
                    ? "Сохраняем..."
                    : editingItemId
                      ? "Сохранить"
                      : "Создать"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
