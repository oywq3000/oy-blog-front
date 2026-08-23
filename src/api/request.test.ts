import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import service, { resetUnauthorizedNotify } from './request';

/**
 * auth:unauthorized 事件去重测试。
 *
 * 背景：agent 页等场景会并行发起多个请求（会话列表、推荐问题等），
 * 若会话过期，它们会同时 401，每个失败请求都会走 clearAuthAndNotify()，
 * 旧实现会派发多个 'auth:unauthorized' 事件 → NavBar 的 handleUnauthorized
 * 多次调用 openAuthModal()，弹窗层叠。
 *
 * 期望：同一时间窗口内的多次未授权只派发一次事件（复用 errorHandler
 * 的 toast 去重模式：DEDUPE_WINDOW_MS 窗口期去重，窗口过后视为新一轮）。
 */

const T0 = new Date('2026-08-23T00:00:00Z');

// 构造指定状态码拒绝的 axios adapter：不经网络，直接命中响应拦截器错误分支。
// 注意：axios 不会给拒绝的错误补 config，需在 adapter 内把合并后的 config 传给 AxiosError，
// 否则拦截器第一行 originalRequest.url 会抛 TypeError。
const rejectWith = (status: number, errMsg: string) => (config: any) =>
  Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      { status, data: { errMsg } } as any,
    ),
  );

const reject401 = rejectWith(401, 'Token expired');
const reject500 = rejectWith(500, 'Server error');

/** 统计 spy 上类型为 auth:unauthorized 的派发次数 */
const unauthorizedDispatchCount = (spy: { mock: { calls: Event[][] } }) =>
  spy.mock.calls.filter(([event]) => event.type === 'auth:unauthorized').length;

beforeEach(() => {
  localStorage.clear();
  resetUnauthorizedNotify();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('auth:unauthorized 事件派发', () => {
  it('should dispatch exactly one auth:unauthorized event for a single 401', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');

    await expect(service.get('/api/agent/chat/conversations', { adapter: reject401 })).rejects.toBeTruthy();

    expect(unauthorizedDispatchCount(spy)).toBe(1);
  });

  it('should dispatch auth:unauthorized only once when two concurrent requests fail with 401', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');

    await Promise.allSettled([
      service.get('/api/agent/chat/conversations', { adapter: reject401 }),
      service.get('/api/agent/chat/suggested', { adapter: reject401 }),
    ]);

    expect(unauthorizedDispatchCount(spy)).toBe(1);
  });

  it('should dispatch auth:unauthorized again after the dedupe window expires (new episode)', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    await service.get('/api/agent/chat/conversations', { adapter: reject401 }).catch(() => {});
    expect(unauthorizedDispatchCount(spy)).toBe(1);

    // 越过去重窗口后，新的 401 属于新一轮未授权，应再次通知（否则后续会话过期不再弹窗）
    vi.setSystemTime(T0.getTime() + 3000);
    await service.get('/api/agent/chat/conversations', { adapter: reject401 }).catch(() => {});

    expect(unauthorizedDispatchCount(spy)).toBe(2);
  });

  it('should NOT dispatch auth:unauthorized for a non-401 error', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');

    await service.get('/api/agent/chat/conversations', { adapter: reject500 }).catch(() => {});

    expect(unauthorizedDispatchCount(spy)).toBe(0);
  });
});
