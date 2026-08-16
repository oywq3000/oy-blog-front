export interface HeatmapDayEntry {
  date: string;
  count: number;
}

export interface HeatmapDay extends HeatmapDayEntry {
  intensity: number;
}

export type HeatmapData = HeatmapDay[][]; // 52 周 × 7 天

export const WEEKS = 52;
export const DAYS = 7;

/** count → rgba alpha，匹配图例 4 档 0.1/0.4/0.7/1 */
export const toIntensity = (count: number): number => {
  if (count <= 0) return 0;
  if (count === 1) return 0.1;
  if (count <= 3) return 0.4;
  if (count <= 6) return 0.7;
  return 1;
};

/** 本地时区 'YYYY-MM-DD'（toISOString 是 UTC，UTC+8 凌晨 0-8 点会串前一天，勿用） */
export const formatLocalDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** API 扁平 {date, count} 列表 → 与模板一致的 52×7 网格（覆盖今天-364 … 昨天，今天不入网格） */
export const buildHeatmapData = (entries: HeatmapDayEntry[]): HeatmapData => {
  const byDate = new Map(entries.map((e) => [e.date, e.count]));
  const today = new Date();
  const data: HeatmapData = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - ((WEEKS - w) * DAYS) + d);
      const key = formatLocalDateKey(date);
      const count = byDate.get(key) ?? 0;
      week.push({ intensity: toIntensity(count), date: key, count });
    }
    data.push(week);
  }
  return data;
};
