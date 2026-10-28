import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateWithFallback = vi.fn();
vi.mock('@/lib/ai', () => ({ generateWithFallback }));
vi.mock('@/lib/firestore', () => ({ fetchOne: vi.fn() }));
vi.mock('@/lib/resend', () => ({ getResend: vi.fn() }));

const { generateEmail } = await import('./email');

const lead = { firstName: 'Dana', lastName: 'Okafor', company: 'Northwind', industry: 'Logistics' };
const template = { subject: 'Hi {{first_name}}', body: '<p>{{company}} + us</p>' };

beforeEach(() => {
  generateWithFallback.mockReset().mockResolvedValue({ subject: 'Polished', body: '<p>Polished body</p>' });
});

describe('generateEmail', () => {
  it('only fills placeholders when there is no product context (no AI call)', async () => {
    expect(await generateEmail({ lead, template })).toEqual({ subject: 'Hi Dana', body: '<p>Northwind + us</p>' });
    expect(generateWithFallback).not.toHaveBeenCalled();
  });

  it('asks the AI to polish the pre-filled template with product context', async () => {
    const result = await generateEmail({ lead, template, productContext: { name: 'RouteIQ', keyFeatures: ['Routing'] } });

    expect(result).toEqual({ subject: 'Polished', body: '<p>Polished body</p>' });
    const [prompt, isJson] = generateWithFallback.mock.calls[0];
    expect(isJson).toBe(true);
    expect(prompt).toContain('Product Name: RouteIQ');
    expect(prompt).toContain('Subject: Hi Dana');
  });

  it('throws when the AI returns no usable email', async () => {
    generateWithFallback.mockResolvedValue({ subject: 'Only a subject' });
    await expect(generateEmail({ lead, template, productContext: { name: 'RouteIQ' } })).rejects.toThrow(/without a subject or body/);
  });

  it('propagates AI provider failures', async () => {
    generateWithFallback.mockRejectedValue(new Error('all providers failed'));
    await expect(generateEmail({ lead, template, productContext: { name: 'RouteIQ' } })).rejects.toThrow('all providers failed');
  });
});
