import { describe, it, expect, beforeEach } from 'vitest'
import service from '../api/request'
import { getFavoriteArticles, getReadingHistory, unfavoriteArticle, getMyHeatmap } from '../api/article'

// ============================================================
// Profile 页收藏/历史 API 契约测试（adapter-mock 模式）
// ============================================================

describe('profile article APIs', () => {
  let calls: any[] = []

  beforeEach(() => {
    localStorage.clear()
    calls = []
    ;(service.defaults as any).adapter = async (config: any) => {
      calls.push(config)
      return {
        data: { isSuccess: true, errCode: 200, errMsg: 'OK', data: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
  })

  it('getFavoriteArticles should GET interaction/favorites', async () => {
    await getFavoriteArticles()

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/article-service/article/interaction/favorites')
    expect(calls[0].method).toBe('get')
  })

  it('getReadingHistory should GET read/history', async () => {
    await getReadingHistory()

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/article-service/article/read/history')
    expect(calls[0].method).toBe('get')
  })

  it('unfavoriteArticle should POST interaction/{articleId}/unfavorite', async () => {
    await unfavoriteArticle('a1')

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/article-service/article/interaction/a1/unfavorite')
    expect(calls[0].method).toBe('post')
  })

  it('getMyHeatmap should GET stats/heatmap/me', async () => {
    await getMyHeatmap()

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/article-service/article/stats/heatmap/me')
    expect(calls[0].method).toBe('get')
  })
})
