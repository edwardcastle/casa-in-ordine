import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';
import { requestClientSignIn, type SignInState } from '@/actions/area';
import { consumeToken } from '@/lib/reviews/tokens';
import { GET as confirm } from '@/app/[locale]/area/accedi/conferma/route';
import { sendEmail } from '@/lib/mail';
import { startClientSession } from '@/lib/area/session';
import { verifyTurnstile } from '@/lib/security/turnstile';

vi.mock('@/lib/mail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mail')>();
  return { ...actual, sendEmail: vi.fn(async () => true) };
});

vi.mock('@/lib/area/session', () => ({ startClientSession: vi.fn(async () => {}) }));

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

function confirmRequest(token: string, locale = 'it') {
  return confirm(
    new NextRequest(`http://localhost:3000/${locale}/area/accedi/conferma?token=${token}`),
    { params: Promise.resolve({ locale }) },
  );
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

    const state = await requestClientSignIn(IDLE, form('anna@example.com'));

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toEqual([{ email: 'anna@example.com' }]);
  });

  it('unknown email: status sent and no email', async () => {
    const state = await requestClientSignIn(IDLE, form('nobody@example.com'));

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('deactivated client: status sent and no email', async () => {
    await insertClient({ active: false });

    const state = await requestClientSignIn(IDLE, form('anna@example.com'));

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('email is matched case-insensitively and trimmed', async () => {
    await insertClient();

    const state = await requestClientSignIn(IDLE, form('  Anna@Example.COM '));

    expect(state).toEqual({ status: 'sent' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toEqual([{ email: 'anna@example.com' }]);
  });

  it('links to the confirm route in the language the client uses', async () => {
    await insertClient({ lang: 'es' });

    await requestClientSignIn(IDLE, form('anna@example.com'));

    const { html } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(html).toMatch(/\/es\/area\/accedi\/conferma\?token=/);
  });

  it('consuming the same token twice: second returns null', async () => {
    const id = await insertClient();
    await requestClientSignIn(IDLE, form('anna@example.com'));
    const token = lastToken();

    expect(await consumeToken('client_signin', token)).toBe(id);
    expect(await consumeToken('client_signin', token)).toBeNull();
  });

  it('a valid link starts the session and lands in the area', async () => {
    const id = await insertClient({ lang: 'en' });
    await requestClientSignIn(IDLE, form('anna@example.com'));

    const response = await confirmRequest(lastToken(), 'en');

    expect(startClientSession).toHaveBeenCalledWith(id);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/en/area');
  });

  it('token for a client deactivated after issue: conferma does not start a session', async () => {
    const id = await insertClient();
    await requestClientSignIn(IDLE, form('anna@example.com'));
    await testDb()`UPDATE clients SET active = false WHERE id = ${id}`;

    const response = await confirmRequest(lastToken());

    expect(startClientSession).not.toHaveBeenCalled();
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/it/area/accedi');
    expect(location.searchParams.get('error')).toBe('link');
  });

  it('a sign-in token cannot be replayed once spent', async () => {
    await insertClient();
    await requestClientSignIn(IDLE, form('anna@example.com'));
    const token = lastToken();

    await confirmRequest(token);
    vi.mocked(startClientSession).mockClear();
    const response = await confirmRequest(token);

    expect(startClientSession).not.toHaveBeenCalled();
    expect(new URL(response.headers.get('location')!).searchParams.get('error')).toBe('link');
  });

  it('an unrecognised locale falls back to Italian', async () => {
    const response = await confirmRequest('nope', 'xx');

    expect(new URL(response.headers.get('location')!).pathname).toBe('/it/area/accedi');
  });

  it('a malformed address is invalid and sends nothing', async () => {
    expect(await requestClientSignIn(IDLE, form('not-an-email'))).toEqual({ status: 'invalid' });
    expect(await requestClientSignIn(IDLE, form(''))).toEqual({ status: 'invalid' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('a failed captcha is invalid and sends nothing', async () => {
    await insertClient();
    vi.mocked(verifyTurnstile).mockResolvedValue('fail');

    const state = await requestClientSignIn(IDLE, form('anna@example.com'));

    expect(state).toEqual({ status: 'invalid' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('the sixth request from one address in the window is limited', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await requestClientSignIn(IDLE, form('nobody@example.com'))).toEqual({
        status: 'sent',
      });
    }

    expect(await requestClientSignIn(IDLE, form('nobody@example.com'))).toEqual({
      status: 'limited',
    });
  });

  it('without a session secret it says unavailable instead of pretending', async () => {
    await insertClient();
    delete process.env.CLIENT_SESSION_SECRET;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const state = await requestClientSignIn(IDLE, form('anna@example.com'));

    expect(state).toEqual({ status: 'unavailable' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
