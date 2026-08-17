import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChatHistoryItem from '../components/agent/ChatHistoryItem.vue'
import { computeMenuPlacement } from '../components/agent/chatHistoryMenu'

// ============================================================
// 会话历史项 ··· 菜单交互测试
//
// 背景：旧交互是点击 ··· 后弹浏览器 prompt('输入 r 重命名，输入 d 删除')，
// 重命名用 prompt、删除用 confirm —— 全部是原生弹窗，体验很差。
// 新交互对标 DeepSeek：点击 ··· 在按钮旁弹出小菜单（重命名/删除），
// 重命名转为行内输入，删除为菜单内两步确认。
// ============================================================

// ============================================================
// 1. 菜单定位纯函数（anchor + flip + clamp）
// ============================================================
describe('computeMenuPlacement 菜单定位', () => {
  const trigger = { right: 200, bottom: 100 }
  const menuSize = { width: 120, height: 100 }
  const viewport = { width: 800, height: 600 }

  it('默认右对齐按钮、向下展开（right - width, bottom + gap）', () => {
    const p = computeMenuPlacement({ trigger, menuSize, viewport })
    expect(p.left).toBe(200 - 120)
    expect(p.top).toBe(100 + 4)
  })

  it('底部放不下时向上翻转（top = bottom - height - gap）', () => {
    const p = computeMenuPlacement({
      trigger: { right: 200, bottom: 590 },
      menuSize,
      viewport,
    })
    expect(p.top).toBe(590 - 100 - 4)
    expect(p.left).toBe(80)
  })

  it('向上翻转后仍越界时夹到视口内（不低于 margin）', () => {
    const p = computeMenuPlacement({
      trigger: { right: 200, bottom: 20 },
      menuSize,
      viewport,
    })
    expect(p.top).toBeGreaterThanOrEqual(8)
  })

  it('水平方向越界时夹到视口内（左侧 margin = 8）', () => {
    const p = computeMenuPlacement({
      trigger: { right: 40, bottom: 100 },
      menuSize,
      viewport,
    })
    expect(p.left).toBe(8)
  })

  it('水平方向靠右越界时夹回视口内（不超出 viewport.width - width - margin）', () => {
    const p = computeMenuPlacement({
      trigger: { right: 500, bottom: 100 },
      menuSize,
      viewport: { width: 320, height: 600 },
    })
    expect(p.left).toBeLessThanOrEqual(320 - 120 - 8)
  })

  it('尊重自定义 gap 与 margin', () => {
    const p = computeMenuPlacement({
      trigger,
      menuSize,
      viewport,
      gap: 10,
      margin: 16,
    })
    expect(p.left).toBe(80)
    expect(p.top).toBe(110)
  })
})

// ============================================================
// 2. ChatHistoryItem 组件交互测试
// ============================================================
describe('ChatHistoryItem ··· 菜单交互', () => {
  let wrapper: ReturnType<typeof mount>

  const mountItem = (props: Record<string, unknown> = {}) =>
    mount(ChatHistoryItem, {
      props: {
        id: 'c1',
        title: 'Vue3 响应式原理',
        messageCount: 3,
        isActive: false,
        ...props,
      },
      attachTo: document.body,
    })

  const openMenu = async () => {
    await wrapper.find('[aria-label="更多操作"]').trigger('click')
    await nextTick()
  }

  const menu = () => wrapper.find('[role="menu"]')

  const clickMenuItem = async (text: string) => {
    const items = wrapper.findAll('[role="menuitem"]')
    const target = items.find((i) => i.text().includes(text))
    expect(target, `菜单中应有“${text}”选项`).toBeTruthy()
    await target!.trigger('click')
    await nextTick()
  }

  beforeEach(() => {
    // 新交互必须完全摆脱原生 prompt/confirm
    vi.stubGlobal('prompt', vi.fn())
    vi.stubGlobal('confirm', vi.fn())
    wrapper = mountItem()
  })

  afterEach(() => {
    wrapper.unmount()
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('默认不显示菜单', () => {
    expect(menu().exists()).toBe(false)
  })

  it('点击 ··· 弹出菜单，包含“重命名”和“删除”两个选项，且不触发 select', async () => {
    await openMenu()

    expect(menu().exists()).toBe(true)
    const items = wrapper.findAll('[role="menuitem"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('重命名')
    expect(items[1].text()).toContain('删除')
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.find('[aria-label="更多操作"]').attributes('aria-expanded')).toBe('true')
  })

  it('再次点击 ··· 收起菜单', async () => {
    await openMenu()
    await wrapper.find('[aria-label="更多操作"]').trigger('click')
    await nextTick()

    expect(menu().exists()).toBe(false)
  })

  it('点击“重命名”后菜单关闭，标题变为行内输入框且预填原标题', async () => {
    await openMenu()
    await clickMenuItem('重命名')

    expect(menu().exists()).toBe(false)
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Vue3 响应式原理')
    expect(wrapper.find('.chat-history-item__title').exists()).toBe(false)
  })

  it('行内输入按 Enter 提交重命名，退出编辑态', async () => {
    await openMenu()
    await clickMenuItem('重命名')

    const input = wrapper.find('input')
    await input.setValue('新标题')
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.emitted('rename')?.[0]).toEqual(['c1', '新标题'])
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('行内输入失焦也提交重命名', async () => {
    await openMenu()
    await clickMenuItem('重命名')

    const input = wrapper.find('input')
    await input.setValue('失焦提交')
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.emitted('rename')?.[0]).toEqual(['c1', '失焦提交'])
  })

  it('标题为空白时不提交重命名', async () => {
    await openMenu()
    await clickMenuItem('重命名')

    const input = wrapper.find('input')
    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('行内输入按 Esc 取消编辑，不提交', async () => {
    await openMenu()
    await clickMenuItem('重命名')

    const input = wrapper.find('input')
    await input.setValue('不该提交')
    await input.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('点击“删除”先在菜单内两步确认，确认后才发出 delete', async () => {
    await openMenu()
    await clickMenuItem('删除')

    // 第一步：进入确认态，未发出 delete
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(menu().exists()).toBe(true)
    expect(wrapper.text()).toContain('确定删除')

    // 取消：回到普通菜单，仍未发出 delete
    await clickMenuItem('取消')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.text()).toContain('重命名')

    // 再次进入确认态并确认
    await clickMenuItem('删除')
    const confirmBtn = wrapper
      .findAll('[role="menuitem"]')
      .find((i) => i.text().includes('删除'))
    await confirmBtn!.trigger('click')
    await nextTick()

    expect(wrapper.emitted('delete')?.[0]).toEqual(['c1'])
    expect(menu().exists()).toBe(false)
  })

  it('按 Escape 关闭已打开的菜单', async () => {
    await openMenu()
    expect(menu().exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(menu().exists()).toBe(false)
  })

  it('点击菜单外部关闭菜单', async () => {
    await openMenu()
    expect(menu().exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(menu().exists()).toBe(false)
  })

  it('滚动列表时关闭菜单（防止菜单与条目脱节）', async () => {
    await openMenu()
    expect(menu().exists()).toBe(true)

    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(menu().exists()).toBe(false)
  })

  it('右键会话条目打开菜单，而不是浏览器右键菜单', async () => {
    await wrapper.trigger('contextmenu')
    await nextTick()

    expect(menu().exists()).toBe(true)
    expect(window.prompt).not.toHaveBeenCalled()
  })

  it('整个重命名与删除流程不出现任何原生 prompt/confirm 弹窗', async () => {
    await openMenu()
    await clickMenuItem('重命名')
    const input = wrapper.find('input')
    await input.setValue('优雅的新标题')
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()

    await openMenu()
    await clickMenuItem('删除')
    const confirmBtn = wrapper
      .findAll('[role="menuitem"]')
      .find((i) => i.text().includes('删除'))
    await confirmBtn!.trigger('click')
    await nextTick()

    expect(window.prompt).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()
    expect(wrapper.emitted('rename')?.[0]).toEqual(['c1', '优雅的新标题'])
    expect(wrapper.emitted('delete')?.[0]).toEqual(['c1'])
  })

  it('删除确认态下点击“取消”不发出 delete', async () => {
    await openMenu()
    await clickMenuItem('删除')
    await clickMenuItem('取消')

    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.text()).toContain('重命名')
  })
})
