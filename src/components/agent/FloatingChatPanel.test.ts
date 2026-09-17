import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FloatingChatPanel from './FloatingChatPanel.vue'
import ChatMessageList from './ChatMessageList.vue'
import { useAgentChat } from '../../composables/useAgentChat'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: {} },
      { path: '/agent', name: 'agent', component: {} },
      { path: '/agent/:conversationId', name: 'agent-conversation', component: {} },
    ],
  })
}

function mountPanel() {
  return mount(FloatingChatPanel, {
    global: { plugins: [makeRouter()] },
  })
}

beforeEach(() => {
  useAgentChat().clearAllConversations() // 单例状态倒干净
})

describe('FloatingChatPanel 悬浮小窗', () => {
  it('渲染头部标题（默认落地页为欢迎视图）', () => {
    const w = mountPanel()
    expect(w.find('.floating-panel').exists()).toBe(true)
    expect(w.find('.floating-panel__title').text()).toBe('OY AI 助手')
    expect(w.find('.chat-welcome').exists()).toBe(true)
  })

  it('展开全屏 → 无会话跳 /agent', async () => {
    const router = makeRouter()
    const w = mount(FloatingChatPanel, { global: { plugins: [router] } })
    await w.find('.floating-panel__expand').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/agent')
  })

  it('新对话按钮就地创建会话（无网络）并切到消息列表', async () => {
    const w = mountPanel()
    await w.find('.floating-panel__new').trigger('click')
    await flushPromises()
    expect(w.findComponent(ChatMessageList).exists()).toBe(true)
    expect(w.find('.chat-welcome').exists()).toBe(false)
  })

  it('收起按钮发出 close', async () => {
    const w = mountPanel()
    await w.find('.floating-panel__close').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})