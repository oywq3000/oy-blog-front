import { describe, it, expect, vi, beforeEach } from 'vitest'
import './profile-tabs-localstorage-setup'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import en from '../locales/en'
import zh from '../locales/zh'
import UserProfile from '../views/UserProfile.vue'
import { getFavoriteArticles, getReadingHistory, unfavoriteArticle, getMyStats } from '../api/article'
import { updatePassword } from '../api/auth'

// ============================================================
// UserProfile 收藏 / 历史 / 设置 组件行为测试
// ============================================================

vi.mock('../api/article', () => ({
  getFavoriteArticles: vi.fn(),
  getReadingHistory: vi.fn(),
  unfavoriteArticle: vi.fn(),
  getMyStats: vi.fn(),
}))

vi.mock('../api/auth', () => ({
  requestEmailVerification: vi.fn(),
  updateUserInfo: vi.fn(),
  updatePassword: vi.fn(),
  getUserInfo: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../api/upload', () => ({
  uploadAvatar: vi.fn(),
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, zh },
})

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'profile', component: { template: '<div />' } },
      { path: '/article/:id', name: 'article-detail', component: { template: '<div />' } },
    ],
  })

const makeArticle = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  title: 'Article One',
  authorId: 'u2',
  status: 'published',
  summary: 'Summary one',
  visibility: 'public',
  isTop: 0,
  slug: 'one',
  coverUrl: '',
  language: 'zh',
  allowComment: 1,
  publishAt: '2026-08-01 12:00:00',
  createdAt: '2026-08-01 12:00:00',
  updatedAt: '2026-08-01 12:00:00',
  viewCount: 10,
  likeCount: 2,
  favorites: 3,
  authorName: 'author-x',
  authorAvatar: '',
  ...over,
})

const mountProfile = async () => {
  const router = makeRouter()
  router.push('/profile')
  await router.isReady()
  const wrapper = mount(UserProfile, {
    global: { plugins: [i18n, router] },
  })
  await flushPromises()
  return wrapper
}

// 切换顶部 tab（0 收藏 / 1 历史 / 2 设置），并等待数据加载
const switchMainTab = async (wrapper: ReturnType<typeof mount>, index: number) => {
  await wrapper.findAll('.tab-btn')[index].trigger('click')
  await flushPromises()
}

describe('UserProfile 收藏 tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    if (typeof window.alert !== 'function') {
      Object.defineProperty(window, 'alert', { value: vi.fn(), configurable: true, writable: true })
    }
    ;(getFavoriteArticles as any).mockResolvedValue({
      isSuccess: true, errCode: 200, errMsg: '',
      data: [makeArticle({ id: 'a1', title: 'Fav One' }), makeArticle({ id: 'a2', title: 'Fav Two' })],
    })
    ;(getReadingHistory as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: [] })
    ;(getMyStats as any).mockResolvedValue({
      isSuccess: true, errCode: 200, errMsg: '',
      data: { articleCount: 3, likeCount: 4, favoriteCount: 5 },
    })
    ;(unfavoriteArticle as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: null })
    ;(updatePassword as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: null })
  })

  it('挂载后加载并渲染收藏文章', async () => {
    const wrapper = await mountProfile()

    expect(getFavoriteArticles).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Fav One')
    expect(wrapper.text()).toContain('Fav Two')
  })

  it('点击取消收藏调用接口并从列表移除', async () => {
    const wrapper = await mountProfile()

    await wrapper.find('.unfavorite-btn').trigger('click')
    await flushPromises()

    expect(unfavoriteArticle).toHaveBeenCalledWith('a1')
    expect(wrapper.text()).not.toContain('Fav One')
    expect(wrapper.text()).toContain('Fav Two') // 其余收藏保留
  })

  it('侧边栏统计来自 getMyStats', async () => {
    const wrapper = await mountProfile()

    expect(getMyStats).toHaveBeenCalledTimes(1)
    const stats = wrapper.find('.stats-row')
    expect(stats.text()).toContain('3') // articles
    expect(stats.text()).toContain('4') // likes
    expect(stats.text()).toContain('5') // favorites
  })
})

describe('UserProfile 历史 tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    ;(getFavoriteArticles as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: [] })
    ;(getReadingHistory as any).mockResolvedValue({
      isSuccess: true, errCode: 200, errMsg: '',
      data: [makeArticle({ id: 'h1', title: 'History One', viewedAt: '2026-08-10 10:00:00' })],
    })
    ;(getMyStats as any).mockResolvedValue({
      isSuccess: true, errCode: 200, errMsg: '',
      data: { articleCount: 0, likeCount: 0, favoriteCount: 0 },
    })
    ;(unfavoriteArticle as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: null })
    ;(updatePassword as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: null })
  })

  it('切换到历史 tab 时加载浏览历史并渲染', async () => {
    const wrapper = await mountProfile()

    await switchMainTab(wrapper, 1)

    expect(getReadingHistory).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('History One')
    expect(wrapper.find('.history-item').exists()).toBe(true)
    expect(wrapper.find('.view-btn').exists()).toBe(true) // 再次阅读按钮
  })

  it('再次阅读跳转到文章详情', async () => {
    const wrapper = await mountProfile()
    await switchMainTab(wrapper, 1)

    await wrapper.find('.view-btn').trigger('click')
    await flushPromises()

    const route = (wrapper.vm as any).$router.currentRoute.value
    expect(route.name).toBe('article-detail')
    expect(route.params.id).toBe('h1')
  })
})

describe('UserProfile 设置 tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    if (typeof window.alert !== 'function') {
      Object.defineProperty(window, 'alert', { value: vi.fn(), configurable: true, writable: true })
    }
    ;(getFavoriteArticles as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: [] })
    ;(getReadingHistory as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: [] })
    ;(getMyStats as any).mockResolvedValue({
      isSuccess: true, errCode: 200, errMsg: '',
      data: { articleCount: 0, likeCount: 0, favoriteCount: 0 },
    })
    ;(unfavoriteArticle as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: null })
    ;(updatePassword as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: null })
  })

  const openSettings = async (wrapper: ReturnType<typeof mount>, subIndex: number) => {
    await switchMainTab(wrapper, 2)
    await wrapper.findAll('.setting-tab-btn')[subIndex].trigger('click')
    await flushPromises()
  }

  it('修改密码调用 updatePassword 接口并清空表单', async () => {
    const wrapper = await mountProfile()
    await openSettings(wrapper, 1) // security

    const inputs = wrapper.findAll('input[type="password"]')
    expect(inputs).toHaveLength(3)
    await inputs[0].setValue('OldPass123')
    await inputs[1].setValue('NewPass123')
    await inputs[2].setValue('NewPass123')

    await wrapper.find('.btn-primary.full-width').trigger('click')
    await flushPromises()

    expect(updatePassword).toHaveBeenCalledWith({
      oldPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    })
    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    expect((inputs[1].element as HTMLInputElement).value).toBe('')
  })

  it('密码不合法时不调用接口', async () => {
    const wrapper = await mountProfile()
    await openSettings(wrapper, 1)

    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('OldPass123')
    await inputs[1].setValue('weak') // 无大写/数字
    await inputs[2].setValue('weak')

    await wrapper.find('.btn-primary.full-width').trigger('click')
    await flushPromises()

    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('减弱动效开关写入 localStorage 并切换 html class', async () => {
    const wrapper = await mountProfile()
    await openSettings(wrapper, 2) // appearance

    const checkbox = wrapper.findAll('input[type="checkbox"]')[0]
    await checkbox.setValue(true)

    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
    expect(localStorage.getItem('reduced-motion')).toBe('true')

    await checkbox.setValue(false)
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false)
    expect(localStorage.getItem('reduced-motion')).toBe('false')
  })

  it('通知开关持久化到 localStorage', async () => {
    const wrapper = await mountProfile()
    await openSettings(wrapper, 3) // notifications

    const checks = wrapper.findAll('input[type="checkbox"]')
    expect(checks).toHaveLength(2)
    await checks[0].setValue(false)

    const prefs = JSON.parse(localStorage.getItem('notification-prefs') || '{}')
    expect(prefs.emailDigest).toBe(false)
    expect(prefs.newComments).toBe(true)

    await checks[0].setValue(true)
    const prefs2 = JSON.parse(localStorage.getItem('notification-prefs') || '{}')
    expect(prefs2.emailDigest).toBe(true)
  })
})
