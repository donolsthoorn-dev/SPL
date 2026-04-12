export type WeeklyPlan = {
  id: string;
  week_start: string;
  title: string;
  notes: string | null;
  published: boolean;
  created_at: string;
};
