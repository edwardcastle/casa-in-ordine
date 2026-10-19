import { describe, expect, it } from 'vitest';
import { formatAddedDate, formatFileSize, formatVisitDate, isHttpUrl } from '@/lib/area/format';

describe('formatVisitDate', () => {
  it('writes the stored day in the page language, whatever the server time zone', () => {
    expect(formatVisitDate('2026-11-03', 'en')).toBe('November 3, 2026');
    expect(formatVisitDate('2026-11-03', 'it')).toBe('3 novembre 2026');
    expect(formatVisitDate('2026-01-01', 'es')).toBe('1 de enero de 2026');
  });
});

describe('formatAddedDate', () => {
  it('uses the calendar of Rome, not of the server', () => {
    // 23:30 UTC on the 2nd is already the 3rd in Rome.
    expect(formatAddedDate(new Date('2026-11-02T23:30:00Z'), 'en')).toBe('November 3, 2026');
  });
});

describe('formatFileSize', () => {
  it('shows KB below a megabyte and MB above, with one decimal', () => {
    expect(formatFileSize(1234)).toBe('1.2 KB');
    expect(formatFileSize(0)).toBe('0.0 KB');
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(3.45 * 1024 * 1024)).toBe('3.5 MB');
  });
});

describe('isHttpUrl', () => {
  it('accepts http and https only', () => {
    expect(isHttpUrl('https://example.com/a')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('HTTPS://example.com')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,hi')).toBe(false);
    expect(isHttpUrl('example.com')).toBe(false);
    expect(isHttpUrl('//example.com')).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });
});
