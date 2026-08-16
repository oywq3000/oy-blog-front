import { describe, it, expect } from 'vitest'
import { buildHeatmapData, toIntensity, formatLocalDateKey, WEEKS, DAYS } from '../utils/heatmap'

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
