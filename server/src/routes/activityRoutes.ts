import { Router } from 'express';
import { listActivities, createActivity, updateActivity, archiveActivity, deleteActivity } from '../controllers/activityController.js';

export const activityRoutes = Router();
activityRoutes.get('/', listActivities);
activityRoutes.post('/', createActivity);
activityRoutes.put('/:id', updateActivity);
activityRoutes.patch('/:id/archive', archiveActivity);
activityRoutes.delete('/:id', deleteActivity);
