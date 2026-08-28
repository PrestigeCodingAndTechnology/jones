import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { StoreSettings } from "../models/StoreSettings.js";

let transporter;

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );
}

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      pool: true,
    });
  }
  return transporter;
}

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

function orderTable(order) {
  return order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(item.name)} — EU ${item.size} × ${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right">${money(item.lineSubtotal + item.lineDeliveryFee)}</td>
    </tr>`,
    )
    .join("");
}

export async function sendOrderNotifications(order) {
  const mailer = getTransporter();
  if (!mailer) throw new Error("SMTP is not configured.");
  const settings = await StoreSettings.findOne({ key: "primary" }).lean();
  const ownerEmail =
    settings?.notificationEmail || env.smtp.orderNotificationEmail;
  const summary = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#151515">
      <h1 style="margin-bottom:6px">Jones Kicks order ${escapeHtml(order.reference)}</h1>
      <p>Payment has been confirmed and the order is ready for fulfilment.</p>
      <table style="width:100%;border-collapse:collapse">${orderTable(order)}</table>
      <p><strong>Products:</strong> ${money(order.subtotal)}<br>
      <strong>Delivery:</strong> ${money(order.deliveryFee)}<br>
      <strong>Total:</strong> ${money(order.total)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customer.fullName)}<br>
      <strong>Phone:</strong> ${escapeHtml(order.customer.phone)}<br>
      <strong>Address:</strong> ${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.region)}</p>
    </div>`;

  const messages = [];
  if (ownerEmail && settings?.orderAlerts !== false) {
    messages.push(
      mailer.sendMail({
        from: env.smtp.from,
        to: ownerEmail,
        subject: `New paid order ${order.reference}`,
        html: summary,
      }),
    );
  }
  messages.push(
    mailer.sendMail({
      from: env.smtp.from,
      to: order.customer.email,
      subject: `Your Jones Kicks order ${order.reference}`,
      html: summary.replace(
        "Payment has been confirmed and the order is ready for fulfilment.",
        `Hi ${escapeHtml(order.customer.fullName)}, your payment is confirmed. We will contact you about delivery.`,
      ),
    }),
  );
  await Promise.all(messages);
}

export async function recordNotificationResult(order, task) {
  try {
    await task;
    order.notification.sentAt = new Date();
    order.notification.lastError = "";
  } catch (error) {
    order.notification.lastError = String(error.message || error).slice(0, 500);
  }
  await order.save();
}
