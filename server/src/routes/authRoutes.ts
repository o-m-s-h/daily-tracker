import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, publicUser } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const authRoutes = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many attempts. Please try again in 15 minutes.' } });
authRoutes.post('/register', limiter, register);
authRoutes.post('/login', limiter, login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, (_req, res) => { res.json({ user: publicUser(res.locals.user) }); });
