import { Router } from 'express';
import { listRecords, saveRecord } from '../controllers/recordController.js';

export const recordRoutes = Router();
recordRoutes.get('/', listRecords);
recordRoutes.put('/', saveRecord);
