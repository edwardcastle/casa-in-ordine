import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';
import {
  confirmClientSignIn,
  requestClientSignIn,
  signOutClient,
  type SignInState,
} from '@/actions/area';
import ConfirmSignInPage, { generateMetadata } from '@/app/[locale]/area/accedi/continua/page';
import { GET as openLink } from '@/app/[locale]/area/accedi/conferma/route';
import { consumeToken } from '@/lib/reviews/tokens';
import { sendEmail } from '@/lib/mail';
import { endClientSession, startClientSession } from '@/lib/area/session';
import { verifyTurnstile } from '@/lib/security/turnstile';

vi.mock('@/lib/mail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mail')>();
  return { ...actual, sendEmail: vi.fn(async () => true) };
});

vi.mock('@/lib/area/session', () => ({
  startClientSession: vi.fn(async () => {}),
  endClientSession: vi.fn(async () => {}),
}));

// `after()` only works inside a request. Here it starts the work at once and
// keeps the promise, so a test can wait for what the response left behind.
const deferred: Promise<unknown>[] = [];
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (work: () => Promise<unknown>) => void deferred.push(work()) };
});

// The real `redirect` throws to unwind the request; this one says where to.
class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect to ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
  notFound: () => {
    throw new Error('not found');
  },
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: () => {},
}));

vi.mock('@/lib/security/turnstile', () => ({
  verifyTurnstile: vi.fn(async () => 'not-configured'),
}));

// Each test comes from its own address, so the in-memory rate limiter (which
// outlives a test) does not leak one test's requests into the next.
let ip = 0;
// The browser's cookie jar: what the link route set and the confirm action reads.
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': `10.0.0.${ip}` }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    delete: (options: string | { name: string }) =>
      void jar.delete(typeof options === 'string' ? options : options.name),
  }),
}));

const IDLE: SignInState = { status: 'idle' };

/** Runs the sign-in action and waits for the work it deferred until after the response. */
async function requestLink(email: string, extra: Record<string, string> = {}) {
  const state = await requestClientSignIn(IDLE, form(email, extra));
  await Promise.all(deferred.splice(0));
  return state;
}

/** Where an action sent the browser. */
async function redirectedTo(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (error) {
    if (error instanceof Redirect) return error.url;
    throw error;
  }
  throw new Error('The action did not redirect.');
}

/** The browser opens the emailed link: what the route answers, and its cookie lands in the jar. */
async function openEmailedLink(token: string, locale = 'it', next?: string) {
  const query = `token=${token}${next === undefined ? '' : `&next=${encodeURIComponent(next)}`}`;
  const response = await openLink(
    new Request(`http://localhost/${locale}/area/accedi/conferma?${query}`),
    { params: Promise.resolve({ locale }) },
  );
  for (const name of ['cio_signin_token', 'cio_signin_next']) {
    const cookie = response.cookies.get(name);
    if (cookie) jar.set(cookie.name, cookie.value);
  }
  return response;
}

/** The click on the confirm page's button, after the link was opened. */
function confirmForm(token: string, locale?: string, next?: string) {
  jar.set('cio_signin_token', token);
  if (next !== undefined) jar.set('cio_signin_next', next);
  const data = new FormData();
  if (locale !== undefined) data.set('locale', locale);
  return data;
}

function form(email: string, extra: Record<string, string> = {}) {
  const data = new FormData();
  data.set('email', email);
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

async function insertClient(overrides: { active?: boolean; lang?: string; email?: string } = {}) {
  const [row] = await testDb()<{ id: string }[]>`
    INSERT INTO clients (email, name, lang, active)
    VALUES (${overrides.email ?? 'anna@example.com'}, 'Anna', ${overrides.lang ?? 'it'},
            ${overrides.active ?? true})
    RETURNING id`;
  return row.id;
}

/** The token in the link of the most recent email. */
function lastToken(): string {
  const calls = vi.mocked(sendEmail).mock.calls;
  const html = calls[calls.length - 1][0].html;
  const match = html.match(/conferma\?token=([\w-]+)/);
  if (!match) throw new Error('No sign-in link in the email.');
  return match[1];
}

describe.skipIf(!hasTestDb())('client sign-in by emailed link', () => {
  beforeEach(async () => {
    process.env.CLIENT_SESSION_SECRET = 's'.repeat(32);
    delete process.env.TURNSTILE_SECRET_KEY;
    ip += 1;
    vi.clearAllMocks();
    jar.clear();
    // Unknown addresses are logged on purpose; keep that out of the test output.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(verifyTurnstile).mockResolvedValue('not-configured');
    await resetAreaTables();
  });

  afterEach(() => vi.restoreAllMocks());

  afterAll(closeTestDb);

  it('known active client: status sent and one email to that address', async () => {
    await insertClient();

    const state = await requestLink('anna@example.com');

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toEqual([{ email: 'anna@example.com' }]);
  });

  it('unknown email: status sent and no email', async () => {
    const state = await requestLink('nobody@example.com');

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('deactivated client: status sent and no email', async () => {
    await insertClient({ active: false });

    const state = await requestLink('anna@example.com');

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('email is matched case-insensitively and trimmed', async () => {
    await insertClient();

    const state = await requestLink('  Anna@Example.COM ');

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toEqual([{ email: 'anna@example.com' }]);
  });

  it('links to the confirm route in the language the client uses', async () => {
    await insertClient({ lang: 'es' });

    await requestLink('anna@example.com');

    const { html } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(html).toMatch(/\/es\/area\/accedi\/conferma\?token=/);
  });

  it('consuming the same token twice: second returns null', async () => {
    const id = await insertClient();
    await requestLink('anna@example.com');
    const token = lastToken();

    expect(await consumeToken('client_signin', token)).toBe(id);
    expect(await consumeToken('client_signin', token)).toBeNull();
  });

  it('a valid link starts the session and lands in the area', async () => {
    const id = await insertClient({ lang: 'en' });
    await requestLink('anna@example.com');

    const to = await redirectedTo(confirmClientSignIn(confirmForm(lastToken(), 'en')));

    expect(startClientSession).toHaveBeenCalledWith(id);
    expect(to).toBe('/en/area');
  });

  it('token for a client deactivated after issue: confirming does not start a session', async () => {
    const id = await insertClient();
    await requestLink('anna@example.com');
    await testDb()`UPDATE clients SET active = false WHERE id = ${id}`;

    const to = await redirectedTo(confirmClientSignIn(confirmForm(lastToken(), 'it')));

    expect(startClientSession).not.toHaveBeenCalled();
    expect(to).toBe('/it/area/accedi?error=link');
  });

  it('a sign-in token cannot be replayed once spent', async () => {
    await insertClient();
    await requestLink('anna@example.com');
    const token = lastToken();

    await redirectedTo(confirmClientSignIn(confirmForm(token, 'it')));
    vi.mocked(startClientSession).mockClear();
    const to = await redirectedTo(confirmClientSignIn(confirmForm(token, 'it')));

    expect(startClientSession).not.toHaveBeenCalled();
    expect(to).toBe('/it/area/accedi?error=link');
  });

  it('an unrecognised or missing locale falls back to Italian', async () => {
    expect(await redirectedTo(confirmClientSignIn(confirmForm('nope', 'xx')))).toBe(
      '/it/area/accedi?error=link',
    );
    expect(await redirectedTo(confirmClientSignIn(confirmForm('nope')))).toBe(
      '/it/area/accedi?error=link',
    );
    expect(await redirectedTo(signOutClient(confirmForm('', '../evil')))).toBe('/it');
  });

  it('opening the emailed link stores the token in a cookie and redirects without spending it', async () => {
    const id = await insertClient();
    await requestLink('anna@example.com');
    const token = lastToken();

    // What a scanner does: fetch the link again and again.
    const first = await openEmailedLink(token, 'en');
    await openEmailedLink(token, 'en');

    expect(first.status).toBe(303);
    // No query string, so nothing for page analytics to record.
    expect(first.headers.get('location')).toBe('/en/area/accedi/continua');
    expect(first.headers.get('cache-control')).toBe('private, no-store');
    const cookie = first.cookies.get('cio_signin_token');
    expect(cookie).toMatchObject({ value: token, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 1800 });
    expect(startClientSession).not.toHaveBeenCalled();
    const rows = await testDb()`SELECT 1 FROM auth_tokens WHERE purpose = 'client_signin'`;
    expect(rows).toHaveLength(1);
    expect(await consumeToken('client_signin', token)).toBe(id);
  });

  it('the cookie is secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const res = await openEmailedLink('a'.repeat(43));
      expect(res.cookies.get('cio_signin_token')?.secure).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('a link without a usable token goes back to sign-in and sets no cookie', async () => {
    for (const token of ['', 'short', 'x'.repeat(500), 'a b'.padEnd(30, 'c')]) {
      const res = await openEmailedLink(encodeURIComponent(token));
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/it/area/accedi?error=link');
      expect(res.cookies.get('cio_signin_token')).toBeUndefined();
    }
    const res = await openLink(new Request('http://localhost/xx/area/accedi/conferma?token=' + 'a'.repeat(43)), {
      params: Promise.resolve({ locale: 'xx' }),
    });
    expect(res.status).toBe(404);
  });

  it('the confirm page leaves the token unspent and shows it nowhere', async () => {
    const id = await insertClient();
    await requestLink('anna@example.com');
    const token = lastToken();
    await openEmailedLink(token);

    const page = await ConfirmSignInPage({ params: Promise.resolve({ locale: 'it' }) });
    await ConfirmSignInPage({ params: Promise.resolve({ locale: 'it' }) });

    expect(JSON.stringify(page)).not.toContain(token);
    const rows = await testDb()`SELECT 1 FROM auth_tokens WHERE purpose = 'client_signin'`;
    expect(rows).toHaveLength(1);
    expect(startClientSession).not.toHaveBeenCalled();
    expect(await consumeToken('client_signin', token)).toBe(id);
  });

  it('the confirm action spends the token from the cookie and clears it', async () => {
    const id = await insertClient();
    await requestLink('anna@example.com');
    await openEmailedLink(lastToken());

    // Whatever the form says, only the cookie counts.
    const data = new FormData();
    data.set('locale', 'it');
    data.set('token', 'forged');
    const to = await redirectedTo(confirmClientSignIn(data));

    expect(to).toBe('/it/area');
    expect(startClientSession).toHaveBeenCalledWith(id);
    expect(jar.has('cio_signin_token')).toBe(false);
  });

  it('confirming without the cookie fails and starts no session', async () => {
    await insertClient();
    await requestLink('anna@example.com');
    const data = new FormData();
    data.set('locale', 'it');
    data.set('token', lastToken());

    expect(await redirectedTo(confirmClientSignIn(data))).toBe('/it/area/accedi?error=link');
    expect(startClientSession).not.toHaveBeenCalled();
  });

  describe('returning to the page the client asked for', () => {
    const PROJECT = '/en/area/progetti/3f1c2a9e-7b4d-4c6e-9a10-5d2b8e7f6a41';

    it('the sign-in form passes a safe next path into the emailed link', async () => {
      await insertClient({ lang: 'en' });

      await requestLink('anna@example.com', { next: PROJECT });

      const { html } = vi.mocked(sendEmail).mock.calls[0][0];
      expect(html).toContain(`conferma?token=${lastToken()}&next=${encodeURIComponent(PROJECT)}`);
    });

    it('drops a next path that is not inside the private area', async () => {
      await insertClient();

      for (const next of ['//evil.com', 'https://x', '/it/area/../../x', '/it/admin']) {
        vi.mocked(sendEmail).mockClear();
        await requestLink('anna@example.com', { next });
        const { html } = vi.mocked(sendEmail).mock.calls[0][0];
        expect(html, next).not.toContain('next=');
      }
    });

    it('opening the link keeps next in a cookie, not in the redirect URL', async () => {
      const res = await openEmailedLink('a'.repeat(43), 'en', PROJECT);

      expect(res.headers.get('location')).toBe('/en/area/accedi/continua');
      expect(res.cookies.get('cio_signin_next')).toMatchObject({
        value: PROJECT,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 1800,
      });
    });

    it('opening the link with an unsafe next sets no next cookie', async () => {
      const res = await openEmailedLink('a'.repeat(43), 'it', '//evil.com');

      expect(res.status).toBe(303);
      expect(res.cookies.get('cio_signin_token')).toBeDefined();
      expect(res.cookies.get('cio_signin_next')).toBeUndefined();
    });

    it('confirming lands on the requested page and clears both cookies', async () => {
      await insertClient({ lang: 'en' });
      await requestLink('anna@example.com', { next: PROJECT });

      const to = await redirectedTo(confirmClientSignIn(confirmForm(lastToken(), 'en', PROJECT)));

      expect(to).toBe(PROJECT);
      expect(jar.has('cio_signin_token')).toBe(false);
      expect(jar.has('cio_signin_next')).toBe(false);
    });

    it('a tampered next cookie is ignored on confirm', async () => {
      await insertClient();
      await requestLink('anna@example.com');

      const to = await redirectedTo(confirmClientSignIn(confirmForm(lastToken(), 'it', '//evil.com')));

      expect(to).toBe('/it/area');
    });

    it('a failed confirm does not send the client to next', async () => {
      const to = await redirectedTo(confirmClientSignIn(confirmForm('nope', 'it', PROJECT)));

      expect(to).toBe('/it/area/accedi?error=link');
    });
  });

  it('the confirm page is not indexable and sends a missing cookie back to sign-in', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'it' }) });
    expect(meta.robots).toMatchObject({ index: false, follow: false });

    const to = await redirectedTo(ConfirmSignInPage({ params: Promise.resolve({ locale: 'it' }) }));
    expect(to).toBe('/it/area/accedi?error=link');
  });

  it('signing out ends the session and goes to the home page of that locale', async () => {
    const to = await redirectedTo(signOutClient(confirmForm('', 'es')));

    expect(endClientSession).toHaveBeenCalledTimes(1);
    expect(to).toBe('/es');
  });

  it('the response does not wait for the lookup or the email', async () => {
    await insertClient();
    const gate = Promise.withResolvers<boolean>();
    vi.mocked(sendEmail).mockReturnValueOnce(gate.promise);

    const state = await requestClientSignIn(IDLE, form('anna@example.com'));

    expect(state).toEqual({ status: 'sent' });
    gate.resolve(true);
    await Promise.all(deferred.splice(0));
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('a malformed address is invalid and sends nothing', async () => {
    expect(await requestLink('not-an-email')).toEqual({ status: 'invalid' });
    expect(await requestLink('')).toEqual({ status: 'invalid' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('a failed captcha is invalid and sends nothing', async () => {
    await insertClient();
    vi.mocked(verifyTurnstile).mockResolvedValue('fail');

    const state = await requestLink('anna@example.com');

    expect(state).toEqual({ status: 'invalid' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('the sixth request from one address in the window is limited', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await requestLink('nobody@example.com')).toEqual({
        status: 'sent',
      });
    }

    expect(await requestLink('nobody@example.com')).toEqual({
      status: 'limited',
    });
  });

  it('without a session secret it says unavailable instead of pretending', async () => {
    await insertClient();
    delete process.env.CLIENT_SESSION_SECRET;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const state = await requestLink('anna@example.com');

    expect(state).toEqual({ status: 'unavailable' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
