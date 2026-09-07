import { addDays, fromLocal, offsetMinutesAt, parseLocalDate, toLocal, weekdayOf } from './melbourne-time.js';

describe('Melbourne time conversion', () => {
  it('reports AEDT in January and AEST in July', () => {
    expect(offsetMinutesAt(new Date('2026-01-10T00:00:00Z'))).toBe(660);
    expect(offsetMinutesAt(new Date('2026-07-10T00:00:00Z'))).toBe(600);
  });

  it('round-trips wall-clock times outside transitions', () => {
    const instant = fromLocal({ year: 2026, month: 3, day: 2 }, 9 * 60 + 30);
    expect(instant.toISOString()).toBe('2026-03-01T22:30:00.000Z');
    expect(toLocal(instant)).toMatchObject({ year: 2026, month: 3, day: 2, hour: 9, minute: 30, weekday: 1, minuteOfDay: 570 });
  });

  it('shifts a spring-forward gap time forward (2026-10-04 02:00 → 03:00 AEDT)', () => {
    // 2026-10-04 02:00 AEST does not exist; clocks jump to 03:00 AEDT (= 16:00Z on 2026-10-03).
    const instant = fromLocal({ year: 2026, month: 10, day: 4 }, 2 * 60 + 30);
    expect(instant.toISOString()).toBe('2026-10-03T16:30:00.000Z');
    expect(toLocal(instant)).toMatchObject({ hour: 3, minute: 30 });
  });

  it('resolves an autumn overlap time to its first occurrence (2026-04-05 02:30 AEDT)', () => {
    // 03:00 AEDT (16:00Z) becomes 02:00 AEST, so 02:30 occurs twice; the first is 15:30Z.
    const instant = fromLocal({ year: 2026, month: 4, day: 5 }, 2 * 60 + 30);
    expect(instant.toISOString()).toBe('2026-04-04T15:30:00.000Z');
    expect(offsetMinutesAt(instant)).toBe(660);
  });

  it('supports next-day minute offsets and calendar helpers', () => {
    expect(fromLocal({ year: 2026, month: 6, day: 30 }, 1440 + 60).toISOString()).toBe('2026-06-30T15:00:00.000Z');
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(weekdayOf({ year: 2026, month: 9, day: 6 })).toBe(7);
    expect(parseLocalDate('2026-02-29')).toBeNull();
    expect(parseLocalDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseLocalDate('2026-13-01')).toBeNull();
  });
});
