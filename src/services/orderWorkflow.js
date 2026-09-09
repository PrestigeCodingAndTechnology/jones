import { HttpError } from "../utils/http.js";

export const ORDER_STATUSES = [
  "Awaiting payment",
  "New",
  "Confirmed",
  "Processing",
  "Dispatched",
  "Completed",
  "Cancelled",
  "Needs review",
];

function previousOperationalStatus(order) {
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  for (let index = history.length - 2; index >= 0; index -= 1) {
    const status = history[index]?.status;
    if (
      status &&
      !["Awaiting payment", "Needs review", "Cancelled", "Completed"].includes(status)
    ) {
      return status;
    }
  }
  return "";
}

export function allowedOrderStatuses(order) {
  const current = String(order?.status || "");
  const paid = order?.payment?.status === "paid" || order?.paymentStatus === "paid";
  if (current === "Completed" || current === "Cancelled") return [current];
  if (!paid) return current === "Cancelled" ? ["Cancelled"] : [current, "Cancelled"];

  const transitions = {
    New: ["New", "Confirmed", "Processing", "Cancelled", "Needs review"],
    Confirmed: ["Confirmed", "Processing", "Cancelled", "Needs review"],
    Processing: ["Processing", "Dispatched", "Cancelled", "Needs review"],
    Dispatched: ["Dispatched", "Completed", "Needs review"],
  };
  if (current === "Needs review") {
    const previous = previousOperationalStatus(order);
    return ["Needs review", previous || "New", "Cancelled"];
  }
  return transitions[current] || [current, "Needs review", "Cancelled"];
}

export function validateOrderStatusChange(order, nextStatus) {
  if (!ORDER_STATUSES.includes(nextStatus)) {
    throw new HttpError(400, "Choose a valid order status.");
  }
  const current = String(order?.status || "");
  if (current === nextStatus) {
    return { changed: false, shouldClaimInventory: false, shouldRestock: false };
  }
  if (nextStatus === "Awaiting payment") {
    throw new HttpError(400, "Payment status is controlled by the payment system.");
  }
  const allowed = allowedOrderStatuses(order);
  if (!allowed.includes(nextStatus)) {
    if (order?.payment?.status !== "paid" && order?.paymentStatus !== "paid") {
      throw new HttpError(
        409,
        "This order has not been paid. It cannot enter fulfilment until payment is verified.",
      );
    }
    if (current === "Cancelled" || current === "Completed") {
      throw new HttpError(409, `${current} orders are locked from further fulfilment changes.`);
    }
    throw new HttpError(
      409,
      `Move this order through the fulfilment workflow from ${current} before selecting ${nextStatus}.`,
    );
  }

  return {
    changed: true,
    shouldClaimInventory:
      current === "Needs review" &&
      nextStatus !== "Cancelled" &&
      !order?.inventoryCommittedAt,
    shouldRestock:
      nextStatus === "Cancelled" &&
      Boolean(order?.inventoryCommittedAt) &&
      !order?.inventoryRestockedAt,
  };
}
export function statusAfterVerifiedPayment({ wasCancelled = false, inventoryOk = false } = {}) {
  if (wasCancelled) return "Needs review";
  return inventoryOk ? "New" : "Needs review";
}
