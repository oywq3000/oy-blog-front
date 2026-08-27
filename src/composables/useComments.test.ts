import { describe, it, expect, vi, beforeEach } from 'vitest';

// useComments 是模块级单例且顶层 import api/comment，测试中 mock 掉避免真实请求
vi.mock('../api/comment', () => ({
  getComments: vi.fn(),
  getReplies: vi.fn(),
  addComment: vi.fn(),
  replyComment: vi.fn(),
  reactToComment: vi.fn(),
}));

import * as commentApi from '../api/comment';
import type { useComments as UseCommentsReturn } from './useComments';

type MockedApi = {
  getComments: ReturnType<typeof vi.fn>;
  getReplies: ReturnType<typeof vi.fn>;
  addComment: ReturnType<typeof vi.fn>;
  replyComment: ReturnType<typeof vi.fn>;
  reactToComment: ReturnType<typeof vi.fn>;
};
const mock = commentApi as unknown as MockedApi;

let api: ReturnType<typeof UseCommentsReturn>;

const ok = (data: any) => ({ errCode: 200, errMsg: '成功', isSuccess: true, data });

const rootComment = (over: Record<string, any> = {}) => ({
  id: 'c1',
  articleId: 'a1',
  userId: 'u1',
  content: 'root',
  floor: 1,
  isPinned: 0,
  hasReply: 1,
  commentAt: '2026-08-01 10:00:00',
  username: 'alice',
  avatar: '',
  isShow: true,
  likeCount: 2,
  dislikeCount: 0,
  userReaction: null,
  replyCount: 3,
  replies: null,
  ...over,
});

const reply = (over: Record<string, any> = {}) => ({
  id: 'r1',
  articleId: 'a1',
  commentId: 'c1',
  replyToReplyId: null,
  userId: 'u2',
  replyToUserId: 'u1',
  content: 'reply',
  replyAt: '2026-08-02 10:00:00',
  username: 'bob',
  avatar: '',
  replyToUsername: 'alice',
  isShow: true,
  likeCount: 0,
  dislikeCount: 0,
  userReaction: null,
  ...over,
});

beforeEach(async () => {
  vi.resetModules(); // 模块单例：每用例重建，隔离顶层状态
  vi.resetAllMocks(); // 连 mockResolvedValueOnce 队列一起清，避免用例间泄漏
  api = (await import('./useComments')).useComments();
  api.setArticleId('a1');
});

describe('addComment（发布评论，乐观插入不重载）', () => {
  it('成功后用返回实体插入列表顶部，不重新调用 getComments', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment()] }));
    mock.addComment.mockResolvedValue(ok(rootComment({ id: 'c9', content: 'new comment' })));
    await api.loadComments();
    expect(api.comments.value).toHaveLength(1);

    const result = await api.addComment('new comment');

    expect(result).toBe(true);
    expect(mock.getComments).toHaveBeenCalledTimes(1); // 未被重载
    expect(api.comments.value).toHaveLength(2);
    expect(api.comments.value[0].id).toBe('c9');
    expect(api.comments.value[0].content).toBe('new comment');
    expect(api.totalCommentCount.value).toBe(1); // 后续自增
  });

  it('失败时不插入新评论', async () => {
    mock.addComment.mockResolvedValue({ errCode: 500, errMsg: 'x', isSuccess: false, data: null });

    const result = await api.addComment('x');

    expect(result).toBe(false);
    expect(api.comments.value).toHaveLength(0);
  });
});

describe('submitReply（回复评论，增量更新不重载）', () => {
  it('追加到已缓存的末页，不重新拉取该页', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment({ replyCount: 3 })] }));
    mock.getReplies.mockResolvedValue(
      ok({ currentPage: 1, pageSize: 10, total: 3, totalPages: 1, data: [reply({ id: 'r1' }), reply({ id: 'r2' }), reply({ id: 'r3' })] })
    );
    mock.replyComment.mockResolvedValue(ok(reply({ id: 'r4', content: 'new reply' })));
    await api.loadComments();
    await api.fetchReplies('c1', 1);

    const result = await api.submitReply('c1', 'new reply');

    expect(result).toBe(true);
    expect(api.comments.value[0].replyCount).toBe(4);
    expect(mock.getReplies).toHaveBeenCalledTimes(1); // 命中缓存不重拉
    const replies = api.getReplyReplies('c1');
    expect(replies).toHaveLength(4);
    expect(replies[3].id).toBe('r4');
    expect(replies[3].content).toBe('new reply');
    // replyComment 以根评论 ID + 目标用户传递
    expect(mock.replyComment).toHaveBeenCalledWith('c1', 'new reply', 'a1', undefined, 'u1');
  });

  it('回复跨页（10→11）时 replyCount 更新、分页出现并自动跳转末页', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment({ replyCount: 10 })] }));
    mock.getReplies
      .mockResolvedValueOnce(
        ok({ currentPage: 1, pageSize: 10, total: 10, totalPages: 1, data: Array.from({ length: 10 }, (_, i) => reply({ id: `r${i}` })) })
      )
      .mockResolvedValueOnce(
        ok({ currentPage: 2, pageSize: 10, total: 11, totalPages: 2, data: [reply({ id: 'r10', content: '11th' })] })
      );
    mock.replyComment.mockResolvedValue(ok(reply({ id: 'r10', content: '11th' })));
    await api.loadComments();
    await api.fetchReplies('c1', 1);

    await api.submitReply('c1', '11th');

    expect(api.comments.value[0].replyCount).toBe(11);
    expect(Math.ceil((api.comments.value[0].replyCount ?? 0) / 10)).toBe(2); // 分页栏将出现
    expect(api.getReplyCurrentPage('c1')).toBe(2); // 自动跳末页
    expect(mock.getReplies).toHaveBeenLastCalledWith('c1', 2, 10);
    // 末页数据含新回复
    expect(api.getReplyReplies('c1')).toHaveLength(1);
    expect(api.getReplyReplies('c1')[0].content).toBe('11th');
  });
});

describe('fetchReplies（分页缓存）', () => {
  it('用响应 total 同步 replyCount（单一数据源）', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment({ replyCount: 3 })] }));
    mock.getReplies.mockResolvedValue(ok({ currentPage: 2, pageSize: 10, total: 25, totalPages: 3, data: [reply({ id: 'r20' })] }));
    await api.loadComments();

    await api.fetchReplies('c1', 2);

    expect(api.comments.value[0].replyCount).toBe(25);
    expect(api.getReplyReplies('c1')).toHaveLength(1);
  });
});

describe('toggleReplies（展开/收起）', () => {
  it('展开加载第 1 页；收起保留缓存，再展开不重复请求', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment()] }));
    mock.getReplies.mockResolvedValue(ok({ currentPage: 1, pageSize: 10, total: 3, totalPages: 1, data: [reply()] }));
    await api.loadComments();

    await api.toggleReplies('c1');
    expect(api.getReplyCurrentPage('c1')).toBe(1);
    expect(mock.getReplies).toHaveBeenCalledTimes(1);

    api.toggleReplies('c1');
    expect(api.getReplyCurrentPage('c1')).toBe(0);

    await api.toggleReplies('c1');
    expect(api.getReplyCurrentPage('c1')).toBe(1);
    expect(mock.getReplies).toHaveBeenCalledTimes(1); // 命中缓存
  });
});

describe('loadComments / setArticleId（文章切换）', () => {
  it('同文章重载保留回复缓存；切换文章清空', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment()] }));
    mock.getReplies.mockResolvedValue(ok({ currentPage: 1, pageSize: 10, total: 3, totalPages: 1, data: [reply()] }));
    await api.loadComments();
    await api.toggleReplies('c1');
    expect(api.getReplyCurrentPage('c1')).toBe(1);

    await api.loadComments(); // 同文章（排序切换等）
    expect(api.getReplyCurrentPage('c1')).toBe(1); // 缓存保留

    api.setArticleId('a2');
    expect(api.comments.value).toHaveLength(0); // 切换即清空
    await api.loadComments();
    expect(api.getReplyCurrentPage('c1')).toBe(0); // 回复缓存已重置
  });
});

describe('根评论分页（加载更多）', () => {
  const pagedList = (page: number, total: number, totalPages: number, items: any[]) =>
    ok({ currentPage: page, pageSize: 20, total, totalPages, data: { totalCommentCount: total, items } });

  it('loadComments 加载第 1 页，hasMoreComments 按 total 判定', async () => {
    mock.getComments.mockResolvedValue(pagedList(1, 25, 2, [rootComment({ id: 'c1' })]));

    await api.loadComments();

    expect(api.comments.value).toHaveLength(1);
    expect(api.hasMoreComments.value).toBe(true);
  });

  it('loadMoreComments 追加下一页并更新 hasMore', async () => {
    mock.getComments
      .mockResolvedValueOnce(pagedList(1, 25, 2, [rootComment({ id: 'c1' })]))
      .mockResolvedValueOnce(pagedList(2, 25, 2, [rootComment({ id: 'c2' })]));
    await api.loadComments();

    await api.loadMoreComments();

    expect(api.comments.value).toHaveLength(2);
    expect(api.comments.value[1].id).toBe('c2');
    expect(api.hasMoreComments.value).toBe(true); // 已加载 2 条，仍 < 服务端总数 25
    expect(mock.getComments).toHaveBeenLastCalledWith('a1', 'hot', 2); // pageSize 走 API 默认 20
  });

  it('发布评论后根评论总数同步 +1，hasMore 不误判', async () => {
    mock.getComments.mockResolvedValue(pagedList(1, 21, 2, [rootComment({ id: 'c1' })]));
    mock.addComment.mockResolvedValue(ok(rootComment({ id: 'c-new' })));
    await api.loadComments();
    expect(api.hasMoreComments.value).toBe(true); // 1 < 21

    await api.addComment('new');

    expect(api.comments.value).toHaveLength(2);
    expect(api.hasMoreComments.value).toBe(true); // 2 < 22，不会被总数 +1 误判为无更多
  });
});

describe('旧后端兜底（接口不返回新建实体）', () => {
  const noData = { errCode: 200, errMsg: 'ok', isSuccess: true, data: null };

  it('发布评论无实体时静默重拉列表，且保留回复缓存', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment()] }));
    mock.getReplies.mockResolvedValue(ok({ currentPage: 1, pageSize: 10, total: 3, totalPages: 1, data: [reply()] }));
    mock.addComment.mockResolvedValue(noData);
    await api.loadComments();
    await api.toggleReplies('c1');
    expect(api.getReplyCurrentPage('c1')).toBe(1);

    const result = await api.addComment('x');

    expect(result).toBe(true);
    expect(mock.getComments).toHaveBeenCalledTimes(2); // 静默重拉
    expect(api.getReplyCurrentPage('c1')).toBe(1); // 回复展开状态保留
  });

  it('回复无实体时兜底：跳末页、重拉末页，replyCount 与分页栏正常出现', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment({ replyCount: 10 })] }));
    mock.getReplies
      .mockResolvedValueOnce(
        ok({ currentPage: 1, pageSize: 10, total: 10, totalPages: 1, data: Array.from({ length: 10 }, (_, i) => reply({ id: `r${i}` })) })
      )
      .mockResolvedValueOnce(
        ok({ currentPage: 2, pageSize: 10, total: 11, totalPages: 2, data: [reply({ id: 'r10', content: '11th' })] })
      );
    mock.replyComment.mockResolvedValue(noData);
    await api.loadComments();
    await api.fetchReplies('c1', 1);

    const result = await api.submitReply('c1', '11th');

    expect(result).toBe(true);
    expect(api.getReplyCurrentPage('c1')).toBe(2); // 自动跳末页
    expect(mock.getReplies).toHaveBeenLastCalledWith('c1', 2, 10);
    expect(api.comments.value[0].replyCount).toBe(11); // 分页栏将出现（totalPages=2）
  });
});

describe('vote（点赞/踩，乐观更新）', () => {
  it('根评论点赞乐观更新', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment({ likeCount: 2 })] }));
    mock.reactToComment.mockResolvedValue(ok(null));
    await api.loadComments();

    await api.vote('c1', undefined, 'like');

    expect(api.comments.value[0].likes).toBe(3);
    expect(api.comments.value[0].userVote).toBe('like');
  });

  it('回复点赞在缓存分页数组中乐观更新', async () => {
    mock.getComments.mockResolvedValue(ok({ data: [rootComment()] }));
    mock.getReplies.mockResolvedValue(ok({ currentPage: 1, pageSize: 10, total: 1, totalPages: 1, data: [reply({ id: 'r1', likeCount: 0 })] }));
    mock.reactToComment.mockResolvedValue(ok(null));
    await api.loadComments();
    await api.fetchReplies('c1', 1);

    await api.vote('c1', 'r1', 'like');

    const r = api.getReplyReplies('c1')[0];
    expect(r.likes).toBe(1);
    expect(r.userVote).toBe('like');
  });
});
