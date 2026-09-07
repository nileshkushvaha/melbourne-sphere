import { closedWeek, evaluateHours, validateSchedule, validateWeeklyHours, type HoursSchedule } from './hours-rules.js';

const week = (overrides: Partial<HoursSchedule['weekly']>): HoursSchedule['weekly'] => ({ ...closedWeek(), ...overrides });
const scheduled = (weekly: HoursSchedule['weekly'], exceptions: HoursSchedule['exceptions'] = []): HoursSchedule => ({ mode: 'scheduled', weekly, exceptions });

describe('weekly hours validation', () => {
  it('accepts multiple intervals, open24 and closed days', () => {
    const { errors, minutes } = validateWeeklyHours(week({ monday: { state: 'intervals', intervals: [{ start: '09:00', end: '12:00', endNextDay: false }, { start: '13:00', end: '17:30', endNextDay: false }] }, tuesday: { state: 'open24' } }));
    expect(errors).toEqual({});
    expect(minutes.monday).toEqual([{ start: 540, end: 720 }, { start: 780, end: 1050 }]);
    expect(minutes.tuesday).toEqual([{ start: 0, end: 1440 }]);
    expect(minutes.wednesday).toEqual([]);
  });

  it('reports format, order, overlap and next-day flag problems with field paths', () => {
    const { errors } = validateWeeklyHours(
      week({
        monday: { state: 'intervals', intervals: [{ start: '9am', end: '17:00', endNextDay: false }] },
        tuesday: { state: 'intervals', intervals: [{ start: '17:00', end: '09:00', endNextDay: false }] },
        wednesday: { state: 'intervals', intervals: [{ start: '09:00', end: '12:00', endNextDay: false }, { start: '11:00', end: '14:00', endNextDay: false }] },
        thursday: { state: 'intervals', intervals: [{ start: '09:00', end: '17:00', endNextDay: true }] },
        friday: { state: 'intervals', intervals: [] },
      }),
    );
    expect(errors['weekly.monday.intervals.0.start']).toEqual(['Enter a time as HH:MM']);
    expect(errors['weekly.tuesday.intervals.0.end']?.[0]).toMatch(/closes next day/);
    expect(errors['weekly.wednesday.intervals.1.start']).toEqual(['Intervals must not overlap']);
    expect(errors['weekly.thursday.intervals.0.endNextDay']?.[0]).toMatch(/same day/);
    expect(errors['weekly.friday.intervals']?.[0]).toMatch(/at least one interval/);
  });

  it('rejects overnight spill into the next day and allows it when the next day opens later', () => {
    const overnight = { state: 'intervals' as const, intervals: [{ start: '18:00', end: '02:00', endNextDay: true }] };
    const early = { state: 'intervals' as const, intervals: [{ start: '01:00', end: '10:00', endNextDay: false }] };
    expect(validateWeeklyHours(week({ friday: overnight, saturday: early })).errors['weekly.friday.intervals.0.end']?.[0]).toMatch(/overlap saturday/);
    expect(validateWeeklyHours(week({ sunday: overnight, monday: { state: 'open24' } })).errors['weekly.sunday.intervals.0.end']).toBeDefined();
    expect(validateWeeklyHours(week({ friday: overnight, saturday: { state: 'intervals', intervals: [{ start: '02:00', end: '10:00', endNextDay: false }] } })).errors).toEqual({});
  });

  it('validates exceptions: dates, uniqueness, custom intervals, notes', () => {
    const { errors } = validateSchedule(
      scheduled(closedWeek(), [
        { date: '2026-12-25', kind: 'closed', note: 'Christmas Day' },
        { date: '2026-12-25', kind: 'open24' },
        { date: '2026-02-30', kind: 'closed' },
        { date: '2026-12-26', kind: 'custom', intervals: [] },
        { date: '2026-12-27', kind: 'custom', intervals: [{ start: '10:00', end: '14:00', endNextDay: false }], note: 'x'.repeat(121) },
      ]),
    );
    expect(errors['exceptions.1.date']).toEqual(['Only one exception per date']);
    expect(errors['exceptions.2.date']).toBeDefined();
    expect(errors['exceptions.3.intervals']).toBeDefined();
    expect(errors['exceptions.4.note']).toBeDefined();
  });
});

describe('evaluateHours (Australia/Melbourne)', () => {
  const cafe = scheduled(
    week({
      monday: { state: 'intervals', intervals: [{ start: '07:00', end: '15:00', endNextDay: false }] },
      thursday: { state: 'intervals', intervals: [{ start: '18:00', end: '02:00', endNextDay: true }] },
      friday: { state: 'intervals', intervals: [{ start: '07:00', end: '15:00', endNextDay: false }, { start: '18:00', end: '24:00', endNextDay: false }] },
      saturday: { state: 'open24' },
    }),
    [{ date: '2026-09-07', kind: 'closed', note: 'Staff training' }, { date: '2026-09-11', kind: 'custom', intervals: [{ start: '10:00', end: '12:00', endNextDay: false }] }],
  );

  it('is unknown when no schedule has been recorded', () => {
    expect(evaluateHours({ mode: 'unknown', weekly: closedWeek(), exceptions: [] }, new Date())).toEqual({ state: 'unknown', until: null, source: null });
  });

  it('reports open/closed with the next change on a normal day (AEST)', () => {
    // Monday 2026-09-14 10:00 AEST = 00:00Z
    expect(evaluateHours(cafe, new Date('2026-09-14T00:00:00Z'))).toEqual({ state: 'open', until: '2026-09-14T05:00:00.000Z', source: 'weekly' });
    // Monday 16:00 AEST → next opening Thursday 18:00 AEST (2026-09-17T08:00Z)
    expect(evaluateHours(cafe, new Date('2026-09-14T06:00:00Z'))).toEqual({ state: 'closed', until: '2026-09-17T08:00:00.000Z', source: 'weekly' });
  });

  it('honours overnight intervals after midnight and open-24 days', () => {
    // Friday 2026-09-18 01:00 AEST (= Thursday 15:00Z): still inside Thursday's 18:00–02:00
    expect(evaluateHours(cafe, new Date('2026-09-17T15:00:00Z'))).toMatchObject({ state: 'open', until: '2026-09-17T16:00:00.000Z' });
    // Friday 23:30 AEST: the 18:00–24:00 interval ends at midnight, then Saturday's open-24 starts (state stays open, boundary moves)
    expect(evaluateHours(cafe, new Date('2026-09-18T13:30:00Z'))).toMatchObject({ state: 'open', until: '2026-09-18T14:00:00.000Z' });
    // Saturday 12:00 AEST: open 24 hours, until Sunday 00:00 AEST (2026-09-19T14:00Z)
    expect(evaluateHours(cafe, new Date('2026-09-19T02:00:00Z'))).toEqual({ state: 'open', until: '2026-09-19T14:00:00.000Z', source: 'weekly' });
  });

  it('lets exceptions override the weekly rule', () => {
    // Monday 2026-09-07 10:00 AEST is a closed exception; next opening is Thursday 18:00 AEST (2026-09-10T08:00Z)
    expect(evaluateHours(cafe, new Date('2026-09-07T00:00:00Z'))).toEqual({ state: 'closed', until: '2026-09-10T08:00:00.000Z', source: 'exception' });
    expect(evaluateHours(cafe, new Date('2026-09-11T00:30:00Z'))).toEqual({ state: 'open', until: '2026-09-11T02:00:00.000Z', source: 'exception' });
  });

  it('keeps wall-clock semantics across the AEST→AEDT change (2026-10-04)', () => {
    const late = scheduled(week({ saturday: { state: 'intervals', intervals: [{ start: '22:00', end: '03:00', endNextDay: true }] } }));
    // Saturday 2026-10-03 22:00 AEST = 12:00Z; closes when the clock reads 03:00 AEDT on Sunday = 16:00Z (only 4 elapsed hours).
    const status = evaluateHours(late, new Date('2026-10-03T12:30:00Z'));
    expect(status).toEqual({ state: 'open', until: '2026-10-03T16:00:00.000Z', source: 'weekly' });
    // Sunday 2026-10-04 09:00 AEDT (= 22:00Z Sat) closed; next Saturday 22:00 AEDT = 11:00Z
    expect(evaluateHours(late, new Date('2026-10-03T22:00:00Z'))).toEqual({ state: 'closed', until: '2026-10-10T11:00:00.000Z', source: 'weekly' });
  });

  it('keeps wall-clock semantics across the AEDT→AEST change (2026-04-05)', () => {
    const late = scheduled(week({ saturday: { state: 'intervals', intervals: [{ start: '22:00', end: '02:30', endNextDay: true }] } }));
    // Saturday 2026-04-04 22:00 AEDT = 11:00Z; 02:30 next day occurs twice — the first occurrence (15:30Z) is used.
    expect(evaluateHours(late, new Date('2026-04-04T11:30:00Z'))).toEqual({ state: 'open', until: '2026-04-04T15:30:00.000Z', source: 'weekly' });
    expect(evaluateHours(late, new Date('2026-04-04T15:45:00Z')).state).toBe('closed');
  });
});
