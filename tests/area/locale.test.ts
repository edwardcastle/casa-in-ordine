import { describe, expect, it } from 'vitest';
import { bestLocale } from '@/lib/area/locale';

describe('bestLocale', () => {
  it('falls back to Italian without a usable header', () => {
    expect(bestLocale(null)).toBe('it');
    expect(bestLocale('')).toBe('it');
    expect(bestLocale('fr-FR, de;q=0.8')).toBe('it');
    expect(bestLocale('*')).toBe('it');
  });

  it('honours q-values and primary subtags', () => {
    expect(bestLocale('en')).toBe('en');
    expect(bestLocale('en-GB,en;q=0.9,es;q=0.8')).toBe('en');
    expect(bestLocale('fr, es-MX;q=0.9, en;q=0.5')).toBe('es');
    expect(bestLocale('en;q=0.4, es;q=0.7')).toBe('es');
  });

  it('ignores q=0 and malformed weights', () => {
    expect(bestLocale('en;q=0, es;q=0.1')).toBe('es');
    expect(bestLocale('en;q=abc')).toBe('it');
  });
});
