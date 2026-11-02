export const createWorkItem = () => ({
  subject: "",
  workName: "",
  supplierName: "",
  supplierInn: "",
  supplierRepresentative: "",
  supplierPhone: "",
  supplierEmail: "",
  deliveryDeadline: "",
  plannedWorkDates: "",
  status: "",
  contractStatus: "Не заключен",
  contractAmount: "",
  contractCurrency: "₽",
  contractDate: "",
  contractNumber: "",
  contractNote: "",
});

export const createBuildingAmountRow = () => ({
  building: "",
  specificationAmount: "",
  paymentStatus: "Ожидает оплаты",
  note: "",
  quoteStatus: "Не получено",
  quoteAmount: "",
  quoteCurrency: "₽",
  quoteDate: "",
  quoteNumber: "",
  quoteNote: "",
  invoiceStatus: "Не оплачен",
  invoiceAmount: "",
  invoiceCurrency: "₽",
  invoiceDate: "",
  invoiceNumber: "",
  invoiceNote: "",
  updStatus: "Нет",
  updAmount: "",
  updCurrency: "₽",
  updDate: "",
  updNumber: "",
  updNote: "",
  estimateAmount: "",
  estimateCurrency: "₽",
});

export const formatQuoteAmount = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return value;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const dotIndex = normalized.indexOf(".");
  const decimals = dotIndex === -1 ? 0 : normalized.length - dotIndex - 1;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

const amountForApi = (value) => {
  const raw = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  if (!raw) return "";
  const normalized = raw.replace(/^0+(?=\d)/, "");
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Проверь суммы: нужны числа без пробелов, максимум два знака после запятой.");
  }
  return normalized;
};

const currencyForApi = (value) => {
  if (value === "₽" || value === "Р" || value === "р") return "RUB";
  if (value === "$") return "USD";
  if (value === "€") return "EUR";
  if (!value || /^[A-Z]{3}$/.test(value)) return value || "";
  throw new Error("Неизвестная валюта в таблице.");
};

const currencyForView = (value) =>
  ({ RUB: "₽", USD: "$", EUR: "€" })[value] || value || "₽";

const documentForApi = (row, prefix) => ({
  status: row[`${prefix}Status`] || "",
  amount: amountForApi(row[`${prefix}Amount`]),
  currency: currencyForApi(row[`${prefix}Currency`]),
  date: row[`${prefix}Date`] || "",
  number: row[`${prefix}Number`] || "",
  note: row[`${prefix}Note`] || "",
});

const documentForView = (document = {}, prefix) => ({
  [`${prefix}Status`]: document.status || "",
  [`${prefix}Amount`]: formatQuoteAmount(document.amount || ""),
  [`${prefix}Currency`]: currencyForView(document.currency),
  [`${prefix}Date`]: document.date || "",
  [`${prefix}Number`]: document.number || "",
  [`${prefix}Note`]: document.note || "",
});

export function paymentTableStateToApi(
  horizontalRowCount,
  workItemsByExpense,
  buildingAmountRowsByExpense,
) {
  return {
    expenses: horizontalRowCount.map((row) => {
      const key = String(row.id);
      const works = workItemsByExpense[key] || [createWorkItem()];
      const buildings = buildingAmountRowsByExpense[key] || [createBuildingAmountRow()];
      return {
        subject: works[0]?.subject || "",
        works: works.map((work) => ({
          name: work.workName || "",
          supplier: work.supplierName || "",
          supplier_inn: work.supplierInn || "",
          supplier_representative: work.supplierRepresentative || "",
          supplier_phone: work.supplierPhone || "",
          supplier_email: work.supplierEmail || "",
          delivery_deadline: work.deliveryDeadline || "",
          planned_work_dates: work.plannedWorkDates || "",
          status: work.status || "",
          contract: documentForApi(work, "contract"),
        })),
        buildings: buildings.map((building) => ({
          name: building.building || "",
          specification_amount: amountForApi(building.specificationAmount),
          specification_currency: "RUB",
          payment_status:
            typeof building.paymentStatus === "string"
              ? building.paymentStatus
              : "",
          note: building.note || "",
          commercial_proposal: documentForApi(building, "quote"),
          invoice: documentForApi(building, "invoice"),
          upd: documentForApi(building, "upd"),
          estimate_amount: amountForApi(building.estimateAmount),
          estimate_currency: currencyForApi(building.estimateCurrency),
        })),
      };
    }),
  };
}

export function paymentTableApiToState(data) {
  const expenses = Array.isArray(data?.expenses) ? data.expenses : [];
  const horizontalRowCount = expenses.length
    ? expenses.map((_, index) => ({ id: index + 1 }))
    : [{ id: 1 }];
  const workItemsByExpense = {};
  const buildingAmountRowsByExpense = {};
  expenses.forEach((expense, index) => {
    const key = String(index + 1);
    const works = Array.isArray(expense.works) ? expense.works : [];
    const buildings = Array.isArray(expense.buildings) ? expense.buildings : [];
    workItemsByExpense[key] = (works.length ? works : [{}]).map((work, workIndex) => ({
      ...createWorkItem(),
      subject: workIndex === 0 ? expense.subject || "" : "",
      workName: work.name || "",
      supplierName: work.supplier || "",
      supplierInn: work.supplier_inn || "",
      supplierRepresentative: work.supplier_representative || "",
      supplierPhone: work.supplier_phone || "",
      supplierEmail: work.supplier_email || "",
      deliveryDeadline: work.delivery_deadline || "",
      plannedWorkDates: work.planned_work_dates || "",
      status: work.status || "",
      ...documentForView(work.contract, "contract"),
    }));
    buildingAmountRowsByExpense[key] = (buildings.length ? buildings : [{}]).map(
      (building) => ({
        ...createBuildingAmountRow(),
        building: building.name || "",
        specificationAmount: formatQuoteAmount(building.specification_amount || ""),
        paymentStatus: building.payment_status || "Ожидает оплаты",
        note: building.note || "",
        ...documentForView(building.commercial_proposal, "quote"),
        ...documentForView(building.invoice, "invoice"),
        ...documentForView(building.upd, "upd"),
        estimateAmount: formatQuoteAmount(building.estimate_amount || ""),
        estimateCurrency: currencyForView(building.estimate_currency),
      }),
    );
  });
  return { horizontalRowCount, workItemsByExpense, buildingAmountRowsByExpense };
}
