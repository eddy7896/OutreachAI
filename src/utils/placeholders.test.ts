import { describe, expect, it } from 'vitest';
import { PLACEHOLDERS, resolvePlaceholders } from './placeholders';

const lead = {
  firstName: 'Dana',
  lastName: 'Okafor',
  email: 'dana@northwind.example',
  company: 'Northwind Freight',
  jobTitle: 'VP Operations',
  industry: 'Transportation & Logistics',
  targetProduct: 'RouteIQ',
  phone: '+1 555 0100',
};

describe('resolvePlaceholders', () => {
  it('resolves every documented placeholder', () => {
    const text = PLACEHOLDERS.map((p) => p.key).join('|');
    expect(resolvePlaceholders(text, lead)).toBe(
      'Dana|Okafor|Dana Okafor|dana@northwind.example|Northwind Freight|VP Operations|Transportation & Logistics|RouteIQ|+1 555 0100',
    );
  });

  it('replaces repeated placeholders', () => {
    expect(resolvePlaceholders('{{first_name}} and {{first_name}}', lead)).toBe('Dana and Dana');
  });

  it('uses empty strings for missing lead fields', () => {
    expect(resolvePlaceholders('Hi {{first_name}} at {{company}}', { firstName: 'Sam' })).toBe('Hi Sam at ');
    expect(resolvePlaceholders('{{full_name}}', { lastName: 'Reyes' })).toBe('Reyes');
  });

  it('returns the text unchanged without a lead', () => {
    expect(resolvePlaceholders('Hi {{first_name}}', undefined)).toBe('Hi {{first_name}}');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(resolvePlaceholders('{{unknown}}', lead)).toBe('{{unknown}}');
  });

  // Fixed in Phase 3 (PR 3.3): AI-generated templates use camelCase placeholders.
  it.todo('resolves legacy camelCase placeholders such as {{firstName}}');
});
