const TUNISIA_TIMEZONE = "Africa/Tunis";

export function formatTunisiaDate(dateLike: string | Date): string {
  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);

  return new Intl.DateTimeFormat("fr-TN", {
    timeZone: TUNISIA_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function formatTunisiaTime(dateLike: string | Date): string {
  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);

  return new Intl.DateTimeFormat("fr-TN", {
    timeZone: TUNISIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatTunisiaDateTime(dateLike: string | Date): string {
  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);

  return new Intl.DateTimeFormat("fr-TN", {
    timeZone: TUNISIA_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatTunisiaMonthShort(dateLike: string | Date): string {
  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);

  return new Intl.DateTimeFormat("fr-TN", {
    timeZone: TUNISIA_TIMEZONE,
    month: "short",
  }).format(value);
}

export function formatTunisiaDay(dateLike: string | Date): number {
  const value = dateLike instanceof Date ? dateLike : new Date(dateLike);

  return new Intl.DateTimeFormat("fr-TN", {
    timeZone: TUNISIA_TIMEZONE,
    day: "numeric",
  }).format(value) as unknown as number;
}

export const TUNISIA_TIMEZONE_NAME = TUNISIA_TIMEZONE;
