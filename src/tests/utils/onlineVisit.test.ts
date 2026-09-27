import { describe, it, expect, beforeEach } from 'vitest';
import { checkOnlineVisit, getOnlineClientSecret } from '../../utils/onlineVisit';

describe('checkOnlineVisit', () => {
  it('accepts ordinary visits', () => {
    expect(checkOnlineVisit(60, 501)).toEqual({ ok: true, checkout: false, bust: false });
    expect(checkOnlineVisit(0, 501)).toEqual({ ok: true, checkout: false, bust: false });
  });

  it('rejects totals three darts cannot make', () => {
    expect(checkOnlineVisit(181, 501)).toEqual({ ok: false, reason: 'range' });
    expect(checkOnlineVisit(179, 501)).toEqual({ ok: false, reason: 'impossible' });
    expect(checkOnlineVisit(-1, 501)).toEqual({ ok: false, reason: 'range' });
    expect(checkOnlineVisit(1.5, 501)).toEqual({ ok: false, reason: 'range' });
  });

  it('recognises a checkout, and rejects finishes that do not exist', () => {
    expect(checkOnlineVisit(121, 121)).toEqual({ ok: true, checkout: true, bust: false });
    expect(checkOnlineVisit(170, 170)).toEqual({ ok: true, checkout: true, bust: false });
    expect(checkOnlineVisit(169, 169)).toEqual({ ok: false, reason: 'impossible' });
    expect(checkOnlineVisit(168, 168)).toEqual({ ok: false, reason: 'no_finish' }); // bogey
    expect(checkOnlineVisit(171, 171)).toEqual({ ok: false, reason: 'no_finish' });
    expect(checkOnlineVisit(171, 171, false)).toEqual({ ok: true, checkout: true, bust: false });
  });

  it('marks busts as valid visits that score nothing', () => {
    expect(checkOnlineVisit(60, 40)).toEqual({ ok: true, checkout: false, bust: true });
    expect(checkOnlineVisit(39, 40)).toEqual({ ok: true, checkout: false, bust: true }); // leaves 1
    expect(checkOnlineVisit(39, 40, false)).toEqual({ ok: true, checkout: false, bust: false });
  });
});

describe('getOnlineClientSecret', () => {
  beforeEach(() => localStorage.clear());
  it('is stable across calls and passes the server check', () => {
    const a = getOnlineClientSecret();
    expect(getOnlineClientSecret()).toBe(a);
    expect(a).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });
});
