import { useEffect, useState } from "react";
import { TbMinus, TbPlus } from "react-icons/tb";
import { api } from "@/hooks/api_client";
import {
  createBuildingAmountRow,
  createWorkItem,
  formatQuoteAmount,
  paymentTableApiToState,
  paymentTableStateToApi,
} from "./projectPaymentTableMapping";

const BUILDING_DEPENDENT_COLUMNS = [
  {
    number: 24,
    label: "Статус счёта",
    field: "invoiceStatus",
    type: "select",
    options: ["Оплачен", "Не оплачен"],
  },
  {
    number: 25,
    label: "Сумма по счёту",
    field: "invoiceAmount",
    type: "money",
    currencyField: "invoiceCurrency",
  },
  { number: 26, label: "Дата счёта", field: "invoiceDate", type: "date" },
  {
    number: 27,
    label: "Номер счёта на оплату",
    field: "invoiceNumber",
    type: "text",
  },
  {
    number: 28,
    label: "Примечание к счёту",
    field: "invoiceNote",
    type: "text",
  },
  {
    number: 29,
    label: "Статус УПД",
    field: "updStatus",
    type: "select",
    options: ["Есть", "Нет"],
  },
  {
    number: 30,
    label: "Сумма по УПД",
    field: "updAmount",
    type: "money",
    currencyField: "updCurrency",
  },
  { number: 31, label: "Дата УПД", field: "updDate", type: "date" },
  { number: 32, label: "Номер УПД", field: "updNumber", type: "text" },
  { number: 33, label: "Примечание к УПД", field: "updNote", type: "text" },
  {
    number: 34,
    label: "Смета",
    field: "estimateAmount",
    type: "money",
    currencyField: "estimateCurrency",
  },
];

export default function ProjectPaymentTable({ hidden, projectId, canEdit }) {
  const [workItemsByExpense, setWorkItemsByExpense] = useState({});
  const [buildingAmountRowsByExpense, setBuildingAmountRowsByExpense] =
    useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [horizontalRowCount, setHorizontalRowCount] = useState([{ id: 1 }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setWorkItemsByExpense({});
    setBuildingAmountRowsByExpense({});
    setHorizontalRowCount([{ id: 1 }]);
    setSaveMessage("Загрузка таблицы...");
    const restoreLocal = () => {
      if (!canEdit) return false;
      const saved = window.localStorage.getItem(`project-payment-table:${projectId}`);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      setWorkItemsByExpense(parsed?.workItemsByExpense || {});
      setBuildingAmountRowsByExpense(parsed?.buildingAmountRowsByExpense || {});
      setHorizontalRowCount(
        Array.isArray(parsed?.horizontalRowCount) && parsed.horizontalRowCount.length
          ? parsed.horizontalRowCount
          : [{ id: 1 }],
      );
      return true;
    };
    api.get(`api/v1/projects/${projectId}/payment-table`)
      .then((table) => {
        if (cancelled) return;
        if (!table.updated_at && !table.expenses?.length) {
          try {
            if (restoreLocal()) {
              setSaveMessage("Найдена локальная копия. Нажмите «Сохранить», чтобы перенести её на сервер.");
              return;
            }
          } catch {
            // Ignore an unreadable browser copy and use the server response.
          }
        }
        const state = paymentTableApiToState(table);
        setWorkItemsByExpense(state.workItemsByExpense);
        setBuildingAmountRowsByExpense(state.buildingAmountRowsByExpense);
        setHorizontalRowCount(state.horizontalRowCount);
        setSaveMessage("");
      })
      .catch(() => {
        if (cancelled) return;
        try {
          if (restoreLocal()) {
            setSaveMessage("Сервер недоступен. Показана локальная копия; изменения пока не сохранены на сервере.");
            return;
          }
        } catch {
          // Leave the table blank when the browser copy is unreadable.
        }
        setSaveMessage("Не удалось загрузить таблицу с сервера.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, canEdit]);

  const saveTable = async () => {
    if (!canEdit || loading || saving) return;
    setSaving(true);
    try {
      const payload = paymentTableStateToApi(
        horizontalRowCount,
        workItemsByExpense,
        buildingAmountRowsByExpense,
      );
      await api.put(`api/v1/projects/${projectId}/payment-table`, payload);
      setSaveMessage("Сохранено на сервере.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Неизвестная ошибка";
      setSaveMessage(`Не удалось сохранить на сервере: ${reason}`);
    } finally {
      try {
        window.localStorage.setItem(
          `project-payment-table:${projectId}`,
          JSON.stringify({ horizontalRowCount, workItemsByExpense, buildingAmountRowsByExpense }),
        );
      } catch {
        // Server persistence remains authoritative if browser storage is full.
      }
      setSaving(false);
    }
  };

  const addWorkFields = (expenseKey, buildingAmountRows) => {
    setBuildingAmountRowsByExpense((current) => ({
      ...current,
      [expenseKey]: [...buildingAmountRows, createBuildingAmountRow()],
    }));
    setSaveMessage("");
  };

  const addWorkItem = (expenseKey, workItems) => {
    setWorkItemsByExpense((current) => ({
      ...current,
      [expenseKey]: [...workItems, createWorkItem()],
    }));
    setSaveMessage("");
  };

  const updateBuildingAmountRow = (
    expenseKey,
    rows,
    rowIndex,
    field,
    value,
  ) => {
    setBuildingAmountRowsByExpense((current) => ({
      ...current,
      [expenseKey]: rows.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    }));
    setSaveMessage("");
  };

  const removeBuildingAmountRow = (expenseKey, rows, rowIndex) => {
    if (rows.length < 2) return;

    setBuildingAmountRowsByExpense((current) => ({
      ...current,
      [expenseKey]: rows.filter((_, index) => index !== rowIndex),
    }));
    setSaveMessage("");
  };

  const updateWorkItem = (expenseKey, workItems, itemIndex, field, value) => {
    setWorkItemsByExpense((current) => ({
      ...current,
      [expenseKey]: workItems.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item,
      ),
    }));
    setSaveMessage("");
  };

  const removeWorkItem = (expenseKey, workItems, itemIndex) => {
    if (workItems.length < 2) return;

    const nextItems = workItems.filter((_, index) => index !== itemIndex);
    if (itemIndex === 0) {
      nextItems[0] = { ...nextItems[0], subject: workItems[0].subject };
    }

    setWorkItemsByExpense((current) => ({
      ...current,
      [expenseKey]: nextItems,
    }));
    setSaveMessage("");
  };

  const removeLastTableRow = () => {
    if (horizontalRowCount.length < 2) return;

    const removedRow = horizontalRowCount[horizontalRowCount.length - 1];
    setHorizontalRowCount((rows) => rows.slice(0, -1));
    setWorkItemsByExpense((current) => {
      const next = { ...current };
      delete next[String(removedRow.id)];
      return next;
    });
    setBuildingAmountRowsByExpense((current) => {
      const next = { ...current };
      delete next[String(removedRow.id)];
      return next;
    });
    setSaveMessage("");
  };

  return (
    <section
      className="project-details-surface project-team-tab"
      hidden={hidden}
    >
      <div className="project-tab-heading">
        <div className="project-tab-heading__copy">
          <h2>Поставка</h2>
        </div>
      </div>

      <fieldset className="project-table-edit-fields" disabled={!canEdit || loading || saving}>
      <div className="project-table-scroll">
        <table className="project-table">
          <thead>
            <tr>
              {/*1*/}
              <th scope="col">Предмет платежа</th>

              {/*2*/}
              <th scope="col">Наименование работ, услуг</th>

              {/*3*/}
              <th scope="col">
                Наименование контрагента <br /> (поставщика)
              </th>

              {/*4*/}
              <th scope="col">
                ИНН контрагента <br /> (поставщика)
              </th>

              {/*5*/}
              <th scope="col">
                Представитель контрагента <br /> (поставщика)
              </th>

              {/*6*/}
              <th scope="col">
                Номер телефона для связи контрагента <br /> (поставщика)
              </th>

              {/*7*/}
              <th scope="col">
                Почта для связи контрагента <br /> (поставщика)
              </th>

              {/*8*/}
              <th scope="col">Здание / сооружение</th>

              {/*9*/}
              <th scope="col">
                Суммы по спецификации <br /> (с НДС)
              </th>

              {/*10*/}
              <th scope="col">Срок поставки</th>

              {/*11*/}
              <th scope="col">Плановые сроки выполнения работ</th>

              {/*12*/}
              <th scope="col">Статус</th>

              {/*13*/}
              <th scope="col">Примечание</th>

              {/*14*/}
              <th scope="col">Статус коммерческого предложения</th>

              {/*15*/}
              <th scope="col">Сумма по коммерческому предложению</th>

              {/*16*/}
              <th scope="col">Дата получения коммерческого предложения</th>

              {/*17*/}
              <th scope="col">Номер коммерческого предложения</th>

              {/*18*/}
              <th scope="col">Примечание</th>

              {/*19*/}
              <th scope="col">Статус договора</th>

              {/*20*/}
              <th scope="col">Сумма по договору</th>

              {/*21*/}
              <th scope="col">Дата заключения договора</th>

              {/*22*/}
              <th scope="col">Номер договора</th>

              {/*23*/}
              <th scope="col">Примечание</th>
              {BUILDING_DEPENDENT_COLUMNS.map((column) => (
                <th scope="col" key={column.number}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          {/*<thead>*/}
          {/*  <tr>*/}
          {/*    /!*1*!/*/}
          {/*    <th scope="col">1</th>*/}

          {/*    /!*2*!/*/}
          {/*    <th scope="col">2</th>*/}

          {/*    /!*3*!/*/}
          {/*    <th scope="col">3</th>*/}

          {/*    /!*4*!/*/}
          {/*    <th scope="col">4</th>*/}

          {/*    /!*5*!/*/}
          {/*    <th scope="col">5</th>*/}

          {/*    /!*6*!/*/}
          {/*    <th scope="col">6</th>*/}

          {/*    /!*7*!/*/}
          {/*    <th scope="col">7</th>*/}
          {/*  </tr>*/}
          {/*</thead>*/}

          <tbody>
            {horizontalRowCount.map((row) => {
              const expenseKey = String(row.id);

              const workItems = workItemsByExpense[expenseKey] || [
                createWorkItem(),
              ];
              const buildingAmountRows = buildingAmountRowsByExpense[
                expenseKey
              ] || [createBuildingAmountRow()];

              return workItems.map((workItem, index) => (
                <tr key={`${expenseKey}-work-${index}`}>
                  {/*1*/}
                  {index === 0 ? (
                    <th scope="rowgroup" rowSpan={workItems.length}>
                      <input
                        value={workItems[0].subject}
                        className="project-table-work-input"
                        aria-label="Предмет платежа"
                        placeholder=""
                        type="text"
                        onChange={(event) =>
                          updateWorkItem(
                            expenseKey,
                            workItems,
                            0,
                            "subject",
                            event.target.value,
                          )
                        }
                      />
                    </th>
                  ) : null}

                  {/*2*/}

                  <td
                    className={`project-table-work-cell${index === workItems.length - 1 ? " project-table-work-cell--last" : ""}`}
                  >
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label={`Наименование работ ${index + 1}`}
                      placeholder=""
                      value={workItem.workName}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "workName",
                          event.target.value,
                        )
                      }
                    />

                    {index === workItems.length - 1 && workItems.length > 1 ? (
                      <button
                        className="project-table-remove-work"
                        type="button"
                        aria-label={`Удалить строку ${index + 1}`}
                        title="Удалить строку"
                        onClick={() =>
                          removeWorkItem(expenseKey, workItems, index)
                        }
                      >
                        <TbMinus aria-hidden="true" />
                      </button>
                    ) : null}

                    {index === workItems.length - 1 ? (
                      <button
                        className="project-table-add-work"
                        type="button"
                        aria-label="Добавить строку наименования работ"
                        title="Добавить строку"
                        onClick={() => addWorkItem(expenseKey, workItems)}
                      >
                        <TbPlus aria-hidden="true" />
                      </button>
                    ) : null}
                  </td>

                  {/*3*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label={`Наименование контрагента, строка ${index + 1}`}
                      placeholder=""
                      value={workItem.supplierName}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "supplierName",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*4*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label={`ИНН контрагента, строка ${index + 1}`}
                      placeholder=""
                      value={workItem.supplierInn}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "supplierInn",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*5*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label={`Представитель контрагента, строка ${index + 1}`}
                      placeholder=""
                      value={workItem.supplierRepresentative}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "supplierRepresentative",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*6*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label={`Телефон контрагента, строка ${index + 1}`}
                      placeholder=""
                      value={workItem.supplierPhone}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "supplierPhone",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*7*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label={`Почта контрагента, строка ${index + 1}`}
                      value={workItem.supplierEmail}
                      placeholder=""
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "supplierEmail",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*8*/}

                  {index === 0 ? (
                    <td
                      className="project-table-building-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map(
                          (buildingAmountRow, fieldIndex) => (
                            <div
                              className="project-table-nested-field"
                              key={`building-${expenseKey}-${fieldIndex}`}
                            >
                              <input
                                className="project-table-work-input"
                                type="text"
                                aria-label={`Здание или сооружение ${fieldIndex + 1}`}
                                value={buildingAmountRow.building}
                                onChange={(event) =>
                                  updateBuildingAmountRow(
                                    expenseKey,
                                    buildingAmountRows,
                                    fieldIndex,
                                    "building",
                                    event.target.value,
                                  )
                                }
                              />
                              {fieldIndex === buildingAmountRows.length - 1 &&
                              fieldIndex !== 0 ? (
                                <button
                                  className="project-table-remove-work project-table-nested-remove"
                                  type="button"
                                  aria-label={`Удалить здание и сумму ${fieldIndex + 1}`}
                                  title="Удалить строку здания и суммы"
                                  onClick={() =>
                                    removeBuildingAmountRow(
                                      expenseKey,
                                      buildingAmountRows,
                                      fieldIndex,
                                    )
                                  }
                                >
                                  <TbMinus aria-hidden="true" />
                                </button>
                              ) : null}
                              {fieldIndex === buildingAmountRows.length - 1 ? (
                                <button
                                  className="project-table-add-work"
                                  type="button"
                                  aria-label="Добавить здание и сумму по спецификации"
                                  title="Добавить строку здания и суммы"
                                  onClick={() =>
                                    addWorkFields(
                                      expenseKey,
                                      buildingAmountRows,
                                    )
                                  }
                                >
                                  <TbPlus aria-hidden="true" />
                                </button>
                              ) : null}
                            </div>
                          ),
                        )}
                      </div>
                    </td>
                  ) : null}

                  {/*9*/}
                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map(
                          (buildingAmountRow, fieldIndex) => (
                            <div
                              className="project-table-nested-field"
                              key={`amount-${expenseKey}-${fieldIndex}`}
                            >
                              <input
                                className="project-table-work-input"
                                type="text"
                                aria-label={`Сумма по спецификации ${fieldIndex + 1}`}
                                value={buildingAmountRow.specificationAmount}
                                onChange={(event) =>
                                  updateBuildingAmountRow(
                                    expenseKey,
                                    buildingAmountRows,
                                    fieldIndex,
                                    "specificationAmount",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </td>
                  ) : null}

                  {/*10*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="date"
                      aria-label={`Срок поставки, строка ${index + 1}`}
                      value={workItem.deliveryDeadline}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "deliveryDeadline",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*11*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="date"
                      aria-label={`Плановые сроки выполнения работ, строка ${index + 1}`}
                      value={workItem.plannedWorkDates}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "plannedWorkDates",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/*10*/}

                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map(
                          (buildingAmountRow, fieldIndex) => (
                            <div
                              className="project-table-nested-field"
                              key={`amount-${expenseKey}-${fieldIndex}`}
                            >
                              <select
                                className="project-table-work-input"
                                aria-label={`Статус оплаты ${fieldIndex + 1}`}
                                value={buildingAmountRow.paymentStatus}
                                onChange={(event) =>
                                  updateBuildingAmountRow(
                                    expenseKey,
                                    buildingAmountRows,
                                    fieldIndex,
                                    "paymentStatus",
                                    event.target.value,
                                  )
                                }
                              >
                                <option>Ожидает оплаты</option>
                                <option>Оплачено</option>
                              </select>
                            </div>
                          ),
                        )}
                      </div>
                    </td>
                  ) : null}

                  {/*13*/}
                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map((item, fieldIndex) => (
                          <div
                            className="project-table-nested-field"
                            key={`note-${expenseKey}-${fieldIndex}`}
                          >
                            <input
                              className="project-table-work-input"
                              type="text"
                              aria-label={`Примечание ${fieldIndex + 1}`}
                              value={item.note}
                              onChange={(event) =>
                                updateBuildingAmountRow(
                                  expenseKey,
                                  buildingAmountRows,
                                  fieldIndex,
                                  "note",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  ) : null}

                  {/*14*/}
                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map((item, fieldIndex) => (
                          <div
                            className="project-table-nested-field"
                            key={`quote-status-${expenseKey}-${fieldIndex}`}
                          >
                            <select
                              className="project-table-work-input"
                              aria-label={`Статус коммерческого предложения ${fieldIndex + 1}`}
                              value={item.quoteStatus}
                              onChange={(event) =>
                                updateBuildingAmountRow(
                                  expenseKey,
                                  buildingAmountRows,
                                  fieldIndex,
                                  "quoteStatus",
                                  event.target.value,
                                )
                              }
                            >
                              <option>Получено</option>
                              <option>Не получено</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </td>
                  ) : null}

                  {/*15*/}
                  {index === 0 ? (
                    <td
                      className="project-table-contract-amount-cell"
                      rowSpan={workItems.length}
                      style={{ padding: 0 }}
                    >
                      {/*todo*/}
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map((item, fieldIndex) => (
                          <div
                            className="project-table-nested-field"
                            key={`quote-status-${expenseKey}-${fieldIndex}`}
                          >
                            <input
                              className="project-table-work-input"
                              type="text"
                              inputMode="decimal"
                              aria-label={`Сумма по коммерческому предложению ${fieldIndex + 1}`}
                              value={item.quoteAmount}
                              onChange={(event) => {
                                const entered = event.target.value;
                                const currency = entered.includes("$")
                                  ? "$"
                                  : entered.includes("Р")
                                    ? "₽"
                                    : entered.includes("р")
                                      ? "₽"
                                      : item.quoteCurrency;

                                setBuildingAmountRowsByExpense((current) => ({
                                  ...current,
                                  [expenseKey]: buildingAmountRows.map(
                                    (row, index) =>
                                      index === fieldIndex
                                        ? {
                                            ...row,
                                            quoteAmount: entered.replace(
                                              /[^\d.,]/g,
                                              "",
                                            ),
                                            quoteCurrency: currency,
                                          }
                                        : row,
                                  ),
                                }));
                                setSaveMessage("");
                              }}
                              onBlur={() =>
                                updateBuildingAmountRow(
                                  expenseKey,
                                  buildingAmountRows,
                                  fieldIndex,
                                  "quoteAmount",
                                  formatQuoteAmount(item.quoteAmount),
                                )
                              }
                            />
                            <span aria-hidden="true">{item.quoteCurrency}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  ) : null}

                  {/*16*/}
                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map((item, fieldIndex) => (
                          <div
                            className="project-table-nested-field"
                            key={`quote-date-${expenseKey}-${fieldIndex}`}
                          >
                            <input
                              className="project-table-work-input"
                              type="date"
                              aria-label={`Дата получения коммерческого предложения ${fieldIndex + 1}`}
                              value={item.quoteDate}
                              onChange={(event) =>
                                updateBuildingAmountRow(
                                  expenseKey,
                                  buildingAmountRows,
                                  fieldIndex,
                                  "quoteDate",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  ) : null}

                  {/*17*/}
                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map((item, fieldIndex) => (
                          <div
                            className="project-table-nested-field"
                            key={`quote-number-${expenseKey}-${fieldIndex}`}
                          >
                            <input
                              className="project-table-work-input"
                              type="text"
                              aria-label={`Номер коммерческого предложения ${fieldIndex + 1}`}
                              value={item.quoteNumber}
                              onChange={(event) =>
                                updateBuildingAmountRow(
                                  expenseKey,
                                  buildingAmountRows,
                                  fieldIndex,
                                  "quoteNumber",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  ) : null}

                  {/*18*/}
                  {index === 0 ? (
                    <td
                      className="project-table-amount-cell"
                      rowSpan={workItems.length}
                    >
                      <div className="project-table-nested-fields">
                        {buildingAmountRows.map((item, fieldIndex) => (
                          <div
                            className="project-table-nested-field"
                            key={`quote-note-${expenseKey}-${fieldIndex}`}
                          >
                            <input
                              className="project-table-work-input"
                              type="text"
                              aria-label={`Примечание ${fieldIndex + 1}`}
                              value={item.quoteNote}
                              onChange={(event) =>
                                updateBuildingAmountRow(
                                  expenseKey,
                                  buildingAmountRows,
                                  fieldIndex,
                                  "quoteNote",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  ) : null}

                  {/*19*/}
                  <td>
                    <select
                      className="project-table-work-input"
                      value={workItem.contractStatus}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "contractStatus",
                          event.target.value,
                        )
                      }
                    >
                      <option>Заключен</option>
                      <option>Поставщик отказался предоставить договор</option>
                      <option>В стадии заключения</option>
                      <option>Не заключен</option>
                    </select>
                  </td>

                  {/*20*/}
                  <td className="project-table-contract-amount-cell">
                    <div className="project-table-quote-amount project-table-contract-amount">
                      <input
                        className="project-table-work-input"
                        type="text"
                        inputMode="decimal"
                        aria-label="Сумма по договору"
                        value={workItem.contractAmount}
                        onChange={(event) => {
                          const entered = event.target.value;
                          const currency = entered.includes("$")
                            ? "$"
                            : entered.includes("Р")
                              ? "₽"
                              : entered.includes("р")
                                ? "₽"
                                : workItem.contractCurrency;
                          updateWorkItem(
                            expenseKey,
                            workItems,
                            index,
                            "contractAmount",
                            entered.replace(/[^\d.,]/g, ""),
                          );

                          if (currency !== workItem.contractCurrency)
                            updateWorkItem(
                              expenseKey,
                              workItems,
                              index,
                              "contractCurrency",
                              currency,
                            );
                        }}
                        onBlur={() =>
                          updateWorkItem(
                            expenseKey,
                            workItems,
                            index,
                            "contractAmount",
                            formatQuoteAmount(workItem.contractAmount),
                          )
                        }
                      />
                      <span>{workItem.contractCurrency}</span>
                    </div>
                  </td>
                  {/*21*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="date"
                      aria-label="Дата заключения договора"
                      value={workItem.contractDate}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "contractDate",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  {/*22*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label="Номер договора"
                      value={workItem.contractNumber}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "contractNumber",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  {/*23*/}
                  <td>
                    <input
                      className="project-table-work-input"
                      type="text"
                      aria-label="Примечание к договору"
                      value={workItem.contractNote}
                      onChange={(event) =>
                        updateWorkItem(
                          expenseKey,
                          workItems,
                          index,
                          "contractNote",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  {index === 0 &&
                    BUILDING_DEPENDENT_COLUMNS.map((column) => (
                      <td
                        className="project-table-amount-cell"
                        rowSpan={workItems.length}
                        key={`${expenseKey}-${column.field}`}
                      >
                        <div className="project-table-nested-fields">
                          {buildingAmountRows.map(
                            (buildingRow, buildingIndex) => {
                              const change = (value, extra = {}) => {
                                setSaveMessage("");
                                setBuildingAmountRowsByExpense((current) => ({
                                  ...current,
                                  [expenseKey]: buildingAmountRows.map(
                                    (item, itemIndex) =>
                                      itemIndex === buildingIndex
                                        ? {
                                            ...item,
                                            [column.field]: value,
                                            ...extra,
                                          }
                                        : item,
                                  ),
                                }));
                              };
                              const input =
                                column.type === "select" ? (
                                  <select
                                    className="project-table-work-input"
                                    aria-label={column.label}
                                    value={buildingRow[column.field]}
                                    onChange={(event) =>
                                      change(event.target.value)
                                    }
                                  >
                                    {column.options.map((option) => (
                                      <option key={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className="project-table-work-input"
                                    type={
                                      column.type === "money"
                                        ? "text"
                                        : column.type
                                    }
                                    inputMode={
                                      column.type === "money"
                                        ? "decimal"
                                        : undefined
                                    }
                                    aria-label={column.label}
                                    value={buildingRow[column.field]}
                                    onChange={(event) => {
                                      if (column.type !== "money")
                                        return change(event.target.value);
                                      const entered = event.target.value;
                                      const currency = entered.includes("$")
                                        ? "$"
                                        : entered.includes("Р")
                                          ? "₽"
                                          : entered.includes("р")
                                            ? "₽"
                                            : buildingRow[column.currencyField];
                                      change(entered.replace(/[^\d.,]/g, ""), {
                                        [column.currencyField]: currency,
                                      });
                                    }}
                                    onBlur={
                                      column.type === "money"
                                        ? () =>
                                            change(
                                              formatQuoteAmount(
                                                buildingRow[column.field],
                                              ),
                                            )
                                        : undefined
                                    }
                                  />
                                );
                              return (
                                <div
                                  className={`project-table-nested-field${column.type === "money" ? " project-table-quote-amount" : ""}`}
                                  key={`${column.field}-${buildingIndex}`}
                                >
                                  {input}
                                  {column.currencyField ? (
                                    <span>
                                      {buildingRow[column.currencyField]}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </td>
                    ))}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <div className="project-table-footer">
        {canEdit ? (
        <div className="project-table-row-actions">
          <button
            className="workspace-action workspace-action--secondary project-table-row-action"
            type="button"
            aria-label="Удалить последнюю строку таблицы"
            title="Удалить последнюю строку"
            disabled={horizontalRowCount.length < 2}
            onClick={removeLastTableRow}
          >
            <TbMinus aria-hidden="true" />
          </button>

          <button
            className="workspace-action workspace-action--secondary project-table-row-action"
            type="button"
            aria-label="Добавить строку таблицы"
            title="Добавить строку"
            onClick={() => {
              setSaveMessage("");
              setHorizontalRowCount((rows) => [
                ...rows,
                { id: Math.max(0, ...rows.map((row) => row.id)) + 1 },
              ]);
            }}
          >
            <TbPlus aria-hidden="true" />
          </button>
        </div>
        ) : null}

        <span className="project-table-save-status" role="status">
          {saveMessage}
        </span>

        {canEdit ? <button
          className="workspace-action workspace-action--primary"
          type="button"
          onClick={saveTable}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button> : null}
      </div>
      </fieldset>
    </section>
  );
}
