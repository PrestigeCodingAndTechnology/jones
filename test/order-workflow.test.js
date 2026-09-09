import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedOrderStatuses,
  statusAfterVerifiedPayment,
  validateOrderStatusChange,
} from "../src/services/orderWorkflow.js";

function order(overrides = {}) {
  return {
    status: "New",
    payment: { status: "paid" },
    statusHistory: [
      { status: "Awaiting payment" },
      { status: "New" },
    ],
    inventoryCommittedAt: new Date(),
    inventoryRestockedAt: null,
    ...overrides,
  };
}

test("unpaid orders cannot enter fulfilment", () => {
  const unpaid = order({
    status: "Awaiting payment",
    payment: { status: "pending" },
    inventoryCommittedAt: null,
    statusHistory: [{ status: "Awaiting payment" }],
  });
  assert.deepEqual(allowedOrderStatuses(unpaid), ["Awaiting payment", "Cancelled"]);
  assert.throws(
    () => validateOrderStatusChange(unpaid, "New"),
    /has not been paid/i,
  );
});

test("paid order cancellation requests inventory restock", () => {
  const result = validateOrderStatusChange(order(), "Cancelled");
  assert.equal(result.changed, true);
  assert.equal(result.shouldRestock, true);
  assert.equal(result.shouldClaimInventory, false);
});

test("completed and cancelled orders are terminal", () => {
  assert.throws(
    () => validateOrderStatusChange(order({ status: "Completed" }), "Processing"),
    /locked/i,
  );
  assert.throws(
    () => validateOrderStatusChange(order({ status: "Cancelled" }), "New"),
    /locked/i,
  );
});

test("needs-review order can retry inventory claim before returning to fulfilment", () => {
  const review = order({
    status: "Needs review",
    inventoryCommittedAt: null,
    statusHistory: [
      { status: "Awaiting payment" },
      { status: "Needs review" },
    ],
  });
  assert.deepEqual(allowedOrderStatuses(review), ["Needs review", "New", "Cancelled"]);
  const result = validateOrderStatusChange(review, "New");
  assert.equal(result.shouldClaimInventory, true);
});

test("fulfilment workflow prevents skipping past dispatch", () => {
  assert.throws(
    () => validateOrderStatusChange(order({ status: "Processing" }), "Completed"),
    /workflow/i,
  );
  assert.doesNotThrow(() =>
    validateOrderStatusChange(order({ status: "Processing" }), "Dispatched"),
  );
});
test("a late payment cannot silently resurrect a cancelled order", () => {
  assert.equal(
    statusAfterVerifiedPayment({ wasCancelled: true, inventoryOk: false }),
    "Needs review",
  );
  assert.equal(
    statusAfterVerifiedPayment({ wasCancelled: false, inventoryOk: true }),
    "New",
  );
});
