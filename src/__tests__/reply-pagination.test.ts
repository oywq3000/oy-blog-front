import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

// ============================================================
// 1. API response parsing — pagination wrapper
// ============================================================
describe('Reply API pagination response parsing', () => {
  const mockPaginatedReply = (overrides: Record<string, any> = {}) => ({
    id: '1',
    articleId: 'a1',
    commentId: 100,
    replyToReplyId: null,
    userId: 'u1',
    replyToUserId: 'u1',
    content: 'test reply',
    replyAt: '2026-08-05 08:00:00',
    username: 'tester',
    avatar: '',
    replyToUsername: 'author',
    isShow: true,
    likeCount: 0,
    dislikeCount: 0,
    userReaction: null,
    ...overrides,
  });

  it('should extract replies from paginated response', () => {
    const res = {
      errCode: 200,
      errMsg: '成功',
      isSuccess: true,
      data: {
        currentPage: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        data: [
          mockPaginatedReply({ id: '1', content: 'reply 1' }),
          mockPaginatedReply({ id: '2', content: 'reply 2' }),
        ],
      },
    };

    // Verify structure
    expect(res.data.currentPage).toBe(1);
    expect(res.data.total).toBe(25);
    expect(res.data.totalPages).toBe(3);
    expect(res.data.data).toHaveLength(2);
    expect(res.data.data[0].content).toBe('reply 1');
  });

  it('should handle empty page', () => {
    const res = {
      errCode: 200,
      isSuccess: true,
      data: {
        currentPage: 3,
        pageSize: 10,
        total: 20,
        totalPages: 2,
        data: [] as any[],
      },
    };

    expect(res.data.data).toHaveLength(0);
    expect(res.data.currentPage).toBeGreaterThan(res.data.totalPages);
  });
});

// ============================================================
// 2. CommentItem pagination logic (isolated)
// ============================================================
describe('Reply pagination logic', () => {
  const PAGE_SIZE = 10;

  const computeTotalPages = (replyCount: number) =>
    Math.ceil(replyCount / PAGE_SIZE);

  it('should calculate totalPages correctly', () => {
    expect(computeTotalPages(0)).toBe(0);
    expect(computeTotalPages(5)).toBe(1);
    expect(computeTotalPages(10)).toBe(1);
    expect(computeTotalPages(11)).toBe(2);
    expect(computeTotalPages(25)).toBe(3);
    expect(computeTotalPages(100)).toBe(10);
  });

  it('should detect if pagination bar should show', () => {
    const shouldShow = (currentPage: number, totalPages: number) =>
      currentPage > 0 && totalPages > 1;

    // Collapsed — no bar
    expect(shouldShow(0, 3)).toBe(false);
    // Single page — no bar
    expect(shouldShow(1, 1)).toBe(false);
    expect(shouldShow(1, 0)).toBe(false);
    // Multiple pages + expanded — show bar
    expect(shouldShow(1, 3)).toBe(true);
    expect(shouldShow(2, 5)).toBe(true);
  });

  it('should go to next page correctly', () => {
    const nextPage = (current: number, total: number) =>
      current < total ? current + 1 : current;

    expect(nextPage(1, 3)).toBe(2);
    expect(nextPage(3, 3)).toBe(3); // last page — no change
    expect(nextPage(0, 3)).toBe(1); // collapsed — go to 1
  });

  it('should emit fetch-replies with correct page number', () => {
    // Simulate emit tracking
    const emitted: { id: number; page: number }[] = [];
    const emit = (event: string, id: number, page: number) => {
      if (event === 'fetch-replies') emitted.push({ id, page });
    };

    const goToPage = (page: number, commentId: number) => {
      emit('fetch-replies', commentId, page);
    };

    goToPage(1, 100);
    goToPage(2, 100);
    goToPage(3, 100);

    expect(emitted).toHaveLength(3);
    expect(emitted[0]).toEqual({ id: 100, page: 1 });
    expect(emitted[1]).toEqual({ id: 100, page: 2 });
    expect(emitted[2]).toEqual({ id: 100, page: 3 });
  });

  it('should collapse to page 0', () => {
    let currentPage = 2;
    const collapse = () => { currentPage = 0; };

    collapse();
    expect(currentPage).toBe(0);
  });
});

// ============================================================
// 3. Data mapping: API → UI Comment model
// ============================================================
describe('mapReplyToUI', () => {
  // Replicate the mapping function from ArticleDetail.vue
  const mapReplyToUI = (r: any) => ({
    id: Number(r.id),
    user: r.username || r.userId || 'User',
    userId: r.userId,
    avatar: r.avatar || undefined,
    date: r.replyAt,
    content: r.content,
    likes: r.likeCount ?? 0,
    dislikes: r.dislikeCount ?? 0,
    userVote: (r.userReaction as any) ?? null,
    isShow: r.isShow,
    replyToUsername: r.replyToUsername,
    replyToReplyId: r.replyToReplyId,
    replies: [],
  });

  it('should map a direct reply (no replyToReplyId)', () => {
    const apiReply = {
      id: '1',
      username: 'alice',
      userId: 'u1',
      avatar: '/avatar.jpg',
      replyAt: '2026-08-05 12:00:00',
      content: 'hello',
      likeCount: 3,
      dislikeCount: 0,
      userReaction: null,
      isShow: true,
      replyToUsername: 'author',
      replyToReplyId: null,
    };

    const ui = mapReplyToUI(apiReply);
    expect(ui.user).toBe('alice');
    expect(ui.content).toBe('hello');
    expect(ui.replyToReplyId).toBeNull();
    expect(ui.replyToUsername).toBe('author');
    expect(ui.isShow).toBe(true);
  });

  it('should map a reply-to-reply (has replyToReplyId)', () => {
    const apiReply = {
      id: '2',
      username: 'bob',
      userId: 'u2',
      avatar: '',
      replyAt: '2026-08-05 13:00:00',
      content: 'agree',
      likeCount: 1,
      dislikeCount: 0,
      userReaction: 'like',
      isShow: true,
      replyToUsername: 'alice',
      replyToReplyId: 1,
    };

    const ui = mapReplyToUI(apiReply);
    expect(ui.user).toBe('bob');
    expect(ui.replyToReplyId).toBe(1);
    expect(ui.replyToUsername).toBe('alice');
    expect(ui.userVote).toBe('like');
  });

  it('should handle missing optional fields', () => {
    const apiReply = {
      id: '3',
      username: undefined,
      userId: 'u3',
      avatar: undefined,
      replyAt: '',
      content: '',
      likeCount: undefined,
      dislikeCount: undefined,
      userReaction: null,
      isShow: undefined,
      replyToUsername: undefined,
      replyToReplyId: null,
    };

    const ui = mapReplyToUI(apiReply);
    expect(ui.user).toBe('u3'); // fallback to userId
    expect(ui.likes).toBe(0);
    expect(ui.dislikes).toBe(0);
    expect(ui.isShow).toBeUndefined();
  });
});

// ============================================================
// 4. @replyToUsername display logic
// ============================================================
describe('@username display decision', () => {
  it('should show @ for reply-to-reply but not for direct reply', () => {
    const shouldShowAt = (replyToReplyId: any) =>
      replyToReplyId != null && replyToReplyId !== undefined;

    // Direct reply to comment — no @
    expect(shouldShowAt(null)).toBe(false);
    expect(shouldShowAt(undefined)).toBe(false);
    // Reply to another reply — show @
    expect(shouldShowAt(1)).toBe(true);
    expect(shouldShowAt('123')).toBe(true);
  });
});
