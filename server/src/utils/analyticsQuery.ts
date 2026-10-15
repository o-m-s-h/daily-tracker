import { z } from 'zod';
import { calendarDate, objectId } from '../middleware/validateRequest.js';
import { daysBetween } from './dateUtils.js';

export const analyticsQuery = z.object({
  from: calendarDate,
  to: calendarDate,
  activityId: objectId.transform(value => value.toLowerCase()).optional(),
  includeArchived: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
}).superRefine((value, context) => {
  if (value.from > value.to) context.addIssue({ code: 'custom', message: 'The start date must be on or before the end date.', path: ['to'] });
  if (daysBetween(value.from, value.to) > 365) context.addIssue({ code: 'custom', message: 'Choose a range of at most 366 days.', path: ['to'] });
});
