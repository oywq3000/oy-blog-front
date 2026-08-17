import { describe, it, expect } from 'vitest'
import { buildHeatmapData, buildMonthLabels, cellBackground, toIntensity, formatLocalDateKey, WEEKS, DAYS, MONTH_LABELS } from '../utils/heatmap'

// ============================================================
// 活跃度热力图纯函数测试
// ============================================================

const yesterdayKey = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatLocalDateKey(d)
}

describe('heatmap 工具函数', () => {
  it('buildHeatmapData([]) 生成 52×7 全零网格，最后一格为昨天', () => {
    const data = buildHeatmapData([])

    expect(data).toHaveLength(WEEKS)
    data.forEach((week) => expect(week).toHaveLength(DAYS))

    const cells = data.flat()
    expect(cells).toHaveLength(WEEKS * DAYS) // 364
    cells.forEach((cell) => {
      expect(cell.count).toBe(0)
      expect(cell.intensity).toBe(0)
      expect(cell.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
    expect(cells[cells.length - 1].date).toBe(yesterdayKey())
  })

  it('有数据时对应单元格回填 count 与 intensity，其余为 0', () => {
    const key = yesterdayKey()
    const data = buildHeatmapData([{ date: key, count: 5 }])

    const cells = data.flat()
    const hit = cells.find((c) => c.date === key)
    expect(hit).toBeDefined()
    expect(hit!.count).toBe(5)
    expect(hit!.intensity).toBe(0.7)

    cells.filter((c) => c.date !== key).forEach((c) => expect(c.count).toBe(0))
  })

  it('toIntensity 分级边界', () => {
    expect(toIntensity(0)).toBe(0)
    expect(toIntensity(-1)).toBe(0)
    expect(toIntensity(1)).toBe(0.1)
    expect(toIntensity(2)).toBe(0.4)
    expect(toIntensity(3)).toBe(0.4)
    expect(toIntensity(4)).toBe(0.7)
    expect(toIntensity(6)).toBe(0.7)
    expect(toIntensity(7)).toBe(1)
    expect(toIntensity(100)).toBe(1)
  })

  it('formatLocalDateKey 使用本地时区（凌晨不串前一天）', () => {
    const d = new Date(2026, 7, 10, 0, 30) // 本地 2026-08-10 00:30（UTC+8 下 toISOString 会变成 08-09）
    expect(formatLocalDateKey(d)).toBe('2026-08-10')
  })
})

// ============================================================
// 日期映射回归（固定 now，防止格子错位到别的月份）
// ============================================================
describe('buildHeatmapData 日期映射（固定 now=2026-08-17 12:00 本地）', () => {
  const NOW = new Date(2026, 7, 17, 12)

  it('网格覆盖 today-364 … 昨天', () => {
    const cells = buildHeatmapData([], NOW).flat()

    expect(cells[0].date).toBe('2025-08-18')
    expect(cells[cells.length - 1].date).toBe('2026-08-16')
  })

  it('后端条目回填到正确列/行（回归: 8 月数据错位到 10 月）', () => {
    const data = buildHeatmapData(
      [
        { date: '2026-07-23', count: 2 },
        { date: '2026-08-15', count: 12 },
      ],
      NOW
    )

    expect(data[48][3]).toMatchObject({ date: '2026-07-23', count: 2, intensity: 0.4 })
    expect(data[51][5]).toMatchObject({ date: '2026-08-15', count: 12, intensity: 1 })
  })
})

describe('buildMonthLabels 月份标签对齐真实日期', () => {
  const NOW = new Date(2026, 7, 17, 12)

  it('为网格内每个月份生成标签并定位到该月首列', () => {
    const data = buildHeatmapData([], NOW)
    const labels = buildMonthLabels(data)

    expect(labels.map((l) => l.label)).toEqual([
      'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
    ])
    expect(labels.map((l) => l.colIndex)).toEqual([0, 2, 6, 10, 15, 19, 23, 27, 32, 36, 41, 45, 49])
  })

  it('每个标签所在列包含该月第一天，前一列不含该月', () => {
    const data = buildHeatmapData([], NOW)
    const labels = buildMonthLabels(data)

    labels.forEach(({ label, colIndex }) => {
      const month = String(MONTH_LABELS.indexOf(label) + 1).padStart(2, '0')
      const inCol = (w: number) => data[w].some((cell) => cell.date.slice(5, 7) === month)
      expect(inCol(colIndex)).toBe(true)
      if (colIndex > 0) expect(inCol(colIndex - 1)).toBe(false)
    })
  })
})

describe('cellBackground 格子背景色', () => {
  it('无活动为透明灰，有活动为主题色按强度', () => {
    expect(cellBackground(0)).toBe('rgba(var(--color-text-secondary-rgb), 0.15)')
    expect(cellBackground(0.1)).toBe('rgba(var(--color-accent-primary-rgb), 0.1)')
    expect(cellBackground(1)).toBe('rgba(var(--color-accent-primary-rgb), 1)')
  })
})
