import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { useAgentChat as UseAgentChatReturn } from './useAgentChat';

// useAgentChat 是模块级单例且顶层 import agentApi，测试中 mock 掉以避免真实请求
vi.mock('../api/agent', () => ({
  getConversations: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  getMessages: vi.fn(() => Promise.resolve([])),
  deleteConversation: vi.fn(() => Promise.resolve()),
  renameConversation: vi.fn(() => Promise.resolve()),
  stopGeneration: vi.fn(() => Promise.resolve()),
  getSuggestedQuestions: vi.fn(() => Promise.resolve([])),
  submitFeedback: vi.fn(() => Promise.resolve()),
}));

/**
 * SSE 游客会话回归测试。
 *
 * 背景：游客 agent 会话完全依赖后端 GUEST_ID cookie 关联（网关白名单放行、
 * 按 guestId 归属会话）。streamChat 用原生 fetch，必须显式携带 cookie——
 * 同源默认会带，但显式 credentials: 'same-origin' 防止未来 SSE URL 跨域改动
 * 导致游客会话静默失联。
 * 另：SSE 走 raw fetch（不经 axios 拦截器），401 必须只内联报错、不触发登录弹窗。
 */

let fetchMock: ReturnType<typeof vi.fn>;
let chatApi: ReturnType<typeof UseAgentChatReturn>;

const ssePayload =
  'event: token\ndata: {"content":"hi"}\n\nevent: done\ndata: {"messageId":"m1"}\n\n';

const makeSseResponse = (ok = true) => {
  if (ok) {
    const encoder = new TextEncoder();
    return {
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(ssePayload));
          controller.close();
        },
      }),
      text: async () => '',
    };
  }
  return { ok: false, status: 401, body: null, text: async () => 'Unauthorized' };
};

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules(); // 模块单例：每用例重建，隔离顶层状态
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  chatApi = (await import('./useAgentChat')).useAgentChat();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SSE 游客会话（GUEST_ID cookie 关联）', () => {
  it('should send SSE request with credentials: same-origin as guest', async () => {
    fetchMock.mockResolvedValue(makeSseResponse(true));

    await chatApi.sendMessage('你好');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe('same-origin');
  });

  it('should keep credentials: same-origin and attach token when logged in', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('userInfo', '{"id":1}');
    fetchMock.mockResolvedValue(makeSseResponse(true));

    await chatApi.sendMessage('你好');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe('same-origin');
    expect(options.headers).toMatchObject({ Authorization: 'Bearer t' });
  });

  it('should surface SSE 401 inline without dispatching auth:unauthorized', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    fetchMock.mockResolvedValue(makeSseResponse(false));

    await chatApi.sendMessage('你好');

    const assistant = chatApi.activeMessages.value.find(m => m.role === 'assistant');
    expect(assistant?.error).toBe(true);
    expect(assistant?.errorMessage).toContain('401');
    const unauthorized = spy.mock.calls.filter(
      ([event]) => event.type === 'auth:unauthorized'
    );
    expect(unauthorized).toHaveLength(0);
  });
});
