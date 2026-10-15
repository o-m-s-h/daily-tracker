import { asyncHandler } from '../middleware/errorMiddleware.js';
import { analyticsQuery } from '../utils/analyticsQuery.js';
import { todayIn } from '../utils/dateUtils.js';
import { getAnalytics } from '../services/analyticsService.js';

export const analyticsOverview = asyncHandler(async (req, res) => {
  const filters = analyticsQuery.parse(req.query);
  const timeZone = res.locals.user.timeZone as string;
  const analytics = await getAnalytics(req.session.userId!, filters, todayIn(timeZone), timeZone);
  res.json(analytics);
});
