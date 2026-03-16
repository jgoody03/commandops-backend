export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}