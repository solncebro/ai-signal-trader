export function ensureNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
