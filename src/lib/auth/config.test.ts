import { describe, expect, it } from 'vitest';
import { allowedDomains, isAllowedEmail, isPublicPath, safeNextPath } from './config';

describe('allowedDomains', () => {
  it('parses a comma-separated list, trimming and lowercasing', () => {
    expect(allowedDomains(' EasyIO.tech, partner.com ,')).toEqual(['easyio.tech', 'partner.com']);
    expect(allowedDomains(undefined)).toEqual([]);
  });
});

describe('isAllowedEmail', () => {
  const domains = ['easyio.tech'];

  it.each(['faheem@easyio.tech', 'Someone.Else@EASYIO.TECH'])('accepts %s', (email) => {
    expect(isAllowedEmail(email, domains)).toBe(true);
  });

  it.each([
    'faheem@gmail.com',
    'attacker@evil-easyio.tech',
    'attacker@easyio.tech.evil.com',
    'attacker@sub.easyio.tech',
    'easyio.tech',
    '@easyio.tech',
    '',
    null,
    undefined,
  ])('rejects %s', (email) => {
    expect(isAllowedEmail(email, domains)).toBe(false);
  });

  it('rejects everyone when no domain is configured', () => {
    expect(isAllowedEmail('faheem@easyio.tech', [])).toBe(false);
  });
});

describe('isPublicPath', () => {
  it.each(['/login', '/api/auth/session', '/api/webhook/inbound', '/api/track', '/api/leads/import', '/api/cron/sequences', '/login/'])(
    '%s is public',
    (path) => expect(isPublicPath(path)).toBe(true),
  );

  it.each(['/', '/leads', '/loginx', '/api/send', '/api/generate', '/api/cron/process-sequences', '/api/cron/send-scheduled', '/api/auth/other'])(
    '%s requires a session',
    (path) => expect(isPublicPath(path)).toBe(false),
  );
});

describe('safeNextPath', () => {
  it.each([
    ['/leads', '/leads'],
    ['/campaigns?x=1', '/campaigns?x=1'],
    [null, '/'],
    ['', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/login?next=/x', '/'],
  ])('%s -> %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
