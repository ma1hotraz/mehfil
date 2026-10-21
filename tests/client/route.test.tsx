// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TAB_IDS, parseHash, routeHash, useRoute } from '../../src/client/lib/useRoute';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('hash routing', () => {
  it('parses every hash into a view and tab', () => {
    expect(parseHash('')).toEqual({ view: 'front', tab: 'overview' });
    expect(parseHash('#invitation')).toEqual({ view: 'intake', tab: 'overview' });
    for (const tab of TAB_IDS) {
      expect(parseHash(`#${tab}`)).toEqual({ view: 'plan', tab });
    }
    expect(parseHash('#nonsense')).toEqual({ view: 'front', tab: 'overview' });
  });

  it('round-trips routes to hashes', () => {
    expect(routeHash({ view: 'front', tab: 'overview' })).toBe('');
    expect(routeHash({ view: 'intake', tab: 'overview' })).toBe('#invitation');
    expect(routeHash({ view: 'plan', tab: 'ledger' })).toBe('#ledger');
  });
});

describe('useRoute', () => {
  it('starts from the current hash', () => {
    window.location.hash = '#timetable';
    const { result } = renderHook(() => useRoute());
    expect(result.current[0]).toEqual({ view: 'plan', tab: 'timetable' });
  });

  it('navigates by changing the hash, and back to the front page without a hash', () => {
    const { result } = renderHook(() => useRoute());
    act(() => {
      result.current[1]({ view: 'plan', tab: 'vendors' });
    });
    expect(window.location.hash).toBe('#vendors');
    expect(result.current[0].tab).toBe('vendors');
    act(() => {
      result.current[1]({ view: 'front', tab: 'overview' });
    });
    expect(window.location.hash).toBe('');
    expect(result.current[0].view).toBe('front');
  });

  it('follows the browser hash changing underneath it', () => {
    const { result } = renderHook(() => useRoute());
    act(() => {
      window.location.hash = '#ideas';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current[0]).toEqual({ view: 'plan', tab: 'ideas' });
  });
});
