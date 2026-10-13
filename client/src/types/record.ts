export interface DailyRecord { activityId: string; date: string }
export const recordKey = (activityId: string, date: string) => `${activityId}:${date}`;
