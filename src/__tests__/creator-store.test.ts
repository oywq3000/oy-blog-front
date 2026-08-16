import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCreatorStore } from '../store/creator'
import { getMyArticles } from '../api/article'

// ============================================================
// Creator store 草稿计数测试
// 分页参数统一约定 pageNum/pageSize（与 MyArticlesParams 类型一致）
// ============================================================

vi.mock('../api/article', () => ({
  getMyArticles: vi.fn(),
}))

const makeResult = (total: number) => ({
  isSuccess: true,
  errCode: 200,
  errMsg: '',
  data: { total, data: [], currentPage: 1, totalPages: 1 },
})

describe('creator store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store = useCreatorStore()
    store.state.draftCount = 0
  })

  it('refreshDraftCount 使用统一分页参数 pageNum/pageSize', async () => {
    ;(getMyArticles as any).mockResolvedValue(makeResult(7))

    const store = useCreatorStore()
    await store.refreshDraftCount()

    expect(getMyArticles).toHaveBeenCalledWith({ status: 'draft', pageNum: 1, pageSize: 1 })
    expect(store.draftCount.value).toBe(7)
  })

  it('请求失败时 draftCount 保持 0', async () => {
    ;(getMyArticles as any).mockRejectedValue(new Error('network down'))

    const store = useCreatorStore()
    await store.refreshDraftCount()

    expect(store.draftCount.value).toBe(0)
  })

  it('decrementDraftCount 递减且不为负', async () => {
    ;(getMyArticles as any).mockResolvedValue(makeResult(1))

    const store = useCreatorStore()
    await store.refreshDraftCount()
    expect(store.draftCount.value).toBe(1)

    store.decrementDraftCount()
    expect(store.draftCount.value).toBe(0)

    store.decrementDraftCount()
    expect(store.draftCount.value).toBe(0)
  })
})
