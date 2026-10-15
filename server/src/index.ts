import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Activity } from './models/Activity.js';
import { DailyRecord } from './models/DailyRecord.js';
import { startupErrorHint } from './utils/startupError.js';

let startupStage = 'connecting to MongoDB';
try {
  console.log('Connecting to MongoDB…');
  await connectDatabase();
  startupStage = 'creating database indexes';
  console.log('MongoDB connected. Preparing database indexes…');
  // Unique indexes must exist before accepting registration or checkbox writes.
  await Promise.all([User.init(), Activity.init(), DailyRecord.init()]);
  startupStage = 'initializing session storage';
  // Reuse the authenticated client instead of starting a second, unhandled connection.
  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.name,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
  });
  sessionStore.on('error', () => console.error('Session storage is unavailable.'));
  // This also waits for the session expiry index, so failures reach the catch below.
  await sessionStore.collectionP;
  const app = createApp(sessionStore);
  const server = app.listen(env.PORT, '0.0.0.0', () => console.log(`Daymark API listening on port ${env.PORT}`));
  const shutdown = () => {
    // Mongoose owns the shared client and closes it once for both consumers.
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0)).catch(() => {
        console.error('Could not close the database connection cleanly.');
        process.exit(1);
      });
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Startup failed while ${startupStage}.`);
  console.error(startupErrorHint(error));
  process.exit(1);
}
