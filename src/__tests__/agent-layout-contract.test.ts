import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ============================================================
// Agent 页面滚动布局契约测试
//
// 背景：消息区曾经"随着消息增长页面变长"，根因是 .agent-page
// 只有 min-height: 100vh（高度不定），导致子元素 .agent-layout 的
// flex-basis: 0% 按 CSS 规范退化为"内容尺寸"，整条 flex 链全部被
// 内容撑开，.chat-message-list 永远拿不到约束高度，无法成为滚动容器。
//
// happy-dom 没有布局引擎（clientHeight/scrollHeight 恒为 0），
// 无法做真实布局断言，因此这里用"样式源码契约"锁定滚动容器
// 成立的每一环，防止回归。
// ============================================================

function styleBlockOf(file: string): string {
  const src = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf-8')
  const start = src.indexOf('<style')
  if (start === -1) throw new Error(`No <style> block in ${file}`)
  return src.slice(start)
}

const agentViewStyle = styleBlockOf('../views/AgentView.vue')
const messageListStyle = styleBlockOf('../components/agent/ChatMessageList.vue')

describe('Agent 页面滚动布局契约', () => {
  it('.agent-page 必须有确定高度 height: 100vh（仅有 min-height 会让 flex-basis: 0% 退化为内容尺寸，页面随消息增长）', () => {
    // 负向前瞻排除 min-height 等复合属性名的误匹配
    expect(agentViewStyle).toMatch(/\.agent-page\s*\{[^}]*(?<![\w-])height:\s*100vh/s)
  })

  it('.agent-layout 必须 overflow: hidden 截断溢出', () => {
    expect(agentViewStyle).toMatch(/\.agent-layout\s*\{[^}]*overflow:\s*hidden/s)
  })

  it('.chat-main 必须 min-height: 0 允许在 flex 列中收缩', () => {
    expect(agentViewStyle).toMatch(/\.chat-main\s*\{[^}]*min-height:\s*0/s)
  })

  it('.chat-message-list 必须是滚动容器：flex: 1 + overflow-y: auto + min-height: 0', () => {
    expect(messageListStyle).toMatch(/\.chat-message-list\s*\{[^}]*flex:\s*1/s)
    expect(messageListStyle).toMatch(/\.chat-message-list\s*\{[^}]*overflow-y:\s*auto/s)
    expect(messageListStyle).toMatch(/\.chat-message-list\s*\{[^}]*min-height:\s*0/s)
  })
})
