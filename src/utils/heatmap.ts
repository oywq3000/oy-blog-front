export interface HeatmapDayEntry {
  date: string;
  count: number;
}

export interface HeatmapDay extends HeatmapDayEntry {
  intensity: number;
}

export type HeatmapData = HeatmapDay[][]; // 周列（周一为列首）：52 完整周，非周一时多 1 列当前周已过天数

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

/**
 * API 扁平 {date, count} 列表 → 周一对齐的日历周网格（覆盖昨天及之前 52 完整周 + 当前周已过天数，今天不入网格）。
 * 列起点固定周一：左侧 Mon/Wed/Fri 星期轴才能与格子行精确对齐；
 * 非周一时末列为当前周部分（周一…昨天），网格最多 53 列。
 */
export const buildHeatmapData = (entries: HeatmapDayEntry[], now: Date = new Date()): HeatmapData => {
  const byDate = new Map(entries.map((e) => [e.date, e.count]));
  // 今天所在周的周一距今天几天（getDay: 0=Sun → (0+6)%7=6，即周日回退 6 天）
  const daysBackToMonday = (now.getDay() + 6) % 7;
  const totalDays = WEEKS * DAYS + daysBackToMonday;
  const start = new Date(now);
  start.setDate(now.getDate() - totalDays);
  const data: HeatmapData = [];
  for (let w = 0; w * DAYS < totalDays; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < DAYS; d++) {
      const dayIndex = w * DAYS + d;
      if (dayIndex >= totalDays) break;
      const date = new Date(start);
      date.setDate(start.getDate() + dayIndex);
      const key = formatLocalDateKey(date);
      const count = byDate.get(key) ?? 0;
      week.push({ intensity: toIntensity(count), date: key, count });
    }
    data.push(week);
  }
  return data;
};

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** 星期轴只标 3 行（Mon/Wed/Fri），与 GitHub 风格一致 */
export const AXIS_LABEL_WEEKDAYS = [1, 3, 5];

export interface HeatmapMonthLabel {
  label: string;
  colIndex: number;
}

/**
 * 按网格实际日期生成月份标签：每个标签定位到该月首个格子所在列。
 * 静态 Jan…Dec 标签与实际 364 天窗口不对齐，会导致近期数据看似落在错误的月份。
 * 相邻列（间距 < 2）的标签会因绝对定位文字溢出而叠压成乱码——
 * 仅网格起点的"不完整月"标签可能出现（完整月相距 ≥ 28 天，列距 ≥ 3），
 * 此时丢弃起点标签，保留代表真实月初的后一个标签。
 */
export const buildMonthLabels = (data: HeatmapData): HeatmapMonthLabel[] => {
  const labels: HeatmapMonthLabel[] = [];
  let prevKey = '';
  data.forEach((week, colIndex) => {
    for (const day of week) {
      const key = day.date.slice(0, 7); // 'YYYY-MM'
      if (key !== prevKey) {
        const last = labels[labels.length - 1];
        if (last && colIndex - last.colIndex < 2) {
          labels.pop();
        }
        labels.push({ label: MONTH_LABELS[Number(key.slice(5, 7)) - 1], colIndex });
        prevKey = key;
      }
    }
  });
  return labels;
};

/**
 * 星期轴标签：返回 7 行（d=0..6）各自的标签，Mon/Wed/Fri 三行有值，其余为 ''。
 * 网格起点 = 今天-364，与今天同星期几（会随日期漂移），
 * 所以必须按第一格真实日期把标签定位到正确行，静态标签只会错位。
 */
export const buildWeekdayLabels = (data: HeatmapData): string[] => {
  const labels: string[] = Array(DAYS).fill('');
  const first = data[0]?.[0];
  if (!first) return labels;
  const [y, m, d] = first.date.split('-').map(Number);
  const startWeekday = new Date(y, m - 1, d, 12).getDay(); // 0=Sun，本地时区
  for (const weekday of AXIS_LABEL_WEEKDAYS) {
    labels[(weekday - startWeekday + DAYS) % DAYS] = WEEKDAY_NAMES[weekday];
  }
  return labels;
};

/** 格子背景色：无活动为透明灰（看得见空格），有活动为主题色按强度 */
export const cellBackground = (intensity: number): string =>
  intensity <= 0
    ? 'rgba(var(--color-text-secondary-rgb), 0.15)'
    : `rgba(var(--color-accent-primary-rgb), ${intensity})`;
