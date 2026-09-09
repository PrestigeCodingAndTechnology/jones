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

export async function verifyEmailConnection() {
  const mailer = getTransporter();
  if (!mailer) {
    throw new Error("SMTP is not configured.");
  }
  return mailer.verify();
}

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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

function emailShell(content) {
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#151515;line-height:1.55">${content}<p style="margin-top:28px;color:#666;font-size:12px">Jones Kicks • Premium sneakers • Sizes 40–45</p></div>`;
}

function orderSummary(order, intro) {
  return emailShell(`
      <h1 style="margin-bottom:6px">Jones Kicks order ${escapeHtml(order.reference)}</h1>
      <p>${intro}</p>
      <table style="width:100%;border-collapse:collapse">${orderTable(order)}</table>
      <p><strong>Products:</strong> ${money(order.subtotal)}<br>
      <strong>Delivery:</strong> ${money(order.deliveryFee)}<br>
      ${order.discount ? `<strong>Discount${order.promotion?.code ? ` (${escapeHtml(order.promotion.code)})` : ""}:</strong> −${money(order.discount)}<br>` : ""}
      <strong>Total:</strong> ${money(order.total)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customer.fullName)}<br>
      <strong>Phone:</strong> ${escapeHtml(order.customer.phone)}<br>
      <strong>Address:</strong> ${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.region)}</p>
  `);
}

export async function sendOrderNotifications(order) {
  const mailer = getTransporter();
  if (!mailer) throw new Error("SMTP is not configured.");
  const settings = await StoreSettings.findOne({ key: "primary" }).lean();
  const ownerEmail =
    settings?.notificationEmail || env.smtp.orderNotificationEmail;
  const needsReview = order.status === "Needs review";
  const ownerHtml = orderSummary(
    order,
    needsReview
      ? "Payment has been confirmed, but this order requires manual review before fulfilment. Check stock and the order history before taking action."
      : "Payment has been confirmed and the order is ready for fulfilment.",
  );
  const customerHtml = orderSummary(
    order,
    needsReview
      ? `Hi ${escapeHtml(order.customer.fullName)}, your payment is confirmed. Our team is reviewing your order and will contact you before delivery.`
      : `Hi ${escapeHtml(order.customer.fullName)}, your payment is confirmed. We will contact you about delivery.`,
  );

  const messages = [];
  if (ownerEmail && settings?.orderAlerts !== false) {
    messages.push(
      mailer.sendMail({
        from: env.smtp.from,
        to: ownerEmail,
        subject: needsReview
          ? `Paid order needs review ${order.reference}`
          : `New paid order ${order.reference}`,
        html: ownerHtml,
      }),
    );
  }
  messages.push(
    mailer.sendMail({
      from: env.smtp.from,
      to: order.customer.email,
      subject: `Your Jones Kicks order ${order.reference}`,
      html: customerHtml,
    }),
  );
  await Promise.all(messages);
}

export async function sendOrderStatusNotification(order) {
  const mailer = getTransporter();
  if (!mailer) return false;
  await mailer.sendMail({
    from: env.smtp.from,
    to: order.customer.email,
    subject: `Order ${order.reference}: ${order.status}`,
    html: emailShell(`
      <h1 style="margin-bottom:8px">Order update</h1>
      <p>Hi ${escapeHtml(order.customer.fullName)},</p>
      <p>Your Jones Kicks order <strong>${escapeHtml(order.reference)}</strong> is now <strong>${escapeHtml(order.status)}</strong>.</p>
      <p>Total: <strong>${money(order.total)}</strong></p>
      <p>If you need help, reply to this email or contact Jones Kicks support.</p>
    `),
  });
  return true;
}

export async function sendContactNotification(message) {
  const mailer = getTransporter();
  if (!mailer) return false;
  const settings = await StoreSettings.findOne({ key: "primary" }).lean();
  const ownerEmail =
    settings?.notificationEmail || env.smtp.orderNotificationEmail;
  if (!ownerEmail) return false;
  await mailer.sendMail({
    from: env.smtp.from,
    to: ownerEmail,
    subject: `Jones Kicks enquiry from ${message.name}`,
    html: emailShell(`
      <h1>New customer enquiry</h1>
      <p><strong>Name:</strong> ${escapeHtml(message.name)}<br>
      <strong>Phone:</strong> ${escapeHtml(message.phone)}</p>
      <p>${escapeHtml(message.message).replace(/\n/g, "<br>")}</p>
    `),
  });
  return true;
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
