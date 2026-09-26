import { describe, it, expect, vi, beforeEach } from 'vitest';
import { replayOfflineAction } from '../../services/api';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem('auth_token', 't');
});

const ok = () => ({ ok: true, status: 200, json: async () => ({}), headers: new Headers() });

describe('replayOfflineAction', () => {
  it('sends a queued create as a POST with its body', async () => {
    fetchMock.mockResolvedValue(ok());
    expect(await replayOfflineAction({ type: 'create', endpoint: '/matches', data: { id: 'm1' } })).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/matches');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ id: 'm1' }) });
  });

  it('reports a failure instead of pretending success — the queue keeps the action', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'x' }), headers: new Headers() });
    expect(await replayOfflineAction({ type: 'update', endpoint: '/players/p1', data: {} })).toBe(false);
  });

  it('a network error is a failure too', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await replayOfflineAction({ type: 'delete', endpoint: '/players/p1' })).toBe(false);
  });
});
