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

/**
 * 身份切换残留回归测试。
 *
 * 背景：useAgentChat 状态是模块级单例，跨越登录态存续。用户退出登录（变为游客）
 * 后重新进入 Agent 页，上一用户的 conversations/activeConversationId/messagesMap
 * 若不重置，聊天记录会残留，且发送消息引用已不属于当前身份的 session，
 * 后端报"该Session不存在"。
 */
describe('身份切换：resetState 与 loadConversations 调和', () => {
  it('should clear all agent chat state on resetState', async () => {
    // Arrange: 构造上一登录用户残留的会话状态
    chatApi.conversations.value = [
      {
        id: 'conv-1',
        title: '旧会话',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        messageCount: 1,
      },
    ];
    chatApi.activeConversationId.value = 'conv-1';
    chatApi.messagesMap.value.set('conv-1', [
      { id: 'm1', role: 'user', content: '残留消息', createdAt: '2026-08-01T00:00:00Z' },
    ]);
    chatApi.streaming.value = true;
    chatApi.loading.value = true;
    chatApi.sidebarSearch.value = 'x';

    // Act
    chatApi.resetState();

    // Assert
    expect(chatApi.conversations.value).toEqual([]);
    expect(chatApi.activeConversationId.value).toBeNull();
    expect(chatApi.messagesMap.value.size).toBe(0);
    expect(chatApi.streaming.value).toBe(false);
    expect(chatApi.loading.value).toBe(false);
    expect(chatApi.sidebarSearch.value).toBe('');
    expect(chatApi.activeMessages.value).toEqual([]);
  });

  it('should clear stale active conversation and its cached messages after identity change (logout → guest)', async () => {
    // Arrange: 上一身份加载并激活了一个会话
    const api = await import('../api/agent');
    const getConversations = api.getConversations as ReturnType<typeof vi.fn>;
    getConversations.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'conv-1',
            title: '旧会话',
            createdAt: '2026-08-01T00:00:00Z',
            updatedAt: '2026-08-01T00:00:00Z',
            messageCount: 0,
          },
        ],
        total: 1,
        currentPage: 1,
        totalPages: 1,
      },
    });
    await chatApi.loadConversations();
    chatApi.activeConversationId.value = 'conv-1';
    chatApi.messagesMap.value.set('conv-1', [
      { id: 'm1', role: 'user', content: '残留消息', createdAt: '2026-08-01T00:00:00Z' },
    ]);

    // Act: 身份切换为游客（无任何会话）
    getConversations.mockResolvedValueOnce({
      data: { data: [], total: 0, currentPage: 1, totalPages: 0 },
    });
    await chatApi.loadConversations();

    // Assert: 残留会话被调和清除，回到空态（Welcome 页）
    expect(chatApi.activeConversationId.value).toBeNull();
    expect(chatApi.messagesMap.value.has('conv-1')).toBe(false);
    expect(chatApi.activeMessages.value).toEqual([]);
  });
});
