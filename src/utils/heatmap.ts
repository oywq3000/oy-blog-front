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
export const buildHeatmapData = (entries: HeatmapDayEntry[], now: Date = new Date()): HeatmapData => {
  const byDate = new Map(entries.map((e) => [e.date, e.count]));
  const data: HeatmapData = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - ((WEEKS - w) * DAYS) + d);
      const key = formatLocalDateKey(date);
      const count = byDate.get(key) ?? 0;
      week.push({ intensity: toIntensity(count), date: key, count });
    }
    data.push(week);
  }
  return data;
};

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface HeatmapMonthLabel {
  label: string;
  colIndex: number;
}

/**
 * 按网格实际日期生成月份标签：每个标签定位到该月首个格子所在列。
 * 静态 Jan…Dec 标签与实际 364 天窗口不对齐，会导致近期数据看似落在错误的月份。
 */
export const buildMonthLabels = (data: HeatmapData): HeatmapMonthLabel[] => {
  const labels: HeatmapMonthLabel[] = [];
  let prevKey = '';
  data.forEach((week, colIndex) => {
    for (const day of week) {
      const key = day.date.slice(0, 7); // 'YYYY-MM'
      if (key !== prevKey) {
        labels.push({ label: MONTH_LABELS[Number(key.slice(5, 7)) - 1], colIndex });
        prevKey = key;
      }
    }
  });
  return labels;
};

/** 格子背景色：无活动为透明灰（看得见空格），有活动为主题色按强度 */
export const cellBackground = (intensity: number): string =>
  intensity <= 0
    ? 'rgba(var(--color-text-secondary-rgb), 0.15)'
    : `rgba(var(--color-accent-primary-rgb), ${intensity})`;
