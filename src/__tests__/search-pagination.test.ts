import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import en from '../locales/en'
import zh from '../locales/zh'
import SearchPage from '../views/SearchPage.vue'
import { searchArticles, type SearchParams } from '../api/article'

// ============================================================
// SearchPage 分页行为测试
// 后端 searchArticles 本身是服务端分页（pageNum/pageSize → 每页数据 + totalPages），
// 前端必须直接渲染返回的那一页，不得再本地切片（双重分页 bug）。
// 分页参数统一约定 pageNum/pageSize（与后端 search-service 一致）。
// ============================================================

vi.mock('../api/article', () => ({
  searchArticles: vi.fn(),
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
      { path: '/search', name: 'search', component: { template: '<div />' } },
      { path: '/article/:id', name: 'article-detail', component: { template: '<div />' } },
    ],
  })

const makeArticle = (id: string, title: string) => ({
  id,
  title,
  authorId: 'u1',
  status: 'published',
  summary: 'Summary',
  visibility: 'public',
  isTop: 0,
  slug: id,
  coverUrl: '',
  language: 'zh',
  allowComment: 1,
  publishAt: '2026-08-01 12:00:00',
  createdAt: '2026-08-01 12:00:00',
  updatedAt: '2026-08-01 12:00:00',
})

const TOTAL_PAGES = 3
const pageArticles = (page: number) =>
  Array.from({ length: 10 }, (_, i) => makeArticle(`p${page}-${i}`, `Article ${page}-${i + 1}`))

// 模拟真实网络延迟：让 router.push 的微任务先于响应完成，避免与 route watch 竞态
const mockServerPage = async (page: number) => {
  await new Promise((r) => setTimeout(r, 5))
  return {
    isSuccess: true,
    errCode: 200,
    errMsg: '',
    data: { total: 30, data: pageArticles(page), currentPage: page, totalPages: TOTAL_PAGES },
  }
}

const settle = async () => {
  await flushPromises()
  await new Promise((r) => setTimeout(r, 30))
}

const mountSearch = async () => {
  const router = makeRouter()
  router.push('/search')
  await router.isReady()
  const wrapper = mount(SearchPage, { global: { plugins: [i18n, router] } })
  await settle()
  return wrapper
}

describe('SearchPage 分页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(searchArticles).mockImplementation(async (params: SearchParams) =>
      mockServerPage(params.pageNum ?? 1)
    )
  })

  it('初始加载渲染服务端第 1 页的 10 条结果', async () => {
    const wrapper = await mountSearch()

    expect(wrapper.findAll('.article-row').length).toBe(10)
    expect(wrapper.text()).toContain('Article 1-1')
    expect(wrapper.find('.page-info').text()).toBe('1 / 3')
  })

  it('点击下一页后请求第 2 页并渲染第 2 页数据（双重分页 bug 回归）', async () => {
    const wrapper = await mountSearch()

    const buttons = wrapper.findAll('.page-btn')
    await buttons[1].trigger('click') // 下一页
    await settle()

    expect(wrapper.find('.page-info').text()).toBe('2 / 3')
    expect(wrapper.findAll('.article-row').length).toBe(10)
    expect(wrapper.text()).toContain('Article 2-1')
    expect(wrapper.text()).not.toContain('Article 1-1')
    // 服务端确实收到了 pageNum=2 的请求
    const lastCall = vi.mocked(searchArticles).mock.calls.at(-1)![0] as SearchParams
    expect(lastCall.pageNum).toBe(2)
  })

  it('翻到最后一页后下一页按钮禁用且不再请求', async () => {
    const wrapper = await mountSearch()

    const buttons = wrapper.findAll('.page-btn')
    await buttons[1].trigger('click') // → 第 2 页
    await settle()
    await wrapper.findAll('.page-btn')[1].trigger('click') // → 第 3 页
    await settle()

    expect(wrapper.find('.page-info').text()).toBe('3 / 3')
    const nextBtn = wrapper.findAll('.page-btn')[1]
    expect(nextBtn.attributes('disabled')).toBeDefined()
    const calls = vi.mocked(searchArticles).mock.calls.length
    await nextBtn.trigger('click')
    await settle()
    expect(vi.mocked(searchArticles).mock.calls.length).toBe(calls) // 未发起新请求
    expect(wrapper.find('.page-info').text()).toBe('3 / 3')
  })
})
