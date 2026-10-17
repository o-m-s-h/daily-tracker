import type { Request } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/errorMiddleware.js';
import { equalSecret, hashPassword, verifyPassword } from '../utils/password.js';
import { validTimeZone } from '../utils/dateUtils.js';

const credentials = z.object({ email: z.string().trim().email().transform(v => v.toLowerCase()), password: z.string().min(1, 'Enter a password') });
const registration = credentials.extend({
  name: z.string().trim().min(1).max(60),
  registrationKey: z.string().min(1).max(256),
  timeZone: z.string().max(100).refine(validTimeZone, 'Choose a valid IANA time zone'),
});
export function publicUser(user: { _id: unknown; email: string; name: string; timeZone: string }) {
  return { id: String(user._id), email: user.email, name: user.name, timeZone: user.timeZone };
}
async function signIn(req: Request, userId: string) {
  await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = userId;
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
}
export const register = asyncHandler(async (req, res) => {
  const input = registration.parse(req.body);
  if (!equalSecret(input.registrationKey, env.REGISTRATION_KEY)) {
    throw new HttpError(403, 'The invite key is incorrect. Ask the person who invited you for the current key.');
  }
  const user = await User.create({ email: input.email, name: input.name, timeZone: input.timeZone, passwordHash: await hashPassword(input.password) });
  await signIn(req, user.id);
  res.status(201).json({ user: publicUser(user) });
});
export const login = asyncHandler(async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  // Do equivalent password work even when the account does not exist.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`);
  if (!user || !valid) throw new HttpError(401, 'Email or password is incorrect.');
  await signIn(req, user.id);
  res.json({ user: publicUser(user) });
});
export const logout = asyncHandler(async (req, res) => {
  await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
  res.clearCookie('daymark.sid', { path: '/', httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production' });
  res.status(204).end();
});
