import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import FloatingAssistant from './FloatingAssistant.vue'
import { FLOATING_HINT_KEY, useFloatingAssistant } from '../../composables/useFloatingAssistant'

function makeRouter(initial: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: {} },
      { path: '/agent', name: 'agent', component: {} },
    ],
  })
  router.push(initial)
  return router
}

let wrapper: ReturnType<typeof mount> | null = null

async function mountAssistant(initial = '/') {
  const router = makeRouter(initial)
  await router.isReady()
  wrapper = mount(FloatingAssistant, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: { FloatingChatPanel: true },
    },
  })
  return { wrapper, router }
}

// 组件根是 <Teleport to="body">，wrapper.find 摸不到 teleport 出去的内容；
// 与 agentModelSettings.test.ts 处理弹窗一致，直接查 document.body
const ball = () => document.body.querySelector<HTMLButtonElement>('.floating-ball')
const hint = () => document.body.querySelector<HTMLElement>('.floating-hint')

async function clickBall() {
  const el = document.body.querySelector<HTMLButtonElement>('.floating-ball')
  expect(el).not.toBeNull()
  el!.click()
  await nextTick()
}

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.removeItem(FLOATING_HINT_KEY)
  useFloatingAssistant().closePanel() // 模块级单例倒干净
})

afterEach(() => {
  wrapper?.unmount() // 触发 onBeforeUnmount：解绑侦听、断开 observer、清 hint 定时器
  wrapper = null
  document.body.innerHTML = ''
})

describe('FloatingAssistant 悬浮助手', () => {
  it('默认收起：球在、面板关（aria-expanded=false）', async () => {
    await mountAssistant()
    expect(ball()).not.toBeNull()
    expect(ball()!.getAttribute('aria-expanded')).toBe('false')
  })

  it('点球开/关面板', async () => {
    await mountAssistant()
    await clickBall()
    expect(ball()!.getAttribute('aria-expanded')).toBe('true')
    await clickBall()
    expect(ball()!.getAttribute('aria-expanded')).toBe('false')
  })

  it('ESC 收起面板', async () => {
    await mountAssistant()
    await clickBall()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(ball()!.getAttribute('aria-expanded')).toBe('false')
  })

  it('点击面板外部收起', async () => {
    await mountAssistant()
    await clickBall()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(ball()!.getAttribute('aria-expanded')).toBe('false')
  })

  it('首访气泡：首次显示，点球后标记已见并消失', async () => {
    await mountAssistant()
    expect(hint()).not.toBeNull()
    await clickBall()
    expect(hint()).toBeNull()
    expect(localStorage.getItem(FLOATING_HINT_KEY)).toBe('1')
  })

  it('已见过则不再显示气泡', async () => {
    localStorage.setItem(FLOATING_HINT_KEY, '1')
    await mountAssistant()
    expect(hint()).toBeNull()
  })

  it('/agent 全屏页隐藏整个浮球', async () => {
    await mountAssistant('/agent')
    expect(ball()).toBeNull()
  })

  // 以下两条用真实 FloatingChatPanel（不 stub），验证 Fix 2 的 .settings-overlay 守卫
  it('设置弹窗打开时，点弹窗控件不收起面板', async () => {
    localStorage.setItem(FLOATING_HINT_KEY, '1') // 避免首访气泡干扰
    const router = makeRouter('/')
    await router.isReady()
    const wrapper = mount(FloatingAssistant, {
      attachTo: document.body,
      global: { plugins: [router] }, // 不 stub FloatingChatPanel
    })
    // 开面板
    document.body.querySelector('.floating-ball')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    // 打开设置弹窗
    document.body.querySelector('.floating-panel__settings')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(document.body.querySelector('.settings-overlay')).toBeTruthy()
    // 点弹窗内部控件（温度滑杆所在 field）
    document.body.querySelector('.settings-field')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    // 面板保持展开
    expect(document.body.querySelector('.floating-ball')!.getAttribute('aria-expanded')).toBe('true')
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('设置弹窗打开时，ESC 不收起面板', async () => {
    localStorage.setItem(FLOATING_HINT_KEY, '1')
    const router = makeRouter('/')
    await router.isReady()
    const wrapper = mount(FloatingAssistant, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    document.body.querySelector('.floating-ball')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    document.body.querySelector('.floating-panel__settings')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(document.body.querySelector('.floating-ball')!.getAttribute('aria-expanded')).toBe('true')
    wrapper.unmount()
    document.body.innerHTML = ''
  })
})