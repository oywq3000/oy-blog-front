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

  // 回归说明：小窗消息列表的滚动/自动吸底依赖 __body 是受约束的 flex 列
  // （块盒子下列表 flex:1 失效、按内容撑高，overflow-y:auto 无滚动、滚轮冒泡到页面）。
  // 该 CSS 布局契约无法在 happy-dom 断言（环境不注入 SFC scoped 样式、getComputedStyle 返回空串），
  // 由浏览器人工走查覆盖；样式改动时留意 FloatingChatPanel.vue 的 &__body 必须保持
  // display:flex; flex-direction:column（对照大屏 AgentView .chat-main 的同一模式）。
})