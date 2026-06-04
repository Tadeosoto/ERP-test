export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeZone: "America/Mexico_City",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency === "MXN" ? "MXN" : currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
