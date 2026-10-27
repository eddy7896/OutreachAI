import { describe, expect, it } from 'vitest';
import { getNextValidSendTime } from './scheduling';

const WEEKDAYS_9_TO_5 = { startHour: 9, endHour: 17, days: [1, 2, 3, 4, 5] };
const NY = 'America/New_York';

describe('getNextValidSendTime', () => {
  it('moves a send before the window to the window start the same day', () => {
    // Tue 2026-10-27 08:00 in New York (EDT, UTC-4)
    const now = new Date('2026-10-27T12:00:00Z');
    expect(getNextValidSendTime(now, NY, WEEKDAYS_9_TO_5).toISOString()).toBe('2026-10-27T13:00:00.000Z');
  });

  it('sends immediately when inside the window', () => {
    // Tue 11:00 New York
    const now = new Date('2026-10-27T15:00:00Z');
    expect(getNextValidSendTime(now, NY, WEEKDAYS_9_TO_5).toISOString()).toBe(now.toISOString());
  });

  it('treats the end hour as exclusive and rolls to the next day', () => {
    // Tue 17:00 New York
    const now = new Date('2026-10-27T21:00:00Z');
    expect(getNextValidSendTime(now, NY, WEEKDAYS_9_TO_5).toISOString()).toBe('2026-10-28T13:00:00.000Z');
  });

  it('skips the weekend and handles the DST change', () => {
    // Fri 2026-10-30 19:00 EDT; US DST ends Sun 2026-11-01, so Monday 09:00 is EST (UTC-5)
    const now = new Date('2026-10-30T23:00:00Z');
    expect(getNextValidSendTime(now, NY, WEEKDAYS_9_TO_5).toISOString()).toBe('2026-11-02T14:00:00.000Z');
  });

  it('respects a timezone ahead of UTC', () => {
    // Mon 2026-10-26 23:30 UTC is Tue 08:30 in Asia/Kolkata (UTC+5:30)
    const now = new Date('2026-10-26T23:30:00Z');
    expect(getNextValidSendTime(now, 'Asia/Kolkata', WEEKDAYS_9_TO_5).toISOString()).toBe('2026-10-27T03:30:00.000Z');
  });

  it('falls back to now when no day is allowed (known limitation, see docs/SYSTEM_ANALYSIS.md)', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    expect(getNextValidSendTime(now, NY, { startHour: 9, endHour: 17, days: [] })).toBe(now);
  });
});
