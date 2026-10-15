import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Activity } from '../src/models/Activity.js';
import { DailyRecord } from '../src/models/DailyRecord.js';
import { getAnalytics } from '../src/services/analyticsService.js';

// Explicit opt-in only. Never load the application's .env or use MONGODB_URI.
const uri = process.env.TEST_MONGODB_URI;
test('analytics reads persisted records, scopes ownership, and reflects database changes', { skip: !uri, timeout: 60000 }, async t => {
  const owner = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  let fixturesCreated = false;
  await mongoose.connect(uri!, { serverSelectionTimeoutMS: 10000 });
  try {
    assert.match(mongoose.connection.name, /test/i, 'Use a dedicated database with "test" in its name.');
    await Promise.all([Activity.init(), DailyRecord.init()]);
    fixturesCreated = true;
    const [a, archived, foreign] = await Activity.create([
      { userId: owner, name: 'Read', color: 'violet', startDate: '2026-09-01' },
      { userId: owner, name: 'Walk', color: 'green', startDate: '2026-10-02', archivedAt: new Date('2026-10-03T12:00:00Z') },
      { userId: other, name: 'Private', color: 'blue', startDate: '2026-09-01' },
    ]);
    await DailyRecord.create([
      { userId: owner, activityId: a._id, date: '2026-09-01' },
      { userId: owner, activityId: a._id, date: '2026-10-01' },
      { userId: owner, activityId: archived._id, date: '2026-10-02' },
      { userId: other, activityId: foreign._id, date: '2026-10-01' },
      // Deliberately malformed ownership pair must not leak into this user's result.
      { userId: other, activityId: a._id, date: '2026-10-02' },
    ]);
    const filters = { from: '2026-10-01', to: '2026-10-03', includeArchived: false };
    const read = (options = filters) => getAnalytics(String(owner), options, '2026-10-03', 'Asia/Kolkata');
    await t.test('database totals and comparison exclude other owners', async () => {
      const result = await read();
      assert.equal(result.summary.completed, 1);
      assert.equal(result.summary.eligible, 3);
      assert.equal(result.comparison.previous.completed, 1);
      assert.equal(result.activityOptions.some(option => option.name === 'Private'), false);
      await assert.rejects(getAnalytics(String(owner), { ...filters, activityId: String(foreign._id) }, '2026-10-03', 'Asia/Kolkata'), { status: 404 });
    });
    await t.test('archive and activity selection affect persisted totals', async () => {
      const all = await read({ ...filters, includeArchived: true });
      assert.equal(all.summary.completed, 2);
      assert.equal(all.summary.eligible, 5);
      const selected = await getAnalytics(String(owner), { ...filters, includeArchived: true, activityId: String(archived._id) }, '2026-10-03', 'Asia/Kolkata');
      assert.equal(selected.summary.completed, 1);
      assert.equal(selected.summary.eligible, 2);
    });
    await t.test('saving, unchecking, and deleting are reflected without stale aggregation', async () => {
      const filter = { userId: owner, activityId: a._id, date: '2026-10-03' };
      await DailyRecord.updateOne(filter, { $setOnInsert: filter }, { upsert: true });
      assert.equal((await read()).summary.completed, 2);
      await DailyRecord.deleteOne(filter);
      assert.equal((await read()).summary.completed, 1);
      await Activity.deleteOne({ _id: a._id, userId: owner });
      // Orphan records, even if present, must not count.
      assert.equal((await read()).summary.eligible, 0);
      assert.equal((await read()).summary.completed, 0);
    });
  } finally {
    try {
      if (fixturesCreated) {
        await DailyRecord.deleteMany({ userId: { $in: [owner, other] } });
        await Activity.deleteMany({ userId: { $in: [owner, other] } });
      }
    } finally { await mongoose.disconnect(); }
  }
});
