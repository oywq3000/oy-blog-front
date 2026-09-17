import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatWelcome from './ChatWelcome.vue'

const suggestions = [{ icon: '💡', text: 'Q1' }]

function mountWelcome(compact = false) {
  return mount(ChatWelcome, {
    props: { suggestedQuestions: suggestions, compact },
  })
}

describe('ChatWelcome', () => {
  it('默认（全屏页）非紧凑', () => {
    expect(mountWelcome(false).classes()).not.toContain('chat-welcome--compact')
  })
  it('compact 时根元素挂 chat-welcome--compact', () => {
    expect(mountWelcome(true).classes()).toContain('chat-welcome--compact')
  })
  it('点击建议问题触发 questionClick', async () => {
    const w = mountWelcome(true)
    await w.find('.chat-welcome__chip').trigger('click')
    expect(w.emitted('questionClick')![0]).toEqual(['Q1'])
  })
})