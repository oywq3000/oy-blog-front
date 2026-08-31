import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewReasonModal from '../components/ReviewReasonModal.vue'
import type { ArticleInfo } from '../api/article'

const mocks = { $t: (key: string) => key }

const article: ArticleInfo = {
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
  reviewStatus: 'rejected',
  reviewReason: '广告引流',
  publishAt: '',
  createdAt: '',
  updateAt: '',
}

function mountModal(articleProp: ArticleInfo | null = article) {
  return mount(ReviewReasonModal, {
    props: { article: articleProp },
    global: { mocks },
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ReviewReasonModal', () => {
  it('article 为 null 时不渲染弹窗', () => {
    mountModal(null)
    expect(document.body.querySelector('.review-modal-overlay')).toBeNull()
  })

  it('展示状态徽标、文章标题与审核理由', () => {
    const wrapper = mountModal()
    const modal = document.body.querySelector('.review-modal')!
    expect(modal.querySelector('.status-badge')!.textContent).toContain('已驳回')
    expect(modal.querySelector('.review-modal__article-title')!.textContent).toContain('测试文章')
    expect(modal.querySelector('.review-modal__reason-text')!.textContent).toContain('广告引流')
    wrapper.unmount()
  })

  it('无审核理由时展示占位文案', () => {
    const wrapper = mountModal({ ...article, reviewReason: '' })
    expect(document.body.querySelector('.review-modal__reason-text')!.textContent).toContain('creator.noReviewReason')
    wrapper.unmount()
  })

  it('点击 ✕ 触发 close', async () => {
    const wrapper = mountModal()
    ;(document.body.querySelector('.review-modal__close') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('点击遮罩触发 close', async () => {
    const wrapper = mountModal()
    ;(document.body.querySelector('.review-modal-overlay') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('按 Escape 触发 close', async () => {
    const wrapper = mountModal()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })
})
