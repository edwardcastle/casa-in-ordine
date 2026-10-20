import { describe, expect, it } from 'vitest';
import { signClientCookie, verifyClientCookie } from '@/lib/area/session';

const S = 'a'.repeat(32);
const now = 1_700_000_000_000;

describe('client session cookie', () => {
  it('round-trips a valid cookie', () => {
    expect(verifyClientCookie(signClientCookie('abc', now + 1000, S), S, now)).toBe('abc');
  });

  it('rejects an expired cookie', () => {
    expect(verifyClientCookie(signClientCookie('abc', now - 1, S), S, now)).toBeNull();
  });

  it('rejects a tampered client id', () => {
    const signed = signClientCookie('abc', now + 1000, S);
    expect(verifyClientCookie(signed.replace('abc', 'abd'), S, now)).toBeNull();
  });

  it('rejects a cookie signed with another secret', () => {
    const signed = signClientCookie('abc', now + 1000, 'b'.repeat(32));
    expect(verifyClientCookie(signed, S, now)).toBeNull();
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'abc', 'a|b']) {
      expect(verifyClientCookie(bad, S, now)).toBeNull();
    }
  });
});
