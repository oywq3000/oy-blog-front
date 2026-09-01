import { describe, it, expect } from 'vitest';
import {
  buildHeatmapData,
  buildMonthLabels,
  formatLocalDateKey,
  type HeatmapData,
} from './heatmap';

/**
 * 热力图网格边界测试。
 *
 * 背景：buildHeatmapData 的窗口须以「今天」收尾（此前设计止于昨天，今天不入网格），
 * 网格 = 52 完整周 + 当前周已过天数（含今天），恒 53 列。
 * 全部用固定 now（本地时区正午）构造，避免依赖运行机器时区/真实时钟。
 */

/** 本地时区正午构造日期，使 getDate/getDay 与机器时区无关 */
const at = (y: number, m: number, d: number) => new Date(y, m, d, 12);

const lastCell = (data: HeatmapData) => {
  const col = data[data.length - 1];
  return col[col.length - 1];
};
const totalCells = (data: HeatmapData) => data.reduce((sum, week) => sum + week.length, 0);

describe('buildHeatmapData', () => {
  // 2026-08-31 是周一，2026-09-06 是周日
  const MONDAY = at(2026, 7, 31);
  const SUNDAY = at(2026, 8, 6);

  it('should end the grid at today and render today count', () => {
    const now = MONDAY;
    const data = buildHeatmapData([{ date: formatLocalDateKey(now), count: 3 }], now);
    const last = lastCell(data);
    expect(last.date).toBe('2026-08-31');
    expect(last.count).toBe(3);
    expect(last.intensity).toBe(0.4); // count 3 → 4 档中的 0.4
  });

  it('should keep the day before today at the second-to-last cell', () => {
    const now = SUNDAY; // 末列为完整一周（周一…今天），昨天=周六在末列倒数第二格
    const data = buildHeatmapData([{ date: '2026-09-05', count: 1 }], now);
    const col = data[data.length - 1];
    expect(col[col.length - 2].date).toBe('2026-09-05');
    expect(col[col.length - 2].count).toBe(1);
  });

  it('should end at today with 365 cells when today is Monday (last col has 1 cell)', () => {
    const data = buildHeatmapData([], MONDAY);
    expect(data.length).toBe(53);
    expect(totalCells(data)).toBe(365);
    const lastCol = data[data.length - 1];
    expect(lastCol.length).toBe(1);
    expect(lastCol[0].date).toBe('2026-08-31');
  });

  it('should end at today with 371 cells when today is Sunday (last col is full Mon..Sun)', () => {
    const data = buildHeatmapData([], SUNDAY);
    expect(data.length).toBe(53);
    expect(totalCells(data)).toBe(371);
    const lastCol = data[data.length - 1];
    expect(lastCol.length).toBe(7);
    expect(lastCol[0].date).toBe('2026-08-31'); // 本周周一
    expect(lastCol[6].date).toBe('2026-09-06'); // 今天（周日）
  });

  it('should still render today as an empty cell when no entry covers it', () => {
    const now = at(2026, 8, 2); // 2026-09-02 周三
    const data = buildHeatmapData([{ date: '2026-09-01', count: 1 }], now);
    const last = lastCell(data);
    expect(last.date).toBe('2026-09-02');
    expect(last.count).toBe(0);
    expect(last.intensity).toBe(0);
  });

  it('should keep the first column starting on Monday', () => {
    const data = buildHeatmapData([], SUNDAY);
    expect(data[0][0].date).toBe('2025-09-01'); // 52 周前的周一
  });
});

describe('buildMonthLabels', () => {
  it('should place the current month label on the last column when today is the 1st', () => {
    const now = at(2026, 8, 1); // 2026-09-01（月初，周二）
    const data = buildHeatmapData([], now);
    const labels = buildMonthLabels(data);
    const last = labels[labels.length - 1];
    expect(last.label).toBe('Sep');
    // 该标签所在列应包含 9 月的日期
    expect(data[last.colIndex].some((day) => day.date.startsWith('2026-09'))).toBe(true);
  });

  it('should not emit labels closer than 2 columns apart (would overlap in the UI)', () => {
    const now = at(2026, 8, 1);
    const data = buildHeatmapData([], now);
    const labels = buildMonthLabels(data);
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i].colIndex - labels[i - 1].colIndex).toBeGreaterThanOrEqual(2);
    }
  });
});
