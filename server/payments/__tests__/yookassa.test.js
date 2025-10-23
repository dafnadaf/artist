import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { calculateOrderTotal, YooKassaProvider } from "../yookassa.js";
import Order from "../../models/Order.js";

test("calculateOrderTotal sums items and shipping", () => {
  const total = calculateOrderTotal({
    items: [
      { price: 1250.5, quantity: 2 },
      { price: 500, quantity: 1 },
      { price: -20, quantity: 5 },
    ],
    shipping: { price: 350 },
  });

  assert.equal(total, 3351);
});

test("YooKassaProvider.handleWebhook marks order as paid", async () => {
  const orderDocument = {
    _id: "order123",
    id: "order123",
    status: "awaiting_payment",
    payment: { status: "awaiting", provider: "yookassa" },
    history: [],
    save: mock.fn(async () => orderDocument),
  };

  const verificationPayload = {
    isValid: true,
    orderId: "order123",
    status: "succeeded",
    amount: 3351,
    currency: "RUB",
    payment: {
      id: "pay-1",
      captured_at: "2024-01-01T12:00:00Z",
    },
  };

  const provider = new YooKassaProvider({
    client: { createPayment: async () => ({}) },
    verifier: async () => verificationPayload,
  });

  const findMock = mock.method(Order, "findById", async () => orderDocument);

  const result = await provider.handleWebhook({
    payload: { event: "payment.succeeded", object: { metadata: { orderId: "order123" }, id: "pay-1" } },
    requestId: "req-1",
  });

  assert.equal(result.handled, true);
  assert.equal(orderDocument.status, "paid");
  assert.equal(orderDocument.payment.status, "succeeded");
  assert.equal(orderDocument.payment.externalId, "pay-1");
  assert.ok(orderDocument.payment.paidAt instanceof Date);
  assert.ok(orderDocument.history.length > 0);
  assert.equal(orderDocument.history.at(-1).status, "paid");

  assert.equal(orderDocument.save.mock.callCount(), 1);
  assert.equal(findMock.mock.callCount(), 1);

  mock.restoreAll();
});
