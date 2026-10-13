import { z } from 'zod';
import { validDate } from '../utils/dateUtils.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid activity ID');
export const calendarDate = z.string().refine(validDate, 'Enter a valid date between 1900 and 2100');
export const activityInput = z.object({
  name: z.string().trim().min(1, 'Give your activity a name').max(80),
  description: z.string().trim().max(240).default(''),
  color: z.enum(['violet', 'blue', 'green', 'orange', 'pink']).default('violet'),
});
