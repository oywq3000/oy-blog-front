import { describe, it, expect } from 'vitest'
import { shouldShowFooter } from '../utils/pageChrome'

// ============================================================
// 页面外框（Footer 等）可见性测试
//
// 背景：聊天页（/agent）是整屏应用页，消息在内部滚动。
// 若 App 框架的 Footer 仍然渲染，body 会始终多出 Footer 高度、
// 页面永远可整体滚动，破坏"滚轮收纳消息"的体验。
// ============================================================

describe('shouldShowFooter', () => {
  it('should hide footer on agent page', () => {
    expect(shouldShowFooter('agent')).toBe(false)
  })

  it('should hide footer on agent conversation page', () => {
    expect(shouldShowFooter('agent-conversation')).toBe(false)
  })

  it('should show footer on normal pages', () => {
    expect(shouldShowFooter('home')).toBe(true)
    expect(shouldShowFooter('search')).toBe(true)
    expect(shouldShowFooter(undefined)).toBe(true)
  })
})
