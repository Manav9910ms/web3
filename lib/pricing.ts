export function getShippingFee(subtotal: number) {
  const threshold = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD || 999);
  const fee = Number(process.env.NEXT_PUBLIC_SHIPPING_FEE || 59);
  return subtotal >= threshold ? 0 : fee;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTotal(subtotal: number, discount = 0) {
  return roundMoney(subtotal + getShippingFee(subtotal) - discount);
}
