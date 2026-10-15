import { Router } from 'express';
import { analyticsOverview } from '../controllers/analyticsController.js';

export const analyticsRoutes = Router();
analyticsRoutes.get('/', analyticsOverview);
