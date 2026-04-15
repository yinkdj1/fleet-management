export function formatBookingId(id: string | number | null | undefined) {
  if (id === null || id === undefined) return "";
  const raw = String(id).replace(/^TRIP/, "");
  return `TRIP${raw.padStart(5, "0")}`;
}
