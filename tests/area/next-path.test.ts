import { describe, expect, it } from 'vitest';
import { safeNextPath, signInPath } from '@/lib/area/next-path';

const ID = '3f1c2a9e-7b4d-4c6e-9a10-5d2b8e7f6a41';

describe('safeNextPath', () => {
  it('accepts pages inside the private area', () => {
    expect(safeNextPath(`/it/area/progetti/${ID}`)).toBe(`/it/area/progetti/${ID}`);
    expect(safeNextPath('/en/area/consigli')).toBe('/en/area/consigli');
    expect(safeNextPath('/es/area')).toBe('/es/area');
  });

  it('rejects other origins and protocol-relative URLs', () => {
    for (const value of [
      '//evil.com',
      '//evil.com/it/area/x',
      '/\\evil.com',
      '/it/area\\..\\x',
      'https://x',
      'https://casainordine.com/it/area/x',
      'javascript:alert(1)',
      'it/area/x',
      '',
    ]) {
      expect(safeNextPath(value), value).toBeNull();
    }
  });

  it('rejects paths that leave the area', () => {
    for (const value of [
      '/it/area/../../x',
      '/it/area/..',
      '/it/area/./x',
      '/it/area/%2e%2e/x',
      '/it/areas/x',
      '/it/area//x',
      '/fr/area/x',
      '/it/admin',
      '/it/area/x/',
      '/it/area/x?y=1',
      '/it/area/x#y',
      '/it/area/x y',
      '/it/area/x\nSet-Cookie: a=b',
    ]) {
      expect(safeNextPath(value), value).toBeNull();
    }
  });

  it('rejects anything but a string, and anything over 200 characters', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(42)).toBeNull();
    expect(safeNextPath(['/it/area'])).toBeNull();

    const edge = `/it/area/${'a'.repeat(191)}`;
    expect(edge).toHaveLength(200);
    expect(safeNextPath(edge)).toBe(edge);
    expect(safeNextPath(`${edge}a`)).toBeNull();
  });
});

describe('signInPath', () => {
  it('adds the encoded next path only when it is safe', () => {
    expect(signInPath('it')).toBe('/it/area/accedi');
    expect(signInPath('en', '//evil.com')).toBe('/en/area/accedi');
    expect(signInPath('it', `/it/area/progetti/${ID}`)).toBe(
      `/it/area/accedi?next=%2Fit%2Farea%2Fprogetti%2F${ID}`,
    );
  });
});
