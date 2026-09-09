import request from './request';

export interface ResultObject<T = any> {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: T;
}

export interface ArticleInfo {
  id: string;
  title: string;
  authorId: string;
  status: string;
  summary: string;
  visibility: string;
  isTop: number;
  slug: string;
  coverUrl: string;
  language: string;
  allowComment: number;
  publishAt: string;
  createdAt: string;
  // 后端 VO 字段名为 updateAt（实体 update_at，内容更新时间）
  updateAt: string;
  // Optional fields that might not be in ArticleVo but used in UI (to be verified)
  viewCount?: number;
  likeCount?: number;
  favorites?: number;
  commentCount?: number;
  tags?: string[];
  readingTimeMinutes?: number;
  authorName?: string;
  authorAvatar?: string;
  // ES 高亮字段：命中的内容上下文（~200字，含 <em class="highlight"> 标签）
  highlightSnippet?: string;
  highlightTitle?: string;
  // 搜索命中的标签名（纯文本，用于搜索卡片强制展示并高亮）
  highlightTags?: string[];
  // 搜索命中的作者名片段（含 <em class="highlight"> 标签，v-html 渲染）
  highlightAuthorName?: string;
  // 最近浏览时间（仅浏览历史接口返回）
  viewedAt?: string;
  // 收藏时间（仅我的收藏接口返回）
  favoritedAt?: string;
  // 审核字段（后端 Task 9 新增，创作中心状态徽标用）
  reviewStatus?: string;
  reviewReason?: string;
  // 所属专栏列表（详情接口返回；无专栏时后端为 null，故联合 null）
  seriesList?: ArticleSeriesLink[] | null;
}

export interface ArticleChapter {
  id: string;
  articleId: string;
  title: string;
  sort: number;
  parentId: string;
}

export interface ArticleContent {
  articleId: string;
  content?: string; // HTML?
  contentRaw?: string; // Markdown?
  contentMd?: string; // Markdown (New)
  contentHtml?: string; // HTML (New)
}

export interface ResultArticle {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: ArticleInfo;
}

export interface ResultListArticle {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: ArticleInfo[];
}

export interface ResultListArticleChapter {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: ArticleChapter[];
}

export interface ResultArticleContent {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: ArticleContent;
}

export interface ResultBoolean {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: boolean;
}

export interface ResultNumber {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: number;
}

// Generic paginated result
export interface PageResult<T> {
  total: number;
  data: T[];
  currentPage: number;
  totalPages: number;
}

export interface ResultPageArticle {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: PageResult<ArticleInfo>;
}

//base url
const baseUrl = "/api/article-service"
// Query Published Articles List (paged, 置顶优先 + 发布时间降序，由后端排序)
export const getPublishedArticles = (pageNum: number = 1, pageSize: number = 10) => {
  return request.get<any, ResultPageArticle>(baseUrl+'/article/read/published', { params: { pageNum, pageSize } });
};

// Query Hot Published Articles List (paged, 后端热度权重排序)
export const getHotArticles = (pageNum: number = 1, pageSize: number = 10) => {
  return request.get<any, ResultPageArticle>(baseUrl+'/article/read/published/hot', { params: { pageNum, pageSize } });
};

export interface GlobalArticleStats {
  articleCount: number;
  viewCount: number;
  likeCount: number;
  tagCount: number;
}

export interface ResultGlobalArticleStats {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: GlobalArticleStats;
}

// Get Global Article Stats (全库已发布文章统计)
export const getGlobalStats = () => {
  return request.get<any, ResultGlobalArticleStats>(baseUrl+'/article/read/stats/global');
};

// Get Article by ID
export const getArticleById = (id: string) => {
  return request.get<any, ResultArticle>(baseUrl+`/article/read/${id}`);
};

// Query Article Chapters
export const getArticleChapters = (articleId: string) => {
  return request.get<any, ResultListArticleChapter>(baseUrl+`/article/read/${articleId}/chapters`);
};

// Query Article Content
export const getArticleContent = (articleId: string) => {
  return request.get<any, ResultArticleContent>(baseUrl+`/article/read/${articleId}/content`);
};

// 专栏（Series）前台读接口 —— 契约同后端 Task 6
export interface SeriesReadItem {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  articleCount: number;
}

// 专栏详情：分页文章列表（文章为 ArticleInfo 形态，含 seriesList 自身链接）
export interface SeriesDetail {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  pageNum: number;
  pageSize: number;
  total: number;
  totalPages: number;
  articles: ArticleInfo[];
}

// 文章详情中 "所属专栏" 卡片的一条链接（ArticleInfo.seriesList 元素）
export interface ArticleSeriesLink {
  seriesId: string;
  name: string;
  coverUrl?: string;
  sortOrder: number;
  totalCount: number;
}

// Query All Series (GET /article/read/series)
export const getSeriesList = () => {
  return request.get<any, ResultObject<SeriesReadItem[]>>(baseUrl+'/article/read/series');
};

// Query Series Detail with paged articles (GET /article/read/series/{id}?pageNum=&pageSize=)
export const getSeriesDetail = (id: string, pageNum: number, pageSize: number) => {
  return request.get<any, ResultObject<SeriesDetail>>(baseUrl+`/article/read/series/${id}`, { params: { pageNum, pageSize } });
};

// 我的专栏（登录态创作端 SeriesReadVo；形态与前台 SeriesReadItem 一致，多语义为"归属我的"）
export interface SeriesOwn {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  articleCount: number;
}

// 新建/编辑专栏入参（name 必填，description/coverUrl 可选）
export interface SeriesSaveDto {
  name: string;
  description?: string;
  coverUrl?: string;
}

// Get My Series (GET /article/creator/series) —— 仅我的专栏，含已发布文章计数
export const getMySeries = () => {
  return request.get<any, ResultObject<SeriesOwn[]>>(baseUrl+'/article/creator/series');
};

// Create My Series (POST /article/creator/series) —— data 为新专栏 id
export const createSeries = (data: SeriesSaveDto) => {
  return request.post<any, ResultObject<string>>(baseUrl+'/article/creator/series', data);
};

// Update My Series (PUT /article/creator/series/{id}) —— 仅 owner（ADMIN 例外）
export const updateSeries = (id: string, data: SeriesSaveDto) => {
  return request.put<any, ResultObject<boolean>>(baseUrl+`/article/creator/series/${id}`, data);
};

// Delete My Series (DELETE /article/creator/series/{id}) —— 仅 owner（ADMIN 例外；级联清成员）
export const deleteSeries = (id: string) => {
  return request.delete<any, ResultObject<boolean>>(baseUrl+`/article/creator/series/${id}`);
};

// ================================================================
//  creator 编辑页成员管理（spec §十；一律 owner 模式——他人/站长级专栏整单 403）
// ================================================================

// 我的专栏成员（含草稿，sort_order 升序；status ∈ draft/published/archived）
export interface SeriesMemberItem {
  articleId: string;
  title: string;
  status: string;
  coverUrl?: string;
  sortOrder: number;
}

// 宽容批量收录中被逐篇跳过的原因码（机器码，文案由前端 i18n 本地化）
export type SeriesSkipReasonCode = 'limit3' | 'not_published' | 'not_owner' | 'not_found';

export interface SeriesSkipItem {
  articleId: string;
  reasonCode: SeriesSkipReasonCode;
}

// 宽容批量收录结果：已实际新增数 + 逐篇跳过明细（已在目标栏的重复请求静默跳过，两处都不计）
export interface SeriesAddResult {
  addedCount: number;
  skipped: SeriesSkipItem[];
}

// 跳过原因码 → i18n 消息 key（文案在 locales zh/en 的 creator.skipCode.*；未知码返回 ''）
const SKIP_REASON_TEXT_KEY: Record<SeriesSkipReasonCode, string> = {
  limit3: 'creator.skipCode.limit3',
  not_published: 'creator.skipCode.not_published',
  not_owner: 'creator.skipCode.not_owner',
  not_found: 'creator.skipCode.not_found',
};

/** 批量添加被跳过原因码 → i18n key（调用方以 t() 渲染为本地化文案） */
export function skipReasonText(code: SeriesSkipReasonCode): string {
  return SKIP_REASON_TEXT_KEY[code] ?? '';
}

// Get My Series Members (GET /article/creator/series/{id}/members) —— 仅 owner，含草稿
export const getMySeriesMembers = (id: string) => {
  return request.get<any, ResultObject<SeriesMemberItem[]>>(baseUrl+`/article/creator/series/${id}/members`);
};

// Add my published articles into series (POST /article/creator/series/{id}/articles)
// 宽容语义：违规文章逐篇跳过（skipped 带 reasonCode），不中断其余添加
export const addToMySeries = (id: string, articleIds: string[]) => {
  return request.post<any, ResultObject<SeriesAddResult>>(baseUrl+`/article/creator/series/${id}/articles`, { articleIds });
};

// Move member up/down (PUT /article/creator/series/{id}/articles/{articleId}/move?direction=up|down)
// 队首上移/队尾下移为 no-op，返回 false。
// 注意 axios 实例方法位次：put(url, body, config)——params 必须放第三参（config），
// 放第二参会把 {params} 当请求体 JSON 发出、后端 @RequestParam direction 取不到（500）；
// 写法同 comment.ts reactToComment 的 request.post(url, null, { params })
export const moveMySeriesArticle = (id: string, articleId: string, direction: 'up' | 'down') => {
  return request.put<any, ResultObject<boolean>>(baseUrl+`/article/creator/series/${id}/articles/${articleId}/move`, null, { params: { direction } });
};

// Remove member from series (DELETE /article/creator/series/{id}/articles/{articleId}) —— 关系行不存在返回 false
export const removeMySeriesArticle = (id: string, articleId: string) => {
  return request.delete<any, ResultObject<boolean>>(baseUrl+`/article/creator/series/${id}/articles/${articleId}`);
};

// Like Article
export const likeArticle = (articleId: string) => {
  return request.post<any, ResultObject>(baseUrl+`/article/interaction/${articleId}/like`);
};

// Unlike Article
export const unlikeArticle = (articleId: string) => {
  return request.post<any, ResultObject>(baseUrl+`/article/interaction/${articleId}/unlike`);
};

// Favorite Article
export const favoriteArticle = (articleId: string) => {
  return request.post<any, ResultObject>(baseUrl+`/article/interaction/${articleId}/favorite`);
};

// Unfavorite Article
export const unfavoriteArticle = (articleId: string) => {
  return request.post<any, ResultObject>(baseUrl+`/article/interaction/${articleId}/unfavorite`);
};

// Check if User Liked Article
export const checkIsLiked = (articleId: string) => {
  return request.get<any, ResultBoolean>(baseUrl+`/article/interaction/${articleId}/liked`);
};

// Check if User Favorited Article
export const checkIsFavorited = (articleId: string) => {
  return request.get<any, ResultBoolean>(baseUrl+`/article/interaction/${articleId}/favorited`);
};

// Get Like Count
export const getLikeCount = (articleId: string) => {
  return request.get<any, ResultNumber>(baseUrl+`/article/interaction/${articleId}/like-count`);
};

// Get Favorite Count
export const getFavoriteCount = (articleId: string) => {
  return request.get<any, ResultNumber>(baseUrl+`/article/interaction/${articleId}/favorite-count`);
};

// Record Article View
export const recordArticleView = (articleId: string) => {
  return request.post<any, ResultNumber>(baseUrl+`/article/interaction/${articleId}/view`);
};

// Check if User is Owner of Article
export const checkArticleOwnership = (articleId: string) => {
  return request.get<any, ResultBoolean>(baseUrl+`/article/${articleId}/check`);
};

// Create/Publish Article
export interface ArticleSaveDto {
  id?: string; // Optional for create, required for update
  title: string;
  summary?: string;
  contentMd: string;   // Markdown content
  contentHtml: string; // HTML content
  coverUrl?: string;
  tags?: string[];
  // 所属专栏 id 列表（最多 3 个，发布弹窗勾选）
  seriesIds?: string[];
  allowComment?: number; // 1 for yes, 0 for no
}

// 发布结果：verdict 为后端审核判定（ai_reviewing / approved / exempt / rejected 等）
export interface PublishResultData {
  articleId: string;
  verdict: string;
  reason?: string;
}

export const publishArticle = (data: ArticleSaveDto) => {
  return request.post<any, ResultObject<PublishResultData>>(baseUrl+'/article/publish', data);
};

// Save Draft
export const saveDraft = (data: ArticleSaveDto) => {
  return request.post<any, ResultObject>(baseUrl+'/article/draft', data);
};

// Delete Article
export const deleteArticle = (id: string) => {
  return request.delete<any, ResultObject>(baseUrl+`/article/${id}`);
};

// 常用标签统计（GET /article/read/tags/popular）
export interface TagStat {
  id: string;
  name: string;
  articleCount: number;
}

export interface ResultListTagStat {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: TagStat[];
}

// Query Popular (Common) Tags
export const getPopularTags = () => {
  return request.get<any, ResultListTagStat>(baseUrl+'/article/read/tags/popular');
};

// Query Reading History
export const getReadingHistory = () => {
  return request.get<any, ResultListArticle>(baseUrl+'/article/read/history');
};

// Query My Favorites
export const getFavoriteArticles = () => {
  return request.get<any, ResultListArticle>(baseUrl+'/article/interaction/favorites');
};

export interface UserArticleStats {
  name:string;
  avatar:string;
  bio:string;
  articleCount: number;
  viewCount?: number;
  likeCount: number;
  favoriteCount?: number;
}

export interface ResultUserArticleStats {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: UserArticleStats;
}

// Get User Stats
export const getUserStats = (userId: string) => {
  return request.get<any, ResultUserArticleStats>(baseUrl+`/article/stats/${userId}`);
};

// Get My Stats
export const getMyStats = () => {
  return request.get<any, ResultUserArticleStats>(baseUrl+'/article/stats/me');
};

export interface HeatmapDayEntry {
  date: string;
  count: number;
}

export interface ResultListHeatmapDay {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: HeatmapDayEntry[];
}

// Get My Activity Heatmap (recent 12 months, per-day event count)
export const getMyHeatmap = () => {
  return request.get<any, ResultListHeatmapDay>(baseUrl+'/article/stats/heatmap/me');
};

// Get a specific user's activity heatmap (public, for other-user profile)
export const getUserHeatmap = (userId: string) => {
  return request.get<any, ResultListHeatmapDay>(baseUrl+`/article/stats/heatmap/${userId}`);
};

// Get a specific user's published articles (public, paged)
export const getUserPublishedArticles = (userId: string, pageNum: number = 1, pageSize: number = 10) => {
  return request.get<any, ResultPageArticle>(baseUrl+`/article/read/published/by-author/${userId}`, { params: { pageNum, pageSize } });
};

// 创作中心文章状态：已发布 / 草稿 / AI 审核中 / 待人工审核 / 已驳回；'all' = 三个审核中状态合并查询
export type CreatorArticleStatus = 'published' | 'draft' | 'ai_reviewing' | 'pending_review' | 'rejected' | 'all';

// Params for fetching current user's own articles
export interface MyArticlesParams {
  status: CreatorArticleStatus;
  pageNum?: number;
  pageSize?: number;
}

// Get Current User's Articles (published or drafts, paged)
export const getMyArticles = (params: MyArticlesParams) => {
  return request.get<any, ResultPageArticle>(baseUrl+'/article/creator/me', { params });
};


// Search Articles
export interface SearchParams {
  keyword: string;
  filter?: string,
  pageNum?: number;
  pageSize?: number;
  author?: string;
  status?: string;
  sortBy?: string;     // 'relevance' | 'createdAt' | 'likeCount' | 'viewCount'
  sortOrder?: string;  // 'asc' | 'desc'
  dateFrom?: string;   // 'yyyy-MM-dd'
  dateTo?: string;     // 'yyyy-MM-dd'
}

export interface SearchResult {
  total: number;
  data: ArticleInfo[];
  currentPage: number;
  totalPages: number;
}

export interface ResultSearchResult {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: SearchResult;
}

// 搜索文章接口
export const searchArticles = (params: SearchParams) => {
  return request.get<any, ResultSearchResult>('/api/search-service/essearch/search', { params });
};



