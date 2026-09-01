<p align="center">
  <img src="public/logo.svg" alt="OY Blog Logo" width="120" height="120">
  <h1 align="center">OY Blog Web</h1>
  <p align="center">基于 Vue 3 + TypeScript 的现代化个人博客前端系统</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.4+-4FC08D?style=flat-square&logo=vue.js&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Sass-Latest-CC6699?style=flat-square&logo=sass&logoColor=white" alt="Sass">
  <img src="https://img.shields.io/badge/Vitest-4.x-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square&logo=opensourceinitiative&logoColor=white" alt="License">
</p>

<br>

## 项目介绍

**OY Blog Web** 是 OY Blog 的前端部分，采用 **Vue 3 (Composition API + `<script setup>`)** + **TypeScript** 技术栈开发。项目秉持"简约而不简单"的设计理念，实现了全端响应式布局、沉浸式阅读体验、流畅的交互动画以及暗黑模式支持。

除常规的博客功能（文章、评论、搜索、标签、系列）外，前端还集成了 **AI 对话助手**（SSE 流式输出、深度思考模式）与 **创作中心**（文章编辑、发布、审核流程管理），并与后端的微服务网关深度协同，共同构成一个功能完备的现代化博客平台。

---

## 功能特性

<table align="center">
    <tr>
        <td width="50%">
            <h3>
                <img src="https://api.iconify.design/mdi:book-open-page-variant-outline.svg?color=%23000000" width="20" height="20" valign="middle">
                阅读体验
            </h3>
            <ul>
                <li><b>Markdown 渲染</b>: marked + highlight.js 代码高亮，支持图表、公式</li>
                <li><b>目录生成</b>: 自动生成文章侧边栏目录 (TOC)，随滚动高亮</li>
                <li><b>阅读统计</b>: GitHub 风格贡献热力图 (Heatmap)、阅读时长估算</li>
                <li><b>内容聚合</b>: 热门 / 推荐 / 精选文章卡片、标签云、系列文章</li>
                <li><b>暗黑模式</b>: 一键切换深色/浅色主题，自动持久化</li>
                <li><b>响应式布局</b>: 完美适配 Mobile, Tablet, Desktop</li>
            </ul>
        </td>
        <td width="50%">
            <h3>
                <img src="https://api.iconify.design/mdi:robot-outline.svg?color=%23000000" width="20" height="20" valign="middle">
                AI 对话助手
            </h3>
            <ul>
                <li><b>流式对话</b>: SSE 逐字输出，可随时中断生成</li>
                <li><b>深度思考</b>: Deep Thinking 模式，展示模型推理过程</li>
                <li><b>会话管理</b>: 历史会话按时间分组，支持重命名 / 删除 / 搜索</li>
                <li><b>智能推荐</b>: 开屏推荐问题、消息点赞 / 点踩反馈</li>
                <li><b>游客模式</b>: 未登录也可体验，基于 GUEST_ID 保持会话</li>
            </ul>
        </td>
    </tr>
    <tr>
        <td>
            <h3>
                <img src="https://api.iconify.design/mdi:forum-outline.svg?color=%23000000" width="20" height="20" valign="middle">
                互动交流
            </h3>
            <ul>
                <li><b>多级评论</b>: 支持无限级嵌套回复与展开</li>
                <li><b>懒加载</b>: 评论回复按需加载，优化首屏性能</li>
                <li><b>点赞互动</b>: 文章 / 评论点赞与收藏</li>
            </ul>
        </td>
        <td>
            <h3>
                <img src="https://api.iconify.design/mdi:account-circle-outline.svg?color=%23000000" width="20" height="20" valign="middle">
                用户中心
            </h3>
            <ul>
                <li><b>身份认证</b>: 登录 / 注册 / 找回密码，邮箱验证 + 图形验证码</li>
                <li><b>Token 续期</b>: JWT + Refresh Token 自动续期，401 静默刷新</li>
                <li><b>个人资料</b>: 头像上传、昵称修改、简介编辑</li>
                <li><b>公开主页</b>: 用户公开信息页 + 阅读历史记录</li>
            </ul>
        </td>
    </tr>
    <tr>
        <td>
            <h3>
                <img src="https://api.iconify.design/mdi:lead-pencil.svg?color=%23000000" width="20" height="20" valign="middle">
                创作中心
            </h3>
            <ul>
                <li><b>文章编辑</b>: md-editor-v3 全屏 Markdown 编辑器，实时预览</li>
                <li><b>内容管理</b>: 已发布 / 草稿箱 / 审核中 三个工作台视图</li>
                <li><b>审核流程</b>: 文章审核状态流转，拒绝原因回显</li>
                <li><b>封面图片</b>: 文章封面、正文图片上传</li>
            </ul>
        </td>
        <td>
            <h3>
                <img src="https://api.iconify.design/mdi:code-tags-check.svg?color=%23000000" width="20" height="20" valign="middle">
                工程特性
            </h3>
            <ul>
                <li><b>类型安全</b>: 全 TypeScript 开发，类型提示友好</li>
                <li><b>国际化</b>: 完整的中英文语言包支持 (vue-i18n)</li>
                <li><b>组件化</b>: 高内聚低耦合的 Vue 组件设计</li>
                <li><b>性能优化</b>: 路由懒加载、依赖分包 (manualChunks)、Gzip 压缩、资源预加载</li>
                <li><b>视觉细节</b>: matter-js 物理粒子背景、GSAP 动效、3D 文字、加载动画</li>
                <li><b>工程化</b>: Vitest 单元测试 + vue-tsc 构建期类型检查</li>
            </ul>
        </td>
    </tr>
</table>

---

## 技术栈

<table align="center">
    <tr>
        <td align="center" width="250">
            <img src="https://api.iconify.design/mdi:monitor-dashboard.svg?color=%23000000" width="20" height="20" valign="middle">
            <b>核心框架</b>
        </td>
        <td align="center" width="250">
            <img src="https://api.iconify.design/mdi:hammer-wrench.svg?color=%23000000" width="20" height="20" valign="middle">
            <b>构建与工程</b>
        </td>
        <td align="center" width="250">
            <img src="https://api.iconify.design/mdi:palette-swatch.svg?color=%23000000" width="20" height="20" valign="middle">
            <b>UI 与 交互</b>
        </td>
    </tr>
    <tr>
        <td valign="top">
            <ul>
                <li><b>Core</b>: Vue 3.4 (Composition API)</li>
                <li><b>Language</b>: TypeScript 5.x</li>
                <li><b>Router</b>: Vue Router 4 (懒加载)</li>
                <li><b>State</b>: Vue Reactive Store（自定义响应式 Store）</li>
                <li><b>I18n</b>: Vue I18n 9 (中 / 英)</li>
            </ul>
        </td>
        <td valign="top">
            <ul>
                <li><b>Build</b>: Vite 5 (依赖分包优化)</li>
                <li><b>Network</b>: Axios（拦截器 + 统一错误处理）</li>
                <li><b>Test</b>: Vitest + happy-dom + Vue Test Utils</li>
                <li><b>Icons</b>: unplugin-icons + Iconify</li>
                <li><b>Style</b>: SCSS (Sass) + CSS 变量主题</li>
            </ul>
        </td>
        <td valign="top">
            <ul>
                <li><b>Animation</b>: GSAP 3 + matter-js (物理背景)</li>
                <li><b>Markdown 渲染</b>: marked + highlight.js</li>
                <li><b>Markdown 编辑</b>: md-editor-v3</li>
                <li><b>Design</b>: Glassmorphism 玻璃拟态</li>
            </ul>
        </td>
    </tr>
</table>

---

## 系统架构

前端为纯 SPA，通过 `/api` 前缀经 Vite 开发代理 / Nginx 反向代理访问后端的**微服务网关**（默认 `localhost:8080`），网关按前缀路由至各业务服务：

```
Browser (SPA)  ── /api/* ──►  Gateway (8080)  ──┬─► user-service    登录注册 / 用户资料
                (同源代理)                      ├─► article-service  文章 / 评论 / 封面上传
                                                ├─► agent-service    AI 对话 (SSE)
                                                └─► search-service   Elasticsearch 全文搜索
```

* 身份认证采用 **Sa-Token**（JWT Access Token + Refresh Token 自动续期，401 静默刷新后重放请求）
* 语言切换通过请求头 `lang: zh | en` 透传后端
* AI 对话走 **SSE**（`/api/agent-service/chat/stream`），Nginx 侧已关闭缓冲以确保流式输出
* 开发环境 API 配置见 [vite.config.ts](vite.config.ts) 的 `server.proxy`

---

## 目录结构

项目结构清晰，遵循 Vue 3 最佳实践与模块化开发规范：

| 目录名称                       | 职责说明                                           | 关键内容                                                                                                    |
| :----------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **src/api**              | **接口层**封装 Axios 请求，集中管理 API 定义 | `request.ts`(拦截器/Token 续期), `user.ts`, `article.ts`, `agent.ts`, `comment.ts`, `upload.ts` |
| **src/components**       | **组件层**通用的 UI 组件，复用性强           | `NavBar`, `ArticleCard`, `MarkdownViewer`, `agent/`(AI 聊天组件), `icons/`(SVG 图标)              |
| **src/composables**      | **组合式函数**复用逻辑封装 (Hooks)           | `useTheme.ts`, `useToast.ts`, `useAgentChat.ts`, `useComments.ts`, `useCaptcha.ts`                |
| **src/views**            | **视图层**页面级组件，承载业务逻辑           | `HomeView`, `ArticleDetail`, `AgentView`, `CreatorCenter`, `UserProfile`                          |
| **src/store**            | **状态层**全局状态管理，响应式数据流         | `user.ts`, `app.ts`, `creator.ts`                                                                     |
| **src/router**           | **路由层**页面路由定义、权限守卫             | `index.ts` (requiresAuth 守卫 + 加载动画)                                                                 |
| **src/styles**           | **样式层**全局 SCSS 变量、混合与主题定义     | `variables.scss`, `theme.css`, `code-block.scss`                                                      |
| **src/locales**          | **语言包**国际化资源文件                     | `zh.ts`, `en.ts`                                                                                        |
| **src/utils**            | **工具层**通用辅助函数与类库                 | `heatmap.ts`, `readingTime.ts`, `errorHandler.ts`, `text3dEffect.ts`                                |
| **src/config**           | **站点配置**全局常量                         | `site.ts` (GitHub 链接 / 站长 ID)                                                                         |
| **src/types**            | **类型层**全局 TS 类型定义                   | `user.ts`, `agent.ts`                                                                                   |
| **deploy**               | **部署层**生产部署脚本与配置                 | `docker-compose.yml`, `nginx.conf`, `deploy.sh`                                                       |
| **doc** / **docs** | **文档**技术方案与框架说明                   | `AUTH_FRAMEWORK.md`, `ERROR_HANDLING_FRAMEWORK.md`, `agent-api.md`                                    |

---

## 快速开始

### 环境准备

* **Node.js**: 18+（推荐 20+，Vite 5 要求）
* **Package Manager**: npm（项目使用 npm，其他包管理器亦可）
* **后端服务**: 需先启动 OY Blog 后端网关（默认 `localhost:8080`），或修改 [vite.config.ts](vite.config.ts) 中的代理目标

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/oywq3000/oy-blog.git
cd oy-blog-front
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 启动开发服务器

```bash
npm run dev
```

启动后访问：[http://localhost:5173](http://localhost:5173)（`/api` 请求自动代理到后端网关 `:8080`）

#### 4. 构建生产环境

```bash
npm run build
```

构建产物将输出到 `dist` 目录（含 `vue-tsc` 类型检查）。

#### 5. 运行测试

```bash
npm run test        # 单次运行
npm run test:watch  # 监听模式
```

> 提示：全量跑测试建议加 `--no-file-parallelism` 避免 worker 崩溃。

---

## 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。
