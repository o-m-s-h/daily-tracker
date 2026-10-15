import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsQuery } from '../src/utils/analyticsQuery.js';

test('defaults archive inclusion to false and parses explicit flags', () => {
  const range = { from: '2026-10-01', to: '2026-10-15' };
  assert.equal(analyticsQuery.parse(range).includeArchived, false);
  assert.equal(analyticsQuery.parse({ ...range, includeArchived: 'true' }).includeArchived, true);
  assert.equal(analyticsQuery.parse({ ...range, includeArchived: 'false' }).includeArchived, false);
});
test('validates inclusive 366-day limit and calendar dates', () => {
  assert.equal(analyticsQuery.safeParse({ from: '2028-01-01', to: '2028-12-31' }).success, true);
  for (const input of [
    { from: '2028-01-01', to: '2029-01-01' },
    { from: '2026-10-15', to: '2026-10-14' },
    { from: '2027-02-29', to: '2027-03-01' },
    { from: '2026-10-01' },
    { from: 'bad', to: '2026-10-15' },
  ]) assert.equal(analyticsQuery.safeParse(input).success, false);
});
test('rejects query objects, repeated dates, invalid IDs, and ambiguous booleans', () => {
  const range = { from: '2026-10-01', to: '2026-10-15' };
  for (const extra of [{ activityId: { $ne: null } }, { activityId: 'invalid' }, { includeArchived: 'yes' }, { from: ['2026-10-01', '2026-10-02'] }]) {
    assert.equal(analyticsQuery.safeParse({ ...range, ...extra }).success, false);
  }
  assert.equal(analyticsQuery.safeParse({ ...range, activityId: '0123456789abcdef01234567' }).success, true);
});
