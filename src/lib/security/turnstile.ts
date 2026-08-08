/**
 * Server-side verification of a Cloudflare Turnstile token.
 *
 * The widget in the browser proves nothing on its own — a script can post
 * straight to the server action. The token only counts once Cloudflare has
 * confirmed it here, and each token is single-use.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5_000;

export type TurnstileResult = 'pass' | 'fail' | 'not-configured';

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Without a secret there is nothing to verify against. The caller decides
  // what to do; the other checks stay in force either way.
  if (!secret) return 'not-configured';

  if (!token) return 'fail';

  const body = new URLSearchParams({ secret, response: token });
  // Cloudflare ignores an unknown address, so only send a real one.
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error('Turnstile verification HTTP error:', response.status);
      return 'fail';
    }

    const result = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!result.success) {
      console.warn('Turnstile rejected a token:', result['error-codes']);
      return 'fail';
    }

    return 'pass';
  } catch (error) {
    // A network problem or timeout must not become an open door.
    console.error('Turnstile verification failed:', error);
    return 'fail';
  }
}
