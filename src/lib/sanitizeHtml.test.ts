// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it.each([
    ['<p>Hi</p><script>alert(1)</script>', '<p>Hi</p>'],
    ['<img src="x" onerror="alert(1)">', '<img src="x">'],
    ['<p onclick="steal()">Click</p>', '<p>Click</p>'],
    ['<svg><script>alert(1)</script></svg>', ''],
    ['<iframe src="https://evil.example"></iframe><p>ok</p>', '<p>ok</p>'],
    ['<style>body{display:none}</style><p>ok</p>', '<p>ok</p>'],
  ])('removes active content from %s', (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/i);
  });

  it('removes forms that could imitate a login prompt', () => {
    const out = sanitizeHtml('<form action="https://evil.example"><input name="password"><button>Sign in</button></form><p>Thanks</p>');
    expect(out).not.toMatch(/<form|<input|<button/);
    expect(out).toContain('<p>Thanks</p>');
  });

  it('keeps ordinary email formatting, images and inline styles', () => {
    const html = '<p style="color: red;"><strong>Hi</strong> <em>Dana</em><br><img src="https://cdn.example/logo.png" alt="logo"></p><ul><li>One</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('opens links in a new tab without leaking the opener', () => {
    const out = sanitizeHtml('<a href="https://easyio.tech">site</a>');
    expect(out).toContain('href="https://easyio.tech"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(null)).toBe('');
  });
});
