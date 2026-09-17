import { describe, it, expect, beforeEach } from 'vitest'
import {
  isFloatingAssistantVisible,
  readHintSeen,
  markHintSeen,
  useFloatingAssistant,
  FLOATING_HINT_KEY,
} from './useFloatingAssistant'

beforeEach(() => {
  localStorage.removeItem(FLOATING_HINT_KEY)
  useFloatingAssistant().closePanel() // open 是模块级单例，倒干净
})

describe('isFloatingAssistantVisible', () => {
  it('全屏 AI 页隐藏', () => {
    expect(isFloatingAssistantVisible('agent')).toBe(false)
    expect(isFloatingAssistantVisible('agent-conversation')).toBe(false)
  })
  it('其余路由展示（含 null/undefined）', () => {
    expect(isFloatingAssistantVisible('home')).toBe(true)
    expect(isFloatingAssistantVisible(null)).toBe(true)
    expect(isFloatingAssistantVisible(undefined)).toBe(true)
  })
  it('编辑器全屏时隐藏', () => {
    expect(isFloatingAssistantVisible('article-detail', true)).toBe(false)
  })
})

describe('open/close 状态', () => {
  it('toggleOpen 往返切换', () => {
    const { open, toggleOpen } = useFloatingAssistant()
    expect(open.value).toBe(false)
    toggleOpen()
    expect(open.value).toBe(true)
    toggleOpen()
    expect(open.value).toBe(false)
  })
  it('openPanel / closePanel 定向设置', () => {
    const { open, openPanel, closePanel } = useFloatingAssistant()
    openPanel()
    expect(open.value).toBe(true)
    closePanel()
    expect(open.value).toBe(false)
  })
  it('setEditorFullscreen 更新信号', () => {
    const { editorFullscreen, setEditorFullscreen } = useFloatingAssistant()
    setEditorFullscreen(true)
    expect(editorFullscreen.value).toBe(true)
    setEditorFullscreen(false)
    expect(editorFullscreen.value).toBe(false)
  })
})

describe('首访气泡 localStorage', () => {
  it('未见过返回 false', () => {
    expect(readHintSeen()).toBe(false)
  })
  it('markHintSeen 后 readHintSeen 返回 true', () => {
    markHintSeen()
    expect(readHintSeen()).toBe(true)
  })
})