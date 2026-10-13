export const colors = ['violet', 'blue', 'green', 'orange', 'pink'] as const;
export type ActivityColor = typeof colors[number];
export interface Activity {
  _id: string;
  name: string;
  description: string;
  color: ActivityColor;
  startDate: string;
  archivedAt: string | null;
}
export interface ActivityInput { name: string; description: string; color: ActivityColor; startDate: string }
