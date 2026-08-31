import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CreatorArticleTable from '../components/CreatorArticleTable.vue'
import ReviewReasonModal from '../components/ReviewReasonModal.vue'
import type { ArticleInfo } from '../api/article'

const mocks = { $t: (key: string) => key }

const articleRow: ArticleInfo = {
  id: '1',
  title: '测试文章',
  authorId: 'a',
  status: 'rejected',
  summary: '',
  visibility: 'public',
  isTop: 0,
  slug: '',
  coverUrl: '',
  language: 'zh',
  allowComment: 1,
  publishAt: '',
  createdAt: '',
  updateAt: '2026-08-31 10:00:00',
  reviewStatus: 'rejected',
  reviewReason: '广告引流',
}

function mountTable(options: { slot?: boolean; articles?: ArticleInfo[] } = {}) {
  return mount(CreatorArticleTable, {
    props: {
      articles: options.articles ?? [],
      status: 'reviewing',
      isLoading: false,
    },
    slots: options.slot ? { statusFilter: '<span>filter</span>' } : undefined,
    global: { mocks },
  })
}

// 回归：审核页表头含筛选下拉时，wrapper 需带 --no-clip，桌面端关闭滚动容器，
// 否则空表格（容器很矮）会裁切绝对定位的下拉菜单
describe('CreatorArticleTable 表头筛选插槽', () => {
  it('提供 statusFilter 插槽时，wrapper 带 --no-clip 类', () => {
    const wrapper = mountTable({ slot: true })
    expect(wrapper.get('.article-table-wrapper').classes()).toContain('article-table-wrapper--no-clip')
  })

  it('未提供插槽时（published/drafts），wrapper 不带 --no-clip', () => {
    const wrapper = mountTable()
    expect(wrapper.get('.article-table-wrapper').classes()).not.toContain('article-table-wrapper--no-clip')
  })
})

describe('CreatorArticleTable 审核状态徽标', () => {
  it('点击徽标弹出审核理由弹窗并传入该文章', async () => {
    const wrapper = mountTable({ slot: true, articles: [articleRow] })
    await wrapper.get('.status-badge').trigger('click')
    const modal = wrapper.findComponent(ReviewReasonModal)
    expect(modal.exists()).toBe(true)
    expect(modal.props('article')).toEqual(articleRow)
  })
})
