import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreaks } from '../src/utils/streakUtils.js';

const day = (date: string, completed = 1, eligible = 1) => ({ date, completed, eligible });
test('empty, future-only, and ineligible days have no streak', () => {
  assert.deepEqual(calculateStreaks([], '2026-10-15'), { current: 0, longest: 0 });
  assert.deepEqual(calculateStreaks([day('2026-10-16'), day('2026-10-14', 0, 0)], '2026-10-15'), { current: 0, longest: 0 });
});
test('unchecked today preserves yesterday; a completed today extends it', () => {
  const prior = [day('2026-10-13'), day('2026-10-14')];
  assert.deepEqual(calculateStreaks([...prior, day('2026-10-15', 0)], '2026-10-15'), { current: 2, longest: 2 });
  assert.deepEqual(calculateStreaks([...prior, day('2026-10-15')], '2026-10-15'), { current: 3, longest: 3 });
});
test('a missed past day resets current but retains the longest streak', () => {
  const days = [day('2026-10-10'), day('2026-10-11'), day('2026-10-12', 0), day('2026-10-13')];
  assert.deepEqual(calculateStreaks(days, '2026-10-15'), { current: 1, longest: 2 });
  assert.deepEqual(calculateStreaks([...days, day('2026-10-14', 0)], '2026-10-15'), { current: 0, longest: 2 });
});
test('partial completion is not a perfect day; no eligible days break runs', () => {
  assert.deepEqual(calculateStreaks([day('2026-10-11'), day('2026-10-12', 1, 2), day('2026-10-13')], '2026-10-15'), { current: 1, longest: 1 });
  assert.deepEqual(calculateStreaks([day('2026-10-11'), day('2026-10-12', 0, 0), day('2026-10-13')], '2026-10-15'), { current: 1, longest: 1 });
});
test('missing dates do not bridge streaks and input order does not matter', () => {
  assert.deepEqual(calculateStreaks([day('2026-10-15'), day('2026-10-12'), day('2026-10-14')], '2026-10-15'), { current: 2, longest: 2 });
  assert.deepEqual(calculateStreaks([day('2026-10-12'), day('2026-10-15', 0)], '2026-10-15'), { current: 0, longest: 1 });
});
test('streaks cross leap days, month boundaries, and year boundaries', () => {
  assert.deepEqual(calculateStreaks([day('2028-02-28'), day('2028-02-29'), day('2028-03-01')], '2028-03-01'), { current: 3, longest: 3 });
  assert.deepEqual(calculateStreaks([day('2026-12-31'), day('2027-01-01')], '2027-01-02'), { current: 2, longest: 2 });
});
