export interface AnalyticsFilters {
  from: string;
  to: string;
  activityId?: string;
  includeArchived: boolean;
}
export interface CompletionTotals {
  completed: number;
  eligible: number;
  remaining: number;
  percentage: number | null;
}
export interface DailyProgress extends CompletionTotals {
  date: string;
  future: boolean;
}
export interface Streaks { current: number; longest: number }
export interface ActivityOption {
  id: string;
  name: string;
  color: string;
  archived: boolean;
}
export interface HabitProgress extends ActivityOption, CompletionTotals {
  streaks: Streaks;
}
export interface MonthProgress extends CompletionTotals {
  from: string;
  to: string;
  month: string;
}
export interface AnalyticsResult {
  filters: AnalyticsFilters;
  today: string;
  timeZone: string;
  generatedAt: string;
  activityOptions: ActivityOption[];
  summary: CompletionTotals;
  daily: DailyProgress[];
  habits: HabitProgress[];
  streaks: Streaks;
  comparison: {
    current: MonthProgress;
    previous: MonthProgress;
    deltaPercentagePoints: number | null;
    mode: 'elapsed-days' | 'full-month';
  };
}
