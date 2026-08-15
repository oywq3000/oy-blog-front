import { describe, it, expect, beforeEach } from 'vitest'
import service from '../api/request'

// ============================================================
// request.ts 401 → 刷新 → 重试 链路测试
//
// 背景：点击退出登录时，若 access token 已过期但刷新仍成功，
// 重试的 logout 再次 401 会再次触发刷新 —— 无限循环（网关日志可复现）。
// 期望：重试过一次的请求再次 401 时，必须放弃并通知"未授权"，
// 而不是继续刷新。
// ============================================================

const LOGOUT_URL = '/api/user-service/auth/logout'
const REFRESH_URL = '/api/user-service/auth/refresh'

interface AdapterState {
  refreshCalls: { value: number }
  getLogoutCalls: () => number
}

function installMockAdapter(handlers: {
  onRefresh: (config: any) => any
  onLogout: (config: any, callIndex: number) => any
}): AdapterState {
  let logoutCalls = 0
  const refreshCalls = { value: 0 }

  const adapter = async (config: any) => {
    if (config.url?.includes(REFRESH_URL)) {
      refreshCalls.value++
      return handlers.onRefresh(config)
    }
    if (config.url?.includes(LOGOUT_URL)) {
      logoutCalls++
      return handlers.onLogout(config, logoutCalls)
    }
    throw new Error('Unexpected URL: ' + config.url)
  }
  ;(service.defaults as any).adapter = adapter
  return { refreshCalls, getLogoutCalls: () => logoutCalls }
}

/** 构造一个带 config 和 401 response 的 axios 风格错误 */
function unauthorizedError(config: any) {
  const err: any = new Error('Request failed with status code 401')
  err.config = config
  err.response = { status: 401, data: { errMsg: 'Token无效或已过期，请重新登录' } }
  return err
}

/** 构造一个 axios 风格成功响应，响应体为 body */
function okResponse(body: any) {
  return { data: body, status: 200, statusText: 'OK', headers: {}, config: {} }
}

function refreshSuccessBody() {
  return {
    isSuccess: true,
    errCode: 200,
    errMsg: '成功',
    data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
  }
}

describe('request 401 refresh/retry flow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should stop retrying when the retried request 401s again (no infinite refresh)', async () => {
    // Arrange —— 死循环场景：logout 永远 401，但 refresh 永远成功
    localStorage.setItem('token', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    const { refreshCalls, getLogoutCalls } = installMockAdapter({
      onRefresh: () => okResponse(refreshSuccessBody()),
      onLogout: (config) => {
        throw unauthorizedError(config)
      },
    })
    let unauthorizedEvents = 0
    window.addEventListener('auth:unauthorized', () => unauthorizedEvents++)

    // Act
    await expect(service.post(LOGOUT_URL)).rejects.toThrow()

    // Assert —— 只允许刷新一次；再次 401 时放弃，而不是无限循环
    expect(refreshCalls.value).toBe(1)
    expect(getLogoutCalls()).toBe(2) // 原始请求 + 一次重试
    expect(unauthorizedEvents).toBe(1)
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  }, 5000)

  it('should refresh once and resolve when the retried request succeeds', async () => {
    // Arrange —— 正常场景：refresh 成功拿到新 token，重试 logout 成功
    localStorage.setItem('token', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    const { refreshCalls, getLogoutCalls } = installMockAdapter({
      onRefresh: () => okResponse(refreshSuccessBody()),
      onLogout: (config, callIndex) => {
        if (callIndex === 1) throw unauthorizedError(config)
        return okResponse({ isSuccess: true, errCode: 200, errMsg: '成功', data: true })
      },
    })

    // Act
    const res = await service.post(LOGOUT_URL)

    // Assert
    expect(res).toEqual({ isSuccess: true, errCode: 200, errMsg: '成功', data: true })
    expect(refreshCalls.value).toBe(1)
    expect(getLogoutCalls()).toBe(2)
    expect(localStorage.getItem('token')).toBe('new-access')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')
  })

  it('should clear tokens and give up when refresh fails', async () => {
    // Arrange —— 刷新失败：清理本地凭证并通知未授权，不重试原请求
    localStorage.setItem('token', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    const { refreshCalls, getLogoutCalls } = installMockAdapter({
      onRefresh: () =>
        okResponse({ isSuccess: false, errCode: 500, errMsg: '刷新令牌无效，请重新登录' }),
      onLogout: (config) => {
        throw unauthorizedError(config)
      },
    })
    let unauthorizedEvents = 0
    window.addEventListener('auth:unauthorized', () => unauthorizedEvents++)

    // Act
    await expect(service.post(LOGOUT_URL)).rejects.toThrow()

    // Assert
    expect(refreshCalls.value).toBe(1)
    expect(getLogoutCalls()).toBe(1)
    expect(unauthorizedEvents).toBe(1)
    expect(localStorage.getItem('token')).toBeNull()
  })
})
