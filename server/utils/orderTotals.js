export function calculateOrderTotal(order) {
  if (!order) {
    return 0;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsTotal = items.reduce((sum, item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    const normalizedPrice = Number.isFinite(price) && price >= 0 ? price : 0;
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    return sum + normalizedPrice * normalizedQuantity;
  }, 0);

  const shippingPrice = Number(order?.shipping?.price);
  const normalizedShipping = Number.isFinite(shippingPrice) && shippingPrice >= 0 ? shippingPrice : 0;

  const total = itemsTotal + normalizedShipping;
  return Math.round(total * 100) / 100;
}

export default calculateOrderTotal;
