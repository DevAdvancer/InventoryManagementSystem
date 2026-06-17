export function formatCurrency(value) {
  const number = Number(value ?? 0);
  if (Number.isNaN(number)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
}

export function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
