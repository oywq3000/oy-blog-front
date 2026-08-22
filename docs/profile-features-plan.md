# Profile 页三大功能实现计划（收藏 / 浏览记录 / 设置）

> 日期：2026-08-16
> 前端项目：`g:\JavaWorkSpace\frontend\oy-blog-front`
> 后端项目：`G:\JavaWorkSpace\oy-blog`（article-service / user-service）

---

## 一、现状分析

`src/views/UserProfile.vue` 三个 tab（收藏 / 浏览历史 / 设置）当前状态：

| 功能 | 现状 | 问题 |
|------|------|------|
| 收藏 | 渲染 `mockArticles`（空数组） | 永远显示空态；后端有 favorite/unfavorite 但**无"我的收藏列表"接口** |
| 浏览记录 | 渲染 `mockArticles`（空数组） | 永远显示空态；后端 `GET /article/read/history` 已存在但**未返回每条记录的浏览时间**，前端 API `getReadingHistory()` 已封装未使用 |
| 设置-个人信息 | 已接 `POST /profile/update`、头像上传 | ✅ 已实现 |
| 设置-账户安全 | 邮箱验证已接真实 API；**密码修改为 `setTimeout` 模拟** | 后端 `POST /auth/password/update` 与前端 `updatePassword()` 均已存在，UI 未接线 |
| 设置-外观 | 主题切换已实现；**"减弱动态效果"死复选框** | 无状态、无效果 |
| 设置-通知 | **两个死复选框**（邮件摘要/新评论） | 无状态、无持久化 |
| 侧边栏统计 | 文章/点赞/关注写死为 0 | 后端 `GET /article/stats/me` + 前端 `getMyStats()` 已存在未使用 |

后端已有能力（无需新建表）：
- `POST /article/interaction/{id}/favorite` / `unfavorite` / `GET /{id}/favorited`（article-service）
- `GET /article/read/history`（article-service，基于 `article_log` 表，按用户去重、按 view_at 倒序）
- `POST /auth/password/update`（user-service，DTO: oldPassword/newPassword/confirmPassword）
- `GET /article/stats/me`（article-service，返回 articleCount/viewCount/likeCount/favoriteCount）
- 网关 `auth.whitelist` 中 `/article-service/article/read/**` 为公开路径，`/article-service/article/interaction/**`（除 `*/view`）默认需登录 —— 新收藏列表接口放在 `interaction` 下即可自动获得登录保护，**网关无需改动**。

## 二、改动方案

### A. 后端 article-service（纯增量 + 小幅扩展，不破坏现有接口）

1. **`domain/vo/ArticleInfoVo.java`**：新增两个可选字段
   - `viewedAt`、`favoritedAt`（`LocalDateTime` + `@JsonFormat`），其他接口序列化为 `null`，不影响现有消费方。

2. **`dto/ArticleLogDao.java` + `dto/impl/ArticleLogDaoImpl.java`**：新增
   - `List<ArticleLog> listHistoryLogs(String userId)`：只查 `articleId + viewAt`，按 `view_at` 倒序（复用现有分页机制）。

3. **`service/impl/ArticleReadBizServiceImpl.java`**：`listHistory()` 改用 `listHistoryLogs`
   - 按 view_at 倒序去重建 id 列表（保持现有排序语义不变），同时构建 `articleId → viewedAt` 映射回填到 VO，供前端展示"浏览于 xx"。

4. **`dto/ArticleFavoriteDao.java` + `dto/impl/ArticleFavoriteDaoImpl.java`**：新增
   - `List<ArticleFavorite> listFavorites(String userId)`：按 `favorited_at` 倒序。

5. **`service/ArticleInteractionBizService.java` + `impl/ArticleInteractionBizServiceImpl.java`**：新增
   - `Result<List<ArticleInfoVo>> listFavorites()`：
     - 游客拒绝（与 favorite/unfavorite 同口径）；
     - 查收藏记录 → 按序加载文章 → 复用统计/作者信息补全逻辑（将 ReadImpl 中的 `enrichWithStats`/`enrichWithAuthorInfo` 抽为 `ArticleBaseBizService` 的 protected 方法，避免复制两遍）→ 回填 `favoritedAt`。

6. **`controller/ArticleInteractionController.java`**：新增
   - `GET /article/interaction/favorites`（单段路径，与 `/{articleId}/liked` 等两段路径无冲突）。

### B. 前端

1. **`src/api/article.ts`**
   - `ArticleInfo` 增加可选 `viewedAt?: string; favoritedAt?: string`；
   - 新增 `getFavoriteArticles()` → `GET /article/interaction/favorites`。

2. **`src/views/UserProfile.vue`**
   - **收藏 tab**：进入页面/切换 tab 时拉取收藏列表，`ArticleCard` 网格渲染（映射 id/title/summary/date=publishAt/image=coverUrl/authorName/authorAvatar/viewCount/likeCount/favorites），每张卡片带"取消收藏"按钮（调 unfavorite 后本地移除并提示）；含加载态与错误态。
   - **历史 tab**：`getReadingHistory()` 渲染列表，展示 `viewedAt` 日期（无 viewedAt 时回退 publishAt），"再次阅读"按钮跳转 `article-detail`；含加载态与错误态。
   - **设置-账户安全**：密码修改接线真实 `updatePassword()` API——保留现有前端校验（大写/小写/数字/长度/两次一致），成功后清空表单并提示；失败用后端 `errMsg` 提示。
   - **设置-外观**：减弱动效接 `localStorage`（key: `reduced-motion`），切换时给 `<html>` 加/去 `reduce-motion` class；在 `src/styles/main.scss` 增加全局规则（动画/过渡时长压缩）。
   - **设置-通知**：两个开关状态持久化到 `localStorage`（key: `notification-prefs`），刷新/重进后保持。
   - **侧边栏统计**：`getMyStats()` 回填文章数/获赞数，第三项"关注"改为展示**收藏数**（复用 `t('profile.favorites')` 标签，后端无关注数据）。
   - 移出/删除 `mockArticles`、`generateHeatmapData` 中的 mock 引用不动的部分：热力图保留现有模拟（无后端数据源，本次不动）。

3. **`src/locales/en.ts` / `zh.ts`**：补齐新增文案 key（加载失败、取消收藏、密码修改成功等）。

### C. 验证

1. 后端：`JAVA_HOME="D:\DevelopKit\jdk-21.0.8"` 下 `mvn compile` 编译 article-service（本计划不改 common/service-api，无需 install；不跑 mvn test —— 需要 DB/Redis 环境且与前端测试并行有风险）。
2. 前端：`npm run build`（vue-tsc 类型检查 + vite 构建）+ `npm test`（vitest）。
3. 手工冒烟（需本地起网关 + 各服务）：
   - 登录后进 Profile → 收藏 tab 显示已收藏文章，点取消收藏后列表刷新；
   - 打开一篇文章 → 回 Profile 历史 tab 出现该文章及浏览时间，点"再次阅读"可跳转；
   - 设置中改密码成功后可退出用新密码登录；
   - 外观/通知开关刷新页面后状态保持；减弱动效开启后页面动画明显减少；
   - 侧边栏显示真实文章/点赞/收藏统计。

## 三、风险与说明

- `ArticleInfoVo` 新增字段为可选，老接口输出 `null`，前端旧调用不受影响。
- 新收藏接口放在 `interaction` 路径下，网关默认要求登录，与点赞/收藏写操作的安全口径一致。
- 通知开关目前仅本地持久化（后端无通知订阅表，消息服务仅有 WebSocket 推送，无偏好存储）；如后续需要服务端同步偏好，可在 user-service 加 `user_preference` 表再迁移，本计划不做。
- 历史 tab 暂无"清空历史"后端接口，本计划不新增（可在后续迭代补充 DELETE 接口）。

## 四、执行记录（2026-08-16 完成）

### 后端（article-service，+211/-2）
- ✅ `ArticleInfoVo` 增加 `viewedAt` / `favoritedAt`（可选，@JsonFormat）
- ✅ `ArticleLogDao#listHistoryLogs` + `listHistory()` 回填浏览时间（保持原有排序/去重语义）
- ✅ `ArticleFavoriteDao#listFavorites` + `ArticleInteractionBizService#listFavorites`（游客拒绝、按收藏时间倒序、补全统计与作者信息、回填 favoritedAt）
- ✅ `GET /article/interaction/favorites` 控制器接口（网关无需改动）
- ✅ `JAVA_HOME=D:\DevelopKit\jdk-21.0.8 mvn compile` 通过（EXIT=0）

> 实现偏差：统计/作者信息补全逻辑没有按计划上提到 `ArticleBaseBizService`，而是在
> `ArticleInteractionBizServiceImpl` 内复制了一份私有实现 —— 避免向基类注入
> `ArticleDao/ArticleStatsDao/UserClient` 字段后在 5 个子类中造成同名字段遮蔽与重复注入，
> 风险更低，行为一致。

### 前端
- ✅ `api/article.ts`：`getFavoriteArticles()`、`ArticleInfo.viewedAt/favoritedAt`、`UserArticleStats.favoriteCount/viewCount`
- ✅ 收藏 tab：真实收藏列表（ArticleCard 网格 + hover 取消收藏按钮 + 加载态/空态）
- ✅ 历史 tab：真实浏览历史（浏览时间 + 摘要 + 再次阅读跳转 + 加载态/空态）
- ✅ 设置-安全：密码修改接 `POST /auth/password/update`（保留前端校验、成功后清空、失败提示后端 errMsg）
- ✅ 设置-外观：减弱动效接 localStorage（`reduce-motion` class + main.scss 全局规则）
- ✅ 设置-通知：开关持久化到 localStorage（`notification-prefs`）
- ✅ 侧边栏统计：接 `GET /article/stats/me`（文章/点赞/收藏）
- ✅ i18n：en/zh 补齐 `common.loading`、`profile.unfavorite/unfavoriteSuccess/passwordUpdated/passwordUpdateFailed`
- ✅ 顺手清理 UserProfile.vue 一处原有无用变量（`v-for` 的 `index`）

### 验证结果
- 后端 `mvn compile`：✅ EXIT=0
- 前端 `vue-tsc`：本次改动的文件 0 错误（全仓库错误数 38 → 36，剩余 36 个均为改动前已存在的其他文件问题，如 Footer/NavBar 未用导入、vite.config `test` 配置、`findLastIndex` lib 版本等，`npm run build` 在改动前即失败）
- 前端 `vitest`：✅ 62/62 通过
- 未跑后端 mvn test（需 DB/Redis 环境，计划内约定仅编译）

### 待手工冒烟（需本地起网关 + 服务）
1. 登录 → Profile 收藏 tab 显示已收藏文章；hover 点 × 取消收藏，列表即时移除且 toast 提示
2. 打开任意文章 → 回 Profile 历史 tab 出现该文章与"浏览于 xx"时间；点"再次阅读"跳转详情
3. 设置-安全修改密码 → 成功 toast；退出后用新密码登录
4. 外观/通知开关刷新后状态保持；开启减弱动效后页面动画消失
5. 侧边栏显示真实文章/点赞/收藏数

## 五、测试补充记录（2026-08-16，应要求补测）

### 后端（article-service，Mockito 单测，JDK21 运行）
- ✅ 新增 `ArticleInteractionBizServiceImplTest`（4 用例）：游客拒绝、空列表、按收藏时间倒序 + favoritedAt 回填 + 统计/作者补全、收藏指向已删文章的容错
- ✅ 新增 `ArticleReadBizServiceImplTest`（3 用例）：空历史、重复浏览去重取最近时间 + viewedAt 回填、脏数据容错
- ✅ 修复**仓库原有的过期测试** `ArticleCommentBizServiceImplTest`（构造 5 参、`PageVo<CommentWrapperVo>` 返回、回复预览改为批量计数、null 参数改用 `isNull()` 匹配），7 用例恢复通过
- ✅ `mvn test -Dtest=...` 3 个测试类共 **14/14 通过**（测试类通过匿名子类覆写 getPageVo/getUserId 绕过 PageHelper 与 Servlet 上下文，无需 DB/Redis）

### 前端（vitest）
- ✅ 新增 `profile-api.test.ts`（3 用例，adapter-mock 契约）：favorites/history/unfavorite 的 URL 与方法
- ✅ 新增 `profile-tabs.test.ts`（9 用例，@vue/test-utils + i18n + memory router）：
  - 收藏：挂载加载渲染、取消收藏调接口并移除、侧边栏统计来自 getMyStats
  - 历史：切换 tab 加载渲染、再次阅读跳转 article-detail
  - 设置：改密码调接口并清空表单、弱密码不调接口、减弱动效 localStorage + html class 双向、通知开关持久化
- ✅ `profile-tabs-localstorage-setup.ts`：首个 import 注入登录态，保证 store 模块初始化时读到 userInfo
- ✅ 全量 `npm test`：**74/74 通过**（新增 12 条）；新增测试文件 vue-tsc 0 错误（存量测试文件的类型问题未触碰）

> 说明：本次补测为"先实现后补测"（对已有实现锁定行为），未重走严格 TDD 红绿循环；
> 后续新功能建议按 Red-Green-Refactor 先写测试。

## 六、存量问题清理记录（2026-08-16，应要求全修）

### 前端（vue-tsc 37 错误 → 0）
- 清理未用导入/变量：App.vue、AnimatedTextLogo.vue、Footer.vue、NavBar.vue、TextLogo.vue（死 props）、CreatorCenter.vue、CreatorPublished.vue、AboutView.vue、InteractiveBackground.vue（死函数 getThemeColors/getCssVar）、agent/ChatHistoryItem.vue（死 computed）、useAgentChat.ts（watch/shallowRef/useToast）、AgentView.vue（未用参数）、ArticleDetail.vue（死 ref/computed：authorInfo/authorName/readingTime/breadcrumbItems + 相关导入）、HomeView.vue（死函数 fetchAuthorProfiles + 导入）、ArticleCard.vue（死 computed formattedDate）、AuthModal.vue（死函数 switchToWeChat/switchToPassword，模板按钮本就注释停用）
- 测试文件：agent-chat/reply-pagination 未用导入；agent-layout-contract 加 `/// <reference types="node" />` 解决 node:fs/node:url 类型
- vite.config.ts：`defineConfig` 改从 `vitest/config` 导入（修复 `test` 属性类型）；`manualChunks` 对象形式改函数形式（Rollup 4 类型已移除对象形式，行为对齐原配置）
- CreatorArticleTable.vue 的 `categoryCode` 在 `ArticleInfo` 增加可选字段（后端暂未返回，显示 '-'，行为不变）——**2026-08-22 分类系统已彻底移除**，该字段连同表格"分类"列一并删除
- useAgentChat.ts 的 `findLastIndex`（需 es2023 lib）改为倒序循环，避免改动 tsconfig lib

### 验证结果
- `npx vue-tsc -b --force`：**0 错误**（原 37 个）
- `npm run build`：✅ 通过（vue-vendor / md-editor 分包正常）
- `npm test`：✅ 74/74
- 后端 article-service 全量 `mvn test`（JDK21）：✅ **26/26 BUILD SUCCESS**（原担心的 AppTest/testForCreateArticle/testMQ/testGetUserInfoOpenFeign 无有效用例，不构成阻塞）
- 后端 user-service 全量 `mvn test`（JDK21）：✅ **29/29 BUILD SUCCESS**

