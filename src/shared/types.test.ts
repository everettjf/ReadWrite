import { describe, it, expect } from 'vitest';
import type { Tab, WebTab, PdfTab } from './types';
import { IPC } from './ipc-channels';

describe('shared types', () => {
  it('WebTab narrows on kind', () => {
    const t: Tab = {
      id: '1',
      kind: 'web',
      url: 'https://example.com',
      title: 'Example',
      createdAt: 0,
    };
    expect(t.kind).toBe('web');
    const w = t as WebTab;
    expect(w.url).toBe('https://example.com');
  });

  it('PdfTab distinguishes path', () => {
    const t: Tab = {
      id: '2',
      kind: 'pdf',
      path: '/tmp/a.pdf',
      title: 'a.pdf',
      createdAt: 0,
    };
    const p = t as PdfTab;
    expect(p.path).toBe('/tmp/a.pdf');
  });

  it('IPC channels are unique', () => {
    const vals = Object.values(IPC);
    expect(new Set(vals).size).toBe(vals.length);
  });
});
