import assert from "node:assert/strict";
import test from "node:test";
import {
  createBuildingAmountRow,
  createWorkItem,
  paymentTableApiToState,
  paymentTableStateToApi,
} from "./projectPaymentTableMapping.js";

test("converts the web table to the API contract and back", () => {
  const work = {
    ...createWorkItem(),
    subject: "Оборудование",
    workName: "Монтаж",
    supplierName: "ООО Поставщик",
    supplierInn: "1234567890",
    contractAmount: "23 178 229,20",
    contractCurrency: "₽",
    contractDate: "2026-10-31",
  };
  const building = {
    ...createBuildingAmountRow(),
    building: "Корпус 1",
    specificationAmount: "150 000,00",
    paymentStatus: "Оплачено",
    quoteAmount: "150 000,00",
    quoteCurrency: "₽",
    invoiceAmount: "150 000,00",
    invoiceCurrency: "₽",
    updAmount: "0,00",
    estimateAmount: "150 000,00",
  };
  const payload = paymentTableStateToApi(
    [{ id: 7 }],
    { 7: [work] },
    { 7: [building] },
  );
  assert.equal(payload.expenses[0].works[0].contract.amount, "23178229.20");
  assert.equal(payload.expenses[0].works[0].contract.currency, "RUB");
  assert.equal(payload.expenses[0].buildings[0].invoice.amount, "150000.00");
  assert.equal(payload.expenses[0].buildings[0].payment_status, "Оплачено");

  const restored = paymentTableApiToState(payload);
  assert.equal(restored.workItemsByExpense[1][0].supplierInn, "1234567890");
  assert.equal(restored.workItemsByExpense[1][0].contractAmount.replace(/\s/g, ""), "23178229,20");
  assert.equal(restored.buildingAmountRowsByExpense[1][0].invoiceAmount.replace(/\s/g, ""), "150000,00");
  assert.equal(restored.buildingAmountRowsByExpense[1][0].paymentStatus, "Оплачено");
});

test("rejects an invalid money string before sending it to the API", () => {
  const work = { ...createWorkItem(), contractAmount: "abc" };
  assert.throws(
    () => paymentTableStateToApi([{ id: 1 }], { 1: [work] }, {}),
    /Проверь суммы/,
  );
});
