import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Activity } from './models/Activity.js';
import { DailyRecord } from './models/DailyRecord.js';
import { startupErrorDetails, startupErrorHint } from './utils/startupError.js';

let startupStage = 'connecting to MongoDB';
try {
  console.log('Connecting to MongoDB…');
  await connectDatabase();
  startupStage = 'creating database indexes';
  console.log('MongoDB connected. Preparing database indexes…');
  // Unique indexes must exist before accepting registration or checkbox writes.
  await Promise.all([User.init(), Activity.init(), DailyRecord.init()]);
  startupStage = 'initializing session storage';
  // Let connect-mongo create its own driver-compatible client. Mongoose may
  // depend on a different MongoDB driver version, so its client cannot be shared.
  const sessionStore = MongoStore.create({
    mongoUrl: env.MONGODB_URI,
    mongoOptions: { serverSelectionTimeoutMS: 10000 },
    dbName: mongoose.connection.name,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
  });
  sessionStore.on('error', () => console.error('Session storage is unavailable.'));
  // Await both connection and expiry-index initialization immediately, so any
  // rejection reaches our startup handler instead of becoming unhandled.
  await sessionStore.collectionP;
  const app = createApp(sessionStore);
  const server = app.listen(env.PORT, '0.0.0.0', () => console.log(`Daymark API listening on port ${env.PORT}`));
  const shutdown = () => {
    // Each library now owns a separate client; wait for both to close.
    server.close(() => {
      void Promise.allSettled([mongoose.disconnect(), sessionStore.close()]).then(results => {
        const failed = results.some(result => result.status === 'rejected');
        if (failed) console.error('Could not close all database connections cleanly.');
        process.exit(failed ? 1 : 0);
      });
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Startup failed while ${startupStage}.`);
  console.error(startupErrorDetails(error));
  console.error(startupErrorHint(error));
  process.exit(1);
}
