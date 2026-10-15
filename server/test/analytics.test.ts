import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAnalytics, comparisonWindows, type AnalyticsActivity, type AnalyticsRecord } from '../src/utils/analyticsUtils.js';
import { datesBetween } from '../src/utils/dateUtils.js';
import type { AnalyticsFilters } from '../src/types/analytics.js';

const activity = (id: string, startDate = '2026-10-01', archived = false): AnalyticsActivity => ({ id, name: id, color: 'violet', startDate, archived });
const record = (activityId: string, date: string): AnalyticsRecord => ({ activityId, date });
const filters: AnalyticsFilters = { from: '2026-10-01', to: '2026-10-03', includeArchived: false };
const calculate = (activities: AnalyticsActivity[], records: AnalyticsRecord[], selection = filters, today = '2026-10-03') => calculateAnalytics(activities, records, selection, today, 'Asia/Kolkata', '2026-10-03T12:00:00Z');

test('uses eligible activity-day totals, not an average of daily percentages', () => {
  const result = calculate([activity('a'), activity('b', '2026-10-02')], [record('a', '2026-10-01'), record('a', '2026-10-02')]);
  assert.deepEqual(result.summary, { completed: 2, eligible: 5, remaining: 3, percentage: 40 });
  assert.deepEqual(result.daily.map(day => day.percentage), [100, 50, 0]);
  assert.equal(result.habits[0].percentage, 66.7);
  assert.equal(result.habits[1].percentage, 0);
  assert.deepEqual(result.streaks, { current: 0, longest: 1 });
});

test('ignores duplicate, orphan, pre-start, future, and out-of-range records', () => {
  const result = calculate([activity('a', '2026-10-02')], [
    record('a', '2026-10-01'), record('a', '2026-10-02'), record('a', '2026-10-02'),
    record('missing', '2026-10-02'), record('a', '2026-10-04'), record('a', '2026-09-30'),
  ], { ...filters, to: '2026-10-05' });
  assert.deepEqual(result.summary, { completed: 1, eligible: 2, remaining: 1, percentage: 50 });
  assert.deepEqual(result.daily.map(day => day.eligible), [0, 1, 1, 0, 0]);
  assert.equal(result.daily[3].future, true);
  assert.equal(result.daily[3].percentage, null);
});

test('activity and archive filters apply to every chart and comparison', () => {
  const activities = [activity('a', '2026-09-01'), activity('b', '2026-09-01', true)];
  const records = [record('a', '2026-10-01'), record('b', '2026-10-01'), record('b', '2026-09-01')];
  const active = calculate(activities, records);
  assert.equal(active.summary.completed, 1);
  assert.equal(active.summary.eligible, 3);
  assert.equal(active.habits.length, 1);
  assert.equal(active.comparison.previous.completed, 0);
  const all = calculate(activities, records, { ...filters, includeArchived: true });
  assert.equal(all.summary.completed, 2);
  assert.equal(all.summary.eligible, 6);
  const single = calculate(activities, records, { ...filters, activityId: 'b', includeArchived: true });
  assert.equal(single.habits.length, 1);
  assert.equal(single.summary.completed, 1);
  assert.equal(single.summary.eligible, 3);
  assert.equal(single.comparison.previous.completed, 1);
  assert.equal(single.comparison.current.completed, 1);
  assert.deepEqual(single.daily.map(day => day.completed), [1, 0, 0]);
});

test('empty data, future ranges, and activities starting later produce null percentages', () => {
  for (const result of [calculate([], []), calculate([activity('a', '2026-10-05')], []), calculate([activity('a')], [], { ...filters, from: '2026-11-01', to: '2026-11-03' })]) {
    assert.deepEqual(result.summary, { completed: 0, eligible: 0, remaining: 0, percentage: null });
    assert.deepEqual(result.streaks, { current: 0, longest: 0 });
    assert.equal(result.comparison.deltaPercentagePoints, null);
  }
});

test('current month comparison matches elapsed dates and caps short prior months', () => {
  assert.deepEqual(comparisonWindows('2028-03', '2028-03-31'), {
    current: { from: '2028-03-01', to: '2028-03-31' }, previous: { from: '2028-02-01', to: '2028-02-29' }, mode: 'elapsed-days',
  });
  assert.equal(comparisonWindows('2027-03', '2027-03-30').previous.to, '2027-02-28');
  assert.deepEqual(comparisonWindows('2026-01', '2026-01-15'), {
    current: { from: '2026-01-01', to: '2026-01-15' }, previous: { from: '2025-12-01', to: '2025-12-15' }, mode: 'elapsed-days',
  });
  assert.equal(comparisonWindows('2026-09', '2026-10-15').current.to, '2026-09-30');
  assert.equal(comparisonWindows('2026-09', '2026-10-15').previous.to, '2026-08-31');
});

test('month comparison is separate from range totals and reports percentage points', () => {
  const result = calculate([activity('a', '2026-09-01')], [
    record('a', '2026-09-01'), record('a', '2026-10-01'), record('a', '2026-10-02'),
  ], { ...filters, from: '2026-10-02' });
  assert.equal(result.summary.completed, 1);
  assert.equal(result.comparison.current.completed, 2);
  assert.equal(result.comparison.previous.completed, 1);
  assert.equal(result.comparison.current.eligible, 3);
  assert.equal(result.comparison.previous.eligible, 3);
  assert.equal(result.comparison.deltaPercentagePoints, 33.3);
});

test('streaks respect date-range bounds and per-habit eligibility', () => {
  const result = calculate([activity('a'), activity('b', '2026-10-03')], [record('a', '2026-10-01'), record('a', '2026-10-02'), record('a', '2026-10-03')], { ...filters, from: '2026-10-02' });
  assert.deepEqual(result.habits[0].streaks, { current: 2, longest: 2 });
  assert.deepEqual(result.habits[1].streaks, { current: 0, longest: 0 });
  assert.deepEqual(result.streaks, { current: 1, longest: 1 });
});

test('summary, donut, daily chart, and habit bars reconcile across deterministic fixtures', () => {
  const dates = datesBetween('2028-02-01', '2028-03-02');
  const activities = Array.from({ length: 8 }, (_, i) => activity(String(i), dates[i * 2], i % 3 === 0));
  const records = activities.flatMap((a, i) => dates.filter((_, day) => (day + i) % 3 !== 0).map(date => record(a.id, date)));
  for (const includeArchived of [true, false]) {
    const result = calculate(activities, records, { from: dates[0], to: dates.at(-1)!, includeArchived }, '2028-02-29');
    const selected = activities.filter(a => includeArchived || !a.archived);
    let expectedEligible = 0;
    let expectedCompleted = 0;
    for (const a of selected) for (const date of dates) {
      if (date < a.startDate || date > '2028-02-29') continue;
      expectedEligible++;
      if (records.some(r => r.activityId === a.id && r.date === date)) expectedCompleted++;
    }
    assert.equal(result.summary.eligible, expectedEligible);
    assert.equal(result.summary.completed, expectedCompleted);
    for (const values of [result.daily, result.habits]) {
      assert.equal(values.reduce((sum, value) => sum + value.completed, 0), result.summary.completed);
      assert.equal(values.reduce((sum, value) => sum + value.eligible, 0), result.summary.eligible);
      assert.ok(values.every(value => value.completed + value.remaining === value.eligible && value.completed <= value.eligible));
    }
    assert.equal(result.summary.completed + result.summary.remaining, result.summary.eligible);
  }
});
