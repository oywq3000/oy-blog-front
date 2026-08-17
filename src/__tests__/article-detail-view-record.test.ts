import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import en from '../locales/en'
import zh from '../locales/zh'
import ArticleDetail from '../views/ArticleDetail.vue'
import {
  getArticleById,
  getArticleContent,
  getArticleChapters,
  recordArticleView,
} from '../api/article'

// ============================================================
// ArticleDetail 浏览记录（recordArticleView）行为测试
//
// 背景：旧实现用 sessionStorage `viewed_{id}` 做"同一标签页会话内
// 每篇文章只记一次"的去重，比后端 Redis 30 分钟计数窗口更严，导致：
// 1. 同一标签页内重读文章不再计数、浏览历史时间戳不刷新
// 2. 请求失败也打标，本会话永不重试
// 新行为：前端不做去重，每次进入详情页都发请求；
// 计数去重由后端 Redis 窗口兜底，历史刷新靠后端 upsert。
// ============================================================

vi.mock('../api/article', () => ({
  getArticleById: vi.fn(),
  getArticleContent: vi.fn(),
  getArticleChapters: vi.fn(),
  recordArticleView: vi.fn(),
  likeArticle: vi.fn(),
  unlikeArticle: vi.fn(),
  checkIsLiked: vi.fn(),
  checkIsFavorited: vi.fn(),
  favoriteArticle: vi.fn(),
  unfavoriteArticle: vi.fn(),
  checkArticleOwnership: vi.fn(),
}))

vi.mock('../api/comment', () => ({
  getComments: vi.fn(),
  getReplies: vi.fn(),
  addComment: vi.fn(),
  replyComment: vi.fn(),
  reactToComment: vi.fn(),
}))

vi.mock('../api/user', () => ({
  getUserPublicProfile: vi.fn(),
}))

vi.mock('../api/auth', () => ({
  getUserInfo: vi.fn(),
  logout: vi.fn(),
}))

import { getComments } from '../api/comment'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, zh },
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/article/:id', name: 'article-detail', component: { template: '<div />' } }],
})

const makeArticle = (id: string) => ({
  id,
  title: `Article ${id}`,
  summary: 'summary',
  publishAt: '2026-08-01 12:00:00',
  createdAt: '2026-08-01 12:00:00',
  viewCount: 10,
  likeCount: 2,
  favorites: 3,
  authorName: 'author-x',
  authorAvatar: '',
  tags: [],
})

const mountDetail = async (id: string) => {
  const wrapper = mount(ArticleDetail, {
    props: { id },
    global: {
      plugins: [i18n, router],
      stubs: { MarkdownViewer: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ArticleDetail 浏览记录', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()

    ;(getArticleById as any).mockImplementation((id: string) => ({
      isSuccess: true,
      errCode: 200,
      errMsg: '',
      data: makeArticle(id),
    }))
    ;(getArticleContent as any).mockResolvedValue({
      isSuccess: true,
      errCode: 200,
      errMsg: '',
      data: { contentMd: '# Title' },
    })
    ;(getArticleChapters as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: [] })
    ;(getComments as any).mockResolvedValue({
      isSuccess: true,
      errCode: 200,
      errMsg: '',
      data: { data: [], totalCommentCount: 0 },
    })
    ;(recordArticleView as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: 42 })
  })

  it('挂载加载文章后调用一次 recordArticleView', async () => {
    await mountDetail('a1')

    expect(recordArticleView).toHaveBeenCalledTimes(1)
    expect(recordArticleView).toHaveBeenCalledWith('a1')
  })

  it('成功响应后页面浏览量更新为后端返回的新计数', async () => {
    const wrapper = await mountDetail('a1')

    expect(wrapper.find('.views').text()).toContain('42')
  })

  it('路由 id 变化（A→B）后对 B 也记录一次浏览', async () => {
    const wrapper = await mountDetail('a1')
    expect(recordArticleView).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ id: 'b1' })
    await flushPromises()

    expect(recordArticleView).toHaveBeenCalledTimes(2)
    expect(recordArticleView).toHaveBeenLastCalledWith('b1')
  })

  it('同一标签页内重新进入同一文章仍再次记录（无 sessionStorage 会话级去重）', async () => {
    const first = await mountDetail('a1')
    expect(recordArticleView).toHaveBeenCalledTimes(1)
    first.unmount()

    const second = await mountDetail('a1')
    expect(recordArticleView).toHaveBeenCalledTimes(2)
    second.unmount()
  })

  it('记录请求失败时静默忽略，不影响后续浏览记录', async () => {
    ;(recordArticleView as any).mockRejectedValueOnce(new Error('network down'))

    const wrapper = await mountDetail('a1')
    // 失败后保持初始计数，不崩溃
    expect(wrapper.find('.views').text()).toContain('10')

    await wrapper.setProps({ id: 'b1' })
    await flushPromises()

    expect(recordArticleView).toHaveBeenCalledTimes(2)
    expect(recordArticleView).toHaveBeenLastCalledWith('b1')
  })
})
