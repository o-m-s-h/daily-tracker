import 'dotenv/config';
import { z } from 'zod';

const secret = z.string().min(32).refine(value => !value.includes('REPLACE'), 'Replace the placeholder with a random secret');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_ORIGIN: z.string().url().transform(value => new URL(value).origin),
  MONGODB_URI: z.string().startsWith('mongodb').refine(value => !value.includes('REPLACE'), 'Replace the MongoDB placeholders'),
  SESSION_SECRET: secret,
  PERSONAL_EMAIL: z.string().email().transform(value => value.toLowerCase()),
  REGISTRATION_KEY: secret,
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
  SERVE_CLIENT: z.enum(['true', 'false']).default('true').transform(value => value === 'true'),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid server environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
if (env.NODE_ENV === 'production' && !env.APP_ORIGIN.startsWith('https://')) {
  throw new Error('APP_ORIGIN must use HTTPS in production.');
}
