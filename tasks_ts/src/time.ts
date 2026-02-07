export function utcNow(): Date {
  return new Date();
}

export function toUtc(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${String(value)}`);
  }
  return date;
}

export function isoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  return toUtc(value).toISOString();
}
