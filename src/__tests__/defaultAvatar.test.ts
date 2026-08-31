import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleCard from '../components/ArticleCard.vue'
import SearchArticleCard from '../components/SearchArticleCard.vue'
import FeaturedCard from '../components/FeaturedCard.vue'
import UserProfile from '../views/UserProfile.vue'

// --- 全局依赖 mock（router / i18n）---
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, d: (v: unknown) => String(v) }),
}))

// --- UserProfile 依赖 mock ---
const mockUser = vi.hoisted(() => ({
  value: {
    id: '1',
    username: 'tester',
    email: 'tester@example.com',
    emailVerified: false,
    bio: '',
    avatarUrl: '', // 无头像 → 应渲染默认头像
    createdAt: '2026-01-01',
  },
}))
vi.mock('../store/user', () => ({
  useUserStore: () => ({
    user: mockUser,
    fetchUserInfo: vi.fn(),
  }),
}))
vi.mock('../api/auth', () => ({
  requestEmailVerification: vi.fn().mockResolvedValue({ isSuccess: false }),
  updateUserInfo: vi.fn().mockResolvedValue({ isSuccess: true }),
  updatePassword: vi.fn().mockResolvedValue({ isSuccess: true }),
}))
vi.mock('../api/upload', () => ({
  uploadAvatar: vi.fn().mockResolvedValue({ isSuccess: true, data: '' }),
}))
vi.mock('../api/article', () => ({
  getFavoriteArticles: vi.fn().mockResolvedValue({ isSuccess: true, data: [] }),
  getReadingHistory: vi.fn().mockResolvedValue({ isSuccess: true, data: [] }),
  unfavoriteArticle: vi.fn().mockResolvedValue({ isSuccess: true }),
  getMyStats: vi.fn().mockResolvedValue({ isSuccess: true, data: null }),
  getMyHeatmap: vi.fn().mockResolvedValue({ isSuccess: true, data: [] }),
}))
vi.mock('../composables/useTheme', () => ({
  useTheme: () => ({ theme: { value: 'light' }, themePreference: { value: 'light' }, setThemePreference: vi.fn() }),
}))
vi.mock('../composables/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

// 需求：默认头像统一为 ArticleDetail 中的朴素 IconUser（灰色底 + 人物剪影），
// 不再是 AvatarGenerator 那种渐变/发光/旋转环的华丽风格。
describe('默认头像：朴素 IconUser（对齐 ArticleDetail）', () => {
  it('ArticleCard 无作者头像时渲染朴素默认头像，不渲染华丽 AvatarGenerator', () => {
    const wrapper = mount(ArticleCard, {
      props: { id: 1, title: '测试', summary: '摘要', publishAt: '2026-08-01', authorName: 'Alice' },
    })
    expect(wrapper.find('.avatar-generator').exists()).toBe(false)
    expect(wrapper.find('.default-avatar').exists()).toBe(true)
  })

  it('SearchArticleCard 无作者头像时渲染朴素默认头像', () => {
    const wrapper = mount(SearchArticleCard, {
      props: { id: 1, title: '测试', summary: '摘要', date: '2026-08-01', authorName: 'Bob' },
    })
    expect(wrapper.find('.avatar-generator').exists()).toBe(false)
    expect(wrapper.find('.default-avatar').exists()).toBe(true)
  })

  it('FeaturedCard 无作者头像时渲染朴素默认头像', () => {
    const wrapper = mount(FeaturedCard, {
      props: { id: 1, title: '测试', summary: '摘要', date: '2026-08-01', authorName: 'Carol' },
    })
    expect(wrapper.find('.avatar-generator').exists()).toBe(false)
    expect(wrapper.find('.default-avatar').exists()).toBe(true)
  })

  it('UserProfile 个人中心无头像时渲染朴素默认头像', () => {
    const wrapper = mount(UserProfile)
    expect(wrapper.find('.avatar-generator').exists()).toBe(false)
    expect(wrapper.find('.default-avatar').exists()).toBe(true)
  })
})
