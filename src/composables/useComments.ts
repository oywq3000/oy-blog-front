import { ref, reactive, computed } from 'vue';
import * as commentApi from '../api/comment';
import type {
  Comment as APIComment,
  CommentReply as APICommentReply,
} from '../api/comment';
import type { Comment as UIComment } from '../components/CommentItem.vue';

export const PAGE_SIZE = 10;

// ============================================================
// Helpers: API → UI 映射（与列表接口共用，新建实体直接走同一映射）
// ============================================================

export const mapReplyToUI = (r: APICommentReply): UIComment => ({
  id: r.id,
  user: r.username || r.userId || 'User',
  userId: r.userId,
  avatar: r.avatar || undefined,
  date: r.replyAt,
  content: r.content,
  likes: r.likeCount ?? 0,
  dislikes: r.dislikeCount ?? 0,
  userVote: (r.userReaction as UIComment['userVote']) ?? null,
  isShow: r.isShow,
  replyToUsername: r.replyToUsername,
  replyToReplyId: r.replyToReplyId,
  replies: [],
});

export const mapComment = (c: APIComment): UIComment => {
  const root: UIComment = {
    id: c.id,
    user: c.username || c.userId || 'User',
    userId: c.userId,
    avatar: c.avatar || undefined,
    date: c.commentAt,
    content: c.content,
    likes: c.likeCount ?? 0,
    dislikes: c.dislikeCount ?? 0,
    userVote: (c.userReaction as UIComment['userVote']) ?? null,
    replies: [],
    replyCount: c.replyCount || 0,
    isShow: c.isShow,
  };
  if (c.replies && c.replies.length > 0) {
    root.replies = c.replies.map(mapReplyToUI);
  }
  return root;
};

// ============================================================
// Shared reactive state (global singleton)
// ============================================================

interface ReplyState {
  /** pageNum → 该页回复列表（分页缓存） */
  pages: Record<number, UIComment[]>;
  /** 0 = 收起；>0 = 当前展开的页 */
  currentPage: number;
  loading: boolean;
}

const articleId = ref<string>('');
const comments = ref<UIComment[]>([]);
const totalCommentCount = ref<number>(0);
const sortMode = ref<'hot' | 'newest'>('hot');
const isSubmittingComment = ref(false);
const replyStates = reactive<Record<string, ReplyState>>({});

// 根评论分页："加载更多"式，逐页追加
const commentPage = ref(1); // 已加载到的页数（从 1 起）
const rootCommentTotal = ref(0); // 服务端根评论总数（发布评论后本地 +1 保持一致）
const loadingMoreComments = ref(false);
const hasMoreComments = computed(() => comments.value.length < rootCommentTotal.value);

function getState(rootId: string | number): ReplyState {
  const key = String(rootId);
  if (!replyStates[key]) {
    replyStates[key] = { pages: {}, currentPage: 0, loading: false };
  }
  return replyStates[key];
}

function findRoot(rootId: string | number): UIComment | undefined {
  return comments.value.find(c => String(c.id) === String(rootId));
}

// ============================================================
// 根评论列表
// ============================================================

function setArticleId(id: string) {
  if (id !== articleId.value) {
    articleId.value = id;
    // 切换文章：清空列表与回复缓存
    comments.value = [];
    totalCommentCount.value = 0;
    commentPage.value = 1;
    rootCommentTotal.value = 0;
    for (const key of Object.keys(replyStates)) delete replyStates[key];
  }
}

/** 加载根评论第 1 页（初次进入 / 切换排序），替换当前列表 */
async function loadComments(): Promise<void> {
  if (!articleId.value) return;
  try {
    const res = await commentApi.getComments(articleId.value, sortMode.value);
    if (res.isSuccess && res.data) {
      const rawComments = Array.isArray(res.data.data)
        ? res.data.data
        : (res.data.data.items || []);
      comments.value = rawComments.map(mapComment);
      totalCommentCount.value = res.data.data?.totalCommentCount ?? 0;
      commentPage.value = 1;
      rootCommentTotal.value = res.data.total ?? comments.value.length;
    }
  } catch (error) {
    console.error('Failed to load comments:', error);
  }
}

/** 加载更多：追加下一页根评论 */
async function loadMoreComments(): Promise<void> {
  if (!articleId.value || !hasMoreComments.value || loadingMoreComments.value) return;
  loadingMoreComments.value = true;
  try {
    const res = await commentApi.getComments(articleId.value, sortMode.value, commentPage.value + 1);
    if (res.isSuccess && res.data) {
      const rawComments = Array.isArray(res.data.data)
        ? res.data.data
        : (res.data.data.items || []);
      comments.value.push(...rawComments.map(mapComment));
      commentPage.value += 1;
      rootCommentTotal.value = res.data.total ?? rootCommentTotal.value;
    }
  } catch (error) {
    console.error('Failed to load more comments:', error);
  } finally {
    loadingMoreComments.value = false;
  }
}

function setSortMode(mode: 'hot' | 'newest') {
  if (sortMode.value === mode) return;
  sortMode.value = mode;
  if (articleId.value) loadComments();
}

/**
 * 发布评论：成功后用后端返回的新实体插入列表顶部，不重载整个评论。
 * 旧后端（不返回实体）兜底：静默重拉第 1 页，回复缓存不受影响。
 */
async function addComment(content: string): Promise<boolean> {
  if (!articleId.value) return false;
  isSubmittingComment.value = true;
  try {
    const res = await commentApi.addComment(articleId.value, content);
    if (!res.isSuccess) return false;
    if (res.data) {
      comments.value.unshift(mapComment(res.data));
      totalCommentCount.value = (totalCommentCount.value || 0) + 1;
      rootCommentTotal.value += 1; // 与列表同步增长，保持 hasMoreComments 判定正确
    } else {
      await loadComments();
    }
    return true;
  } catch (error) {
    console.error('Failed to submit comment:', error);
    return false;
  } finally {
    isSubmittingComment.value = false;
  }
}

// ============================================================
// 回复分页
// ============================================================

/**
 * 拉取某个根评论的指定页回复并缓存；同时用响应的 total 同步 replyCount。
 */
async function fetchReplies(rootId: string | number, page: number): Promise<void> {
  const state = getState(rootId);
  state.currentPage = page; // 拉取即展示该页
  state.loading = true;
  try {
    const res = await commentApi.getReplies(String(rootId), page, PAGE_SIZE);
    if (res.isSuccess && res.data) {
      const list = res.data.data || [];
      state.pages[page] = list.map(mapReplyToUI);
      // 以 replies 接口 total 为 replyCount 的单一数据源
      if (typeof res.data.total === 'number' && res.data.total > 0) {
        const root = findRoot(rootId);
        if (root) root.replyCount = res.data.total;
      }
    }
  } catch (e) {
    console.error('Failed to fetch replies for', rootId, e);
  } finally {
    state.loading = false;
  }
}

/** 展开/收起：展开时若无缓存则拉第 1 页；收起仅置 0，保留缓存。 */
function toggleReplies(rootId: string | number): Promise<void> {
  const state = getState(rootId);
  if (state.currentPage > 0) {
    state.currentPage = 0;
    return Promise.resolve();
  }
  state.currentPage = 1;
  if (!state.pages[1]) return fetchReplies(rootId, 1);
  return Promise.resolve();
}

function collapseReplies(rootId: string | number) {
  getState(rootId).currentPage = 0;
}

function goToReplyPage(rootId: string | number, page: number): Promise<void> {
  const state = getState(rootId);
  state.currentPage = page;
  if (!state.pages[page]) return fetchReplies(rootId, page);
  return Promise.resolve();
}

interface ReplyTarget {
  root: UIComment | undefined;
  replyToReplyId?: number | string;
  replyToUserId?: string;
}

/**
 * 定位回复目标：可能是根评论，也可能是某条回复（回复回复）。
 * 返回目标所在根评论 + 回复回复所需的 replyToReplyId/replyToUserId。
 */
function resolveReplyTarget(commentId: string | number): ReplyTarget {
  const rootCandidate = findRoot(commentId);
  if (rootCandidate) {
    return { root: rootCandidate, replyToUserId: rootCandidate.userId };
  }
  for (const r of comments.value) {
    const state = replyStates[String(r.id)];
    if (!state) continue;
    for (const list of Object.values(state.pages)) {
      const target = list.find(x => String(x.id) === String(commentId));
      if (target) {
        return { root: r, replyToReplyId: target.id, replyToUserId: target.userId };
      }
    }
  }
  return { root: undefined };
}

/**
 * 回复成功后的状态更新：replyCount+1 → 分页栏跨页时自动出现；
 * 末页已缓存就就地追加（零请求），否则拉取末页（服务端 total 已含新回复）。
 */
async function appendReplyToState(root: UIComment, uiReply: UIComment): Promise<void> {
  const state = getState(root.id);
  const lastPage = Math.max(1, Math.ceil(((root.replyCount || 0) + 1) / PAGE_SIZE));
  state.currentPage = lastPage;
  if (state.pages[lastPage]) {
    state.pages[lastPage].push(uiReply);
    root.replyCount = (root.replyCount || 0) + 1;
  } else {
    await fetchReplies(root.id, lastPage);
  }
}

/**
 * 回复评论：新后端返回实体 → 就地追加；旧后端无实体 → 兜底重拉末页。
 * 两种情况下 replyCount 都会更新，分页栏都会出现。不重载整个列表/回复。
 */
async function submitReply(commentId: string | number, content: string): Promise<boolean> {
  if (!articleId.value) return false;
  const { root, replyToReplyId, replyToUserId } = resolveReplyTarget(commentId);
  if (!root) return false;

  try {
    const res = await commentApi.replyComment(
      root.id,
      content,
      articleId.value,
      replyToReplyId,
      replyToUserId
    );
    if (!res.isSuccess) return false;
    if (res.data) {
      await appendReplyToState(root, mapReplyToUI(res.data));
    } else {
      // 旧后端兜底：本地计数 +1、跳末页、重拉末页（拉取后 replyCount 以服务端 total 为准）
      const nextCount = (root.replyCount || 0) + 1;
      const lastPage = Math.max(1, Math.ceil(nextCount / PAGE_SIZE));
      getState(root.id).currentPage = lastPage;
      root.replyCount = nextCount;
      await fetchReplies(root.id, lastPage);
    }
    return true;
  } catch (error) {
    console.error('Failed to reply:', error);
    return false;
  }
}

// ============================================================
// 表态（点赞/踩）
// ============================================================

async function vote(
  commentId: string | number,
  replyId: string | number | undefined,
  type: 'like' | 'dislike'
): Promise<void> {
  let target: UIComment | undefined;
  if (replyId !== undefined) {
    // 回复：在根评论的缓存分页中定位
    const root = findRoot(commentId);
    if (root) {
      const state = replyStates[String(root.id)];
      if (state) {
        for (const list of Object.values(state.pages)) {
          const found = list.find(x => String(x.id) === String(replyId));
          if (found) { target = found; break; }
        }
      }
    }
  } else {
    target = findRoot(commentId);
  }
  if (!target) return;

  try {
    await commentApi.reactToComment(type, articleId.value, String(commentId), replyId !== undefined ? String(replyId) : undefined);
    // 乐观更新
    if (target.userVote === type) {
      target.userVote = null;
      if (type === 'like') target.likes--; else target.dislikes--;
    } else {
      if (target.userVote) {
        if (target.userVote === 'like') target.likes--; else target.dislikes--;
      }
      target.userVote = type;
      if (type === 'like') target.likes++; else target.dislikes++;
    }
  } catch (error) {
    console.error('Failed to vote:', error);
  }
}

// ============================================================
// 模板选择器
// ============================================================

function getReplyReplies(rootId: string | number): UIComment[] {
  const state = getState(rootId);
  return state.pages[state.currentPage] ?? [];
}

function getReplyCurrentPage(rootId: string | number): number {
  return getState(rootId).currentPage;
}

function getReplyLoading(rootId: string | number): boolean {
  return getState(rootId).loading;
}

// ============================================================
// Export composable
// ============================================================

export function useComments() {
  return {
    // State
    articleId,
    comments,
    totalCommentCount,
    sortMode,
    isSubmittingComment,
    replyStates,
    commentPage,
    hasMoreComments,
    loadingMoreComments,

    // Actions
    setArticleId,
    loadComments,
    loadMoreComments,
    setSortMode,
    addComment,
    submitReply,
    fetchReplies,
    toggleReplies,
    collapseReplies,
    goToReplyPage,
    vote,

    // Template selectors
    getReplyReplies,
    getReplyCurrentPage,
    getReplyLoading,
  };
}
