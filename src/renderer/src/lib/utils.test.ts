import { describe, it, expect } from 'vitest';
import { cn, toGithubWebUrl, basename, extname, formatBytes } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('dedupes tailwind classes with twMerge', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('toGithubWebUrl', () => {
  it('accepts owner/repo shorthand', () => {
    expect(toGithubWebUrl('facebook/react')).toBe('https://github.com/facebook/react');
  });
  it('passes through full URLs', () => {
    expect(toGithubWebUrl('https://example.com/x')).toBe('https://example.com/x');
  });
  it('returns null on invalid input', () => {
    expect(toGithubWebUrl('not a url')).toBeNull();
  });
});

describe('paths', () => {
  it('basename', () => {
    expect(basename('/a/b/c.md')).toBe('c.md');
    expect(basename('c.md')).toBe('c.md');
  });
  it('extname', () => {
    expect(extname('/a/b/c.md')).toBe('.md');
    expect(extname('/a/b/c')).toBe('');
  });
});

describe('formatBytes', () => {
  it('formats small bytes', () => {
    expect(formatBytes(100)).toBe('100 B');
  });
  it('formats KB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
});
