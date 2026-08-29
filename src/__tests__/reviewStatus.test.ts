import { describe, expect, it } from 'vitest'
import { reviewStatusMeta, verdictFeedback } from '../utils/reviewStatus'

describe('reviewStatusMeta', () => {
  it('编辑审核中：published 且 ai_reviewing', () => {
    expect(reviewStatusMeta('ai_reviewing', 'published')).toEqual({ label: '编辑审核中', tone: 'warning' })
  })
  it('AI 审核中（新文章）', () => {
    expect(reviewStatusMeta('ai_reviewing', 'ai_reviewing')).toEqual({ label: 'AI 审核中', tone: 'info' })
  })
  it('待人工审核', () => {
    expect(reviewStatusMeta('manual', 'pending_review')).toEqual({ label: '待人工审核', tone: 'warning' })
  })
  it('已驳回（携带理由展示）', () => {
    expect(reviewStatusMeta('rejected', 'rejected')).toEqual({ label: '已驳回', tone: 'danger' })
  })
  it('approved/exempt 不显示徽标', () => {
    expect(reviewStatusMeta('approved', 'published')).toBeNull()
    expect(reviewStatusMeta('exempt', 'published')).toBeNull()
    expect(reviewStatusMeta(undefined, 'published')).toBeNull()
  })
})

describe('verdictFeedback', () => {
  it('ai_reviewing → 已提交审核', () => {
    expect(verdictFeedback('ai_reviewing')).toEqual({ text: '已提交 AI 审核，请稍候查看结果', tone: 'info' })
  })
  it('rejected → 驳回文案含原因', () => {
    expect(verdictFeedback('rejected', '广告引流')).toEqual({ text: '审核未通过：广告引流', tone: 'error' })
  })
  it('approved/exempt → 发布成功', () => {
    expect(verdictFeedback('approved')).toEqual({ text: '发布成功', tone: 'success' })
    expect(verdictFeedback('exempt')).toEqual({ text: '发布成功', tone: 'success' })
  })
  it('未知 verdict 兜底发布成功文案', () => {
    expect(verdictFeedback('unknown')).toEqual({ text: '发布成功', tone: 'success' })
  })
})
