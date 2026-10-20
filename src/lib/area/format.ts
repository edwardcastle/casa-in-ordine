/**
 * Display helpers for the client area. Pure, so they are tested without Next.
 */

/** `2026-11-03` as a long date in the page's language ("3 novembre 2026"). */
export function formatVisitDate(isoDate: string, locale: string): string {
  // A bare date has no time zone. Read it as UTC and format it as UTC, so the
  // day the team wrote down is the day shown, wherever the server runs.
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** A moment (when a material was added) as a long date, on the calendar of Rome. */
export function formatAddedDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Rome' }).format(
    date,
  );
}

/** Bytes as KB below a megabyte and MB above, one decimal each ("1.2 KB", "3.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const HTTP_URL = /^https?:\/\//i;

/**
 * Whether a link material's text may become a clickable link.
 *
 * Staff type these in, so anything that is not plain http(s) (`javascript:`,
 * `data:`, a bare word) is shown as text instead of being made clickable.
 */
export function isHttpUrl(value: string | null): value is string {
  return value !== null && HTTP_URL.test(value.trim());
}
