import PDFDocument from "pdfkit";

export function buildReceipt(order) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date();
    const items = Array.isArray(order?.items) ? order.items : [];
    const shipping = order?.shipping || {};

    doc.fontSize(20).text(`Квитанция по заказу #${order?._id || "—"}`, { align: "left" });
    doc.moveDown();

    doc.fontSize(12).text(`Дата: ${createdAt.toLocaleString("ru-RU")}`);
    doc.text(`Покупатель: ${order?.customer?.name || shipping?.recipient?.name || "—"}`);
    if (shipping?.recipient?.address?.address) {
      doc.text(`Адрес: ${shipping.recipient.address.address}`);
    }

    doc.moveDown();
    doc.fontSize(14).text("Состав заказа:");
    doc.moveDown(0.5);

    let itemsTotal = 0;
    items.forEach((item, index) => {
      const quantity = Number(item?.quantity) || 0;
      const price = Number(item?.price) || 0;
      const subtotal = price * quantity;
      itemsTotal += subtotal;

      doc.fontSize(12).text(`${index + 1}. ${item?.title || "Работа"}`);
      doc.fontSize(10).text(`Количество: ${quantity}  Цена: ${price.toFixed(2)} ₽  Сумма: ${subtotal.toFixed(2)} ₽`);
      doc.moveDown(0.5);
    });

    const shippingCost = Number(shipping?.price) || 0;
    const total = itemsTotal + shippingCost;

    doc.moveDown();
    doc.fontSize(12).text(`Товары: ${itemsTotal.toFixed(2)} ₽`);
    doc.text(`Доставка: ${shippingCost.toFixed(2)} ₽ (${shipping?.serviceName || shipping?.provider || "—"})`);
    doc.text(`Итого к оплате: ${total.toFixed(2)} ₽`, { underline: true });

    doc.end();
  });
}

export default { buildReceipt };
