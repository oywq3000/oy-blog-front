// Site-level configuration.
// OWNER_USER_ID 为空时，首页统计条回退为文章列表客户端聚合；填写后优先使用后端
// getUserStats 数据。可从后端 /article/stats/me（登录态）或数据库查询站长用户 ID。
export const OWNER_USER_ID: string = '';

// 公开 GitHub 链接（Hero CTA 与 Footer 共用同一来源）
export const GITHUB_URL: string = 'https://github.com/oywq3000/oy-blog';
