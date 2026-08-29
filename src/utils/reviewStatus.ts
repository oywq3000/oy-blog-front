/** 审核状态徽标映射。返回 null 表示不显示徽标。 */
export function reviewStatusMeta(
  reviewStatus: string | undefined,
  articleStatus: string | undefined
): { label: string; tone: 'info' | 'warning' | 'danger' } | null {
  if (!reviewStatus) return null
  // 已发布文章正在审编辑 → "编辑审核中"（旧版对外展示中）
  if (reviewStatus === 'ai_reviewing' && articleStatus === 'published') {
    return { label: '编辑审核中', tone: 'warning' }
  }
  switch (reviewStatus) {
    case 'ai_reviewing':
      return { label: 'AI 审核中', tone: 'info' }
    case 'manual':
      return { label: '待人工审核', tone: 'warning' }
    case 'rejected':
      return { label: '已驳回', tone: 'danger' }
    default:
      return null // approved/exempt 等正常状态不显示徽标
  }
}

/** publish 返回 verdict → 提示文案与色调 */
export function verdictFeedback(verdict: string, reason?: string): { text: string; tone: 'success' | 'error' | 'info' } {
  if (verdict === 'ai_reviewing') {
    return { text: '已提交 AI 审核，请稍候查看结果', tone: 'info' }
  }
  if (verdict === 'rejected') {
    return { text: reason ? `审核未通过：${reason}` : '审核未通过，请修改后重新提交', tone: 'error' }
  }
  // approved / exempt / 未知 → 发布成功
  return { text: '发布成功', tone: 'success' }
}
