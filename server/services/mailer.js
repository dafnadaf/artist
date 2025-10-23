import nodemailer from "nodemailer";

let cachedTransporter = undefined;

function resolveTransporter() {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: Number.isFinite(port) ? port === 465 : false,
    auth: { user, pass },
  });

  return cachedTransporter;
}

function getFromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
}

export function isMailerConfigured() {
  return Boolean(resolveTransporter());
}

export async function sendOrderCreated(to, order) {
  if (!to) {
    return null;
  }

  const transporter = resolveTransporter();

  if (!transporter) {
    return null;
  }

  const total = Number(order?.total ?? 0).toFixed(2);
  const subject = `Заказ #${order?._id || "—"} создан`;
  const text = [`Спасибо за заказ!`, `Номер заказа: ${order?._id || "—"}`, `Сумма: ${total} ₽`].join("\n");
  const html = `
    <p>Спасибо за заказ!</p>
    <p><strong>Номер заказа:</strong> ${order?._id || "—"}</p>
    <p><strong>Сумма:</strong> ${total} ₽</p>
  `;

  return transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });
}

export async function sendPaymentSuccess(to, order, pdfBuffer) {
  if (!to) {
    return null;
  }

  const transporter = resolveTransporter();

  if (!transporter) {
    return null;
  }

  const tracking = order?.shipping?.trackingNumber || "—";
  const subject = `Оплата заказа #${order?._id || "—"} получена`;
  const text = [`Оплата успешно получена.`, `Номер заказа: ${order?._id || "—"}`, `Трек-номер: ${tracking}`].join("\n");
  const html = `
    <p>Оплата успешно получена.</p>
    <p><strong>Номер заказа:</strong> ${order?._id || "—"}</p>
    <p><strong>Трек-номер:</strong> ${tracking}</p>
  `;

  const attachments = pdfBuffer
    ? [
        {
          filename: `receipt-${order?._id || "order"}.pdf`,
          content: pdfBuffer,
        },
      ]
    : [];

  return transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
    attachments,
  });
}

export default {
  isMailerConfigured,
  sendOrderCreated,
  sendPaymentSuccess,
};
