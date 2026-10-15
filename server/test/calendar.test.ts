import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, datesBetween, daysBetween, monthBounds, previousMonth, todayIn, validDate, validTimeZone } from '../src/utils/dateUtils.js';
import { addDays as clientAddDays, monthDays, shiftMonth, todayIn as clientTodayIn } from '../../client/src/lib/dates.ts';

test('Gregorian leap-year rules and invalid dates', () => {
  for (const date of ['2028-02-29', '2000-02-29', '1900-01-01', '2100-12-31']) assert.equal(validDate(date), true);
  for (const date of ['2027-02-29', '1900-02-29', '2100-02-29', '2026-04-31', '2026-13-01', '2026-2-01', 'bad', '1899-12-31']) assert.equal(validDate(date), false);
});

test('month boundaries, year rollover, and frontend month navigation agree', () => {
  assert.deepEqual(monthBounds('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
  assert.equal(monthBounds('2027-02').to, '2027-02-28');
  assert.equal(previousMonth('2026-01'), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  for (const month of ['2026-01', '2026-04', '2027-02', '2028-02', '2000-02', '2100-02']) {
    const bounds = monthBounds(month);
    assert.deepEqual(monthDays(month), datesBetween(bounds.from, bounds.to));
    assert.equal(shiftMonth(month, -1), previousMonth(month));
  }
});

test('date arithmetic is inclusive and does not skip dates at daylight saving changes', () => {
  assert.deepEqual(datesBetween('2026-03-07', '2026-03-10'), ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
  assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(datesBetween('2026-01-02', '2026-01-01'), []);
  assert.deepEqual(datesBetween('2026-01-01', '2026-01-01'), ['2026-01-01']);
  assert.equal(clientAddDays('2026-01-01', -1), '2025-12-31');
});

test('account time zone determines the calendar day, including midnight and DST', () => {
  const instant = new Date('2026-10-14T20:00:00Z');
  assert.equal(todayIn('Asia/Kolkata', instant), '2026-10-15');
  assert.equal(todayIn('America/Los_Angeles', instant), '2026-10-14');
  assert.equal(todayIn('America/New_York', new Date('2026-03-08T06:59:00Z')), '2026-03-08');
  assert.equal(todayIn('America/New_York', new Date('2026-03-08T07:01:00Z')), '2026-03-08');
  assert.equal(validTimeZone('Asia/Kolkata'), true);
  assert.equal(validTimeZone('not/a-zone'), false);
  // Both implementations use the account zone, independent of the host zone.
  for (const zone of ['UTC', 'Asia/Kolkata', 'America/Los_Angeles']) assert.equal(clientTodayIn(zone, instant), todayIn(zone, instant));
});
