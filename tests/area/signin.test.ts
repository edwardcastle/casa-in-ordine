import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';
import {
  confirmClientSignIn,
  requestClientSignIn,
  signOutClient,
  type SignInState,
} from '@/actions/area';
import ConfirmSignInPage, { generateMetadata } from '@/app/[locale]/area/accedi/conferma/page';
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
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': `10.0.0.${ip}` }),
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

function confirmForm(token: string, locale?: string) {
  const data = new FormData();
  data.set('token', token);
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

  it('opening the link page leaves the token unspent', async () => {
    const id = await insertClient();
    await requestLink('anna@example.com');
    const token = lastToken();

    await ConfirmSignInPage({
      params: Promise.resolve({ locale: 'it' }),
      searchParams: Promise.resolve({ token }),
    });
    // What a scanner does: fetch the page again and again.
    await ConfirmSignInPage({
      params: Promise.resolve({ locale: 'it' }),
      searchParams: Promise.resolve({ token }),
    });

    const rows = await testDb()`SELECT 1 FROM auth_tokens WHERE purpose = 'client_signin'`;
    expect(rows).toHaveLength(1);
    expect(startClientSession).not.toHaveBeenCalled();
    expect(await consumeToken('client_signin', token)).toBe(id);
  });

  it('the link page is not indexable and sends a missing token back to sign-in', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'it' }) });
    expect(meta.robots).toMatchObject({ index: false, follow: false });

    const to = await redirectedTo(
      ConfirmSignInPage({
        params: Promise.resolve({ locale: 'it' }),
        searchParams: Promise.resolve({}),
      }),
    );
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
