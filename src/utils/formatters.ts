/** Extract city from a standard address string */
export function extractCity(address?: string | null): string {
  if (!address) return "Addis Ababa";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[0];
  }
  return parts[0] || "Addis Ababa";
}

/** Formats a phone number cleanly */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  return phone.replace(/^(\+251|0)/, "+251 ");
}

