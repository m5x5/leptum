/** One row of chart data: the selected metric values plus the activity label and time. */
export interface ChartPoint {
  activity: string;
  date: number;
  timestamp: number;
  [metric: string]: string | number | null;
}
