import request from './request';

export interface ResultObject {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: any;
}

export interface Article {
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
  updatedAt: string;
  // Optional fields that might not be in ArticleVo but used in UI (to be verified)
  viewCount?: number;
  likeCount?: number;
  favorites?: number;
  commentCount?: number;
  tags?: string[];
  readingTimeMinutes?: number;
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
  data: Article;
}

export interface ResultListArticle {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: Article[];
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
//base url 
const baseUrl = "/api/article-service"
// Query Published Articles List
export const getPublishedArticles = () => {
  return request.get<any, ResultListArticle>(baseUrl+'/article/read/published');
};

// Query Article by Slug
export const getArticleBySlug = (slug: string) => {
  return request.get<any, ResultArticle>(baseUrl+`/article/read/by-slug/${slug}`);
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
  categoryCode?: string;
  tags?: string[];
  allowComment?: number; // 1 for yes, 0 for no
}

export const publishArticle = (data: ArticleSaveDto) => {
  return request.post<any, ResultObject>(baseUrl+'/article/publish', data);
};

// Save Draft
export const saveDraft = (data: ArticleSaveDto) => {
  return request.post<any, ResultObject>(baseUrl+'/article/draft', data);
};

// Delete Article
export const deleteArticle = (id: string) => {
  return request.delete<any, ResultObject>(baseUrl+`/article/${id}`);
};

// Query Popular Tags
export const getPopularTags = () => {
  return request.get<any, { data: string[] }>(baseUrl+'/article/read/tags/popular');
};

// Query Reading History
export const getReadingHistory = () => {
  return request.get<any, ResultListArticle>(baseUrl+'/article/read/history');
};

export interface UserArticleStats {
  name:string;
  avatar:string;
  bio:string;
  articleCount: number;
  likeCount: number;
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


// Search Articles
interface SearchParams {
  keyword: string;
  page?: number;
  size?: number;
  author?: string;
  tag?: string;
  category?: string
  status?: string;
}

export interface SearchResult {
  total: number;
  data: Article[];
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
  return request.get<any, ResultSearchResult>('api/search-service/essearch/search', { params });
};



