import { User } from '../models/User.js';
import { asyncHandler, HttpError } from './errorMiddleware.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  if (!req.session.userId) throw new HttpError(401, 'Please sign in to continue.');
  const user = await User.findById(req.session.userId);
  if (!user) throw new HttpError(401, 'Please sign in again.');
  res.locals.user = user;
  next();
});
