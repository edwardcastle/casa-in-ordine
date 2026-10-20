import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, hasTestDb, resetAreaTables, testDb } from '../helpers/db';

vi.mock('@/lib/security/guard', () => ({ guardSubmission: vi.fn(async () => ({ ok: true })) }));

import { submitQuoteRequest } from '@/actions/contact';
import {
  convertQuoteToClient,
  countQuotesByStatus,
  getQuoteRequest,
  listQuoteRequests,
  setQuoteStatus,
  storeQuoteRequest,
  type QuoteInput,
} from '@/lib/quotes/queries';

const request = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  name: 'Giulia Rossi',
  email: 'Giulia@Example.test',
  phone: '333 1234567',
  lang: 'en',
  zones: [
    { id: 'armadio', zone: 'Closets', accumulation: 'Medium', subtotal: 120, answers: [{ question: 'Type?', answer: 'Walk-in' }] },
    { id: 'cucina', zone: 'Kitchen', accumulation: 'Low', subtotal: 80, answers: [] },
  ],
  subtotal: 200,
  urgency: 0,
  total: 200,
  timing: 'Within a month',
  notes: 'Please call after 6pm',
  ...over,
});

describe.skipIf(!hasTestDb())('quote requests', () => {
  beforeEach(async () => {
    testDb();
    await resetAreaTables();
  });
  afterAll(closeTestDb);

  it('stores a request with lowercased email and Italian room names', async () => {
    const id = await storeQuoteRequest(request());
    const quote = await getQuoteRequest(id);
    expect(quote).toMatchObject({
      name: 'Giulia Rossi',
      email: 'giulia@example.test',
      lang: 'en',
      total: 200,
      status: 'new',
      clientId: null,
      emailedAt: null,
      zoneLabels: ['Armadi e cabine armadio', 'Cucina e dispensa'],
    });
  });

  it('drops unknown zone ids and caps what the browser sends', async () => {
    const id = await storeQuoteRequest(
      request({
        lang: 'de',
        zones: [{ id: 'attic', zone: 'x'.repeat(1000), accumulation: '', subtotal: 1, answers: Array(50).fill({ question: 'q', answer: 'a' }) }],
      }),
    );
    const quote = await getQuoteRequest(id);
    expect(quote?.lang).toBe('it');
    expect(quote?.zones[0].id).toBeUndefined();
    expect(quote?.zones[0].zone).toHaveLength(120);
    expect(quote?.zones[0].answers).toHaveLength(20);
  });

  it('lists newest first and filters by status', async () => {
    const first = await storeQuoteRequest(request({ name: 'Primo' }));
    await storeQuoteRequest(request({ name: 'Secondo' }));
    await setQuoteStatus(first, 'contacted');
    expect((await listQuoteRequests()).map((q) => q.name)).toEqual(['Secondo', 'Primo']);
    expect((await listQuoteRequests('contacted')).map((q) => q.name)).toEqual(['Primo']);
    expect(await countQuotesByStatus()).toEqual({ new: 1, contacted: 1, won: 0, lost: 0 });
  });

  it('rejects an unknown status or id', async () => {
    const id = await storeQuoteRequest(request());
    expect(await setQuoteStatus(id, 'maybe' as never)).toBe(false);
    expect(await setQuoteStatus('nope', 'won')).toBe(false);
    expect(await getQuoteRequest('nope')).toBeNull();
  });

  it('turns a request into a client with one project per room', async () => {
    const id = await storeQuoteRequest(request());
    const result = await convertQuoteToClient(id);
    expect(result?.created).toBe(true);

    const [client] = await testDb()`SELECT name, email, lang FROM clients WHERE id = ${result!.clientId}`;
    expect(client).toEqual({ name: 'Giulia Rossi', email: 'giulia@example.test', lang: 'en' });
    const projects = await testDb()`SELECT title, zone FROM client_projects WHERE client_id = ${result!.clientId} ORDER BY zone`;
    expect(projects).toEqual([
      { title: 'Armadi e cabine armadio', zone: 'armadio' },
      { title: 'Cucina e dispensa', zone: 'cucina' },
    ]);
    expect(await getQuoteRequest(id)).toMatchObject({ status: 'won', clientId: result!.clientId });
  });

  it('reuses an existing client with the same email and adds no projects', async () => {
    const [existing] = await testDb()`
      INSERT INTO clients (email, name, lang) VALUES ('giulia@example.test', 'Giulia', 'it') RETURNING id`;
    const id = await storeQuoteRequest(request());
    const result = await convertQuoteToClient(id);
    expect(result).toEqual({ clientId: existing.id, created: false });
    expect((await testDb()`SELECT count(*)::int AS n FROM client_projects`)[0].n).toBe(0);
  });

  it('converting twice returns the same client', async () => {
    const id = await storeQuoteRequest(request());
    const first = await convertQuoteToClient(id);
    const second = await convertQuoteToClient(id);
    expect(second).toEqual({ clientId: first!.clientId, created: false });
    expect((await testDb()`SELECT count(*)::int AS n FROM clients`)[0].n).toBe(1);
  });

  describe('submitQuoteRequest', () => {
    const fetchMock = vi.fn();
    beforeEach(() => {
      fetchMock.mockReset();
      vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('saves the request and records that the email went out', async () => {
      fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
      expect(await submitQuoteRequest({ ...request(), timing: 'Within a month' })).toEqual({ success: true });
      const [row] = await listQuoteRequests();
      expect(row.emailedAt).toBeInstanceOf(Date);
    });

    it('still succeeds when the email fails, because the request is saved', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockResolvedValue(new Response('down', { status: 500 }));
      expect(await submitQuoteRequest({ ...request(), timing: 'Within a month' })).toEqual({ success: true });
      const [row] = await listQuoteRequests();
      expect(row.emailedAt).toBeNull();
      error.mockRestore();
    });
  });
});
