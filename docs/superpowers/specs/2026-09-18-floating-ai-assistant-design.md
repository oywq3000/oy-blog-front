# 可悬浮 AI 助手（Floating Assistant）设计

日期：2026-09-18
状态：已批准
关联代码：`/agent` 全屏页（[AgentView.vue](../../../src/views/AgentView.vue)）与 `useAgentChat` 单例

## 1. 背景与目标

当前 AI 助手是 `/agent` 全屏页面，必须离开浏览内容才能使用，体验割裂。目标：参照商业产品（Intercom / Crisp / Drift / Dify 聊天挂件、ChatGPT/Kimi 网页浮球）的「悬浮球 → 小窗」模式，做成全站常驻的可悬浮助手，平时是一个球，点开是一个小对话框。

成功标准：
- 阅读任意页面时都能随时唤起 AI 问答，不离开当前页
- 小窗会话与全屏页会话**同一份**（发完消息去全屏页能接着聊）
- 不打断浏览：不阻塞滚动、不盖模态层、首访引导一次性
- 移动端可用：面板变全屏 bottom-sheet

## 2. 商业模式的参考要点

- **三级渐进形态**：球（常驻右下角，含未读/进行中提示）→ 点开弹小窗 → 小窗内「展开全屏」做深度对话与历史管理
- **窗口三件套**：header（标题+状态+操作）/ body（欢迎落地页或消息流）/ footer（输入框+深度思考+模型）。**无侧栏**，历史归全屏页
- **全站级覆盖层**：切路由会话不丢（本项目由 `useAgentChat` 模块级单例天然支持）
- **移动端**：小窗 → 全屏 bottom-sheet
- **不打扰**：z-index 高于内容、低于模态层；首访时球旁 Intro 气泡自动消失

## 3. 已确认的决策

| 问题 | 决策 |
|---|---|
| 全屏 `/agent` 页去留 | **双形态并存**：保留全屏页；小窗内放「展开全屏」入口 |
| 浮球覆盖范围 | **全站常驻，个别页隐藏**：`/agent` 全屏页隐藏；编辑器全屏写作模式隐藏 |
| 小窗内历史会话 | **小窗轻量，历史归全屏**：小窗只有落地页 ↔ 当前会话 ↔ 新对话 ↔ 展开全屏，不做抽屉 |
| 实现方案 | 方案 A：全局浮窗组件 + 复用现有 agent 全家桶 |

## 4. 架构概览

```
App.vue ──<FloatingAssistant/>── (Teleport 到 <body>)
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         │  useFloatingAssistant（UI 状态，模块单例，可测）       │
         │  open / hintSeen(localStorage) / 路由隐藏判定        │
         └─────────────────────────┬─────────────────────────┘
                             FloatingChatPanel
                    header：状态点 + 设置齿轮 + 展开全屏 + 最小化
                    body：ChatWelcome(compact) 或 ChatMessageList
                    footer：ChatInput（深度思考/模型/停止/重发）
                       └─ ChatSettingsModal（设置弹窗，复用）
                       绑定 useAgentChat 单例状态（与全屏页共享）
```

状态分层：
- **业务状态**：`useAgentChat`（已有模块级单例，不经改动直接用）——会话、消息、流式、设置
- **UI 状态**：`useFloatingAssistant`（新增）——面板开合、首访气泡、路由可见性；与业务状态解耦，便于单测

数据流：小窗与全屏页读写同一 `useAgentChat` 单例 → 无数据同步问题；「展开全屏」用 `router.push('/agent')`（或 `/agent/:conversationId`），落地即同一会话。

## 5. 文件改动清单

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/components/agent/FloatingAssistant.vue` | 新增 | 容器：球 + 面板 + 首访气泡，Teleport 到 body，z-index 950 |
| `src/components/agent/FloatingChatPanel.vue` | 新增 | 小窗主体，组合复用四个现有组件 |
| `src/composables/useFloatingAssistant.ts` | 新增 | 纯逻辑 + 模块级单例状态，全部可单测 |
| `src/utils/zIndex.ts` | 改 | 新增 `FLOATING_Z_INDEX = 950` |
| `src/App.vue` | 改 | 挂 `<FloatingAssistant />`（与 `<Toast />` 同层） |
| `src/components/agent/ChatWelcome.vue` | 改 | 加 `compact` prop（小窗缩小头像/标题/建议条密度） |
| `src/locales/zh.ts` / `en.ts` | 改 | 浮窗文案（注意裸 `@` 陷阱） |

复用（**零改动**）：`ChatMessageList`（自带滚动/吸底/回到最新 FAB）、`ChatInput`（深度思考/模型/停止/重发）、`ChatSettingsModal`（设置弹窗，2000 > 950 能盖在面板上）。

## 6. 交互规格

### 6.1 球（Launcher）
- 常驻右下角 `bottom: 24px; right: 24px`，Sparkle 图标，主题渐变底，圆角点击态
- `streaming === true` 且面板关闭时：球呈轻微脉冲，暗示"正在回答"
- 全站可见，唯一例外见 6.4

### 6.2 首访气泡（Intro Hint）
- 仅首次：`localStorage` 键 `oy_blog_floating_hint_seen` 不存在时显示
- 球上方气泡：「你好，有什么可以帮你？」+ 指向三角；6s 自动消失；点过即标记已见，不再出现

### 6.3 面板（Panel）
- 桌面：宽 384px，`max-height: min(76vh)`，圆角 16px + 阴影 + 边框，右上角出现在球上方
- 结构：header / body / footer
  - header：状态点 + 标题「OY AI 助手」+ 设置齿轮（开 ChatSettingsModal）+ 展开全屏（`router.push` 到 `/agent`）+ 最小化（收球）
  - body：无会话 → `ChatWelcome(compact)`；有会话 → `ChatMessageList`
  - footer：复用 `ChatInput`；「新对话」按钮在会话中存在时显示（调用 `createConversation`）
- 开合动画：scale + 轻微透明度过渡

### 6.4 隐藏规则（纯函数，见 `useFloatingAssistant`）
```
visible = routeName 不在 {agent, agent-conversation}
          && 编辑器未处于全屏写作模式
```
- `/agent` 与 `/agent/:conversationId`：隐藏（同一功能两入口，避免重复）
- 编辑器全屏：`MarkdownLiveEditor` 进入/退出全屏时置一个全局信号（模块级 ref），浮球监听

### 6.5 打开 / 关闭
- 点球：开/关切换
- 面板内点 X / 最小化：收起
- 点面板外部（document click 落在 widget 根外）：收起
- ESC：收起
- 切路由：**保持展开**（跨页对话不中断）

### 6.6 响应式（< 768px）
- 面板变全屏 bottom-sheet：`position: fixed; inset: 0`，头部 `padding-top: env(safe-area-inset-top)`

## 7. 层级规范

沿用 [zIndex.ts](../../../src/utils/zIndex.ts) 的全局规范：浮球/面板整体 **Teleport 到 body**（规避 `.app-content{ z-index: 1 }` 层叠上下文陷阱，与 Toast 同理）。

| 层 | z-index |
|---|---|
| 内容 / BackToTop | 1 / 900 |
| **球 + 面板（新增 `FLOATING_Z_INDEX`）** | **950** |
| 设置弹窗 / 登录模态 | 2000 / 9999 |
| Toast | 100000 |

## 8. i18n

`zh.ts` / `en.ts` 新增文案：面板标题、展开全屏、最小化、新对话、首访气泡语等。**不使用裸 `@`**（既有回归测试在 `src/locales/compile.test.ts`）。

## 9. 测试

- `useFloatingAssistant.test.ts`：开/关/切换、外部点击判定、ESC 处理、首访 bubbles 一次性、路由可见性纯函数
- `FloatingChatPanel` / `FloatingAssistant` 挂载冒烟测试（happy-dom：组件 mount 用 `attachTo`，不依赖 var() 内联样式断言 —— 照既有记忆处理）
- 回归：全量 vitest 用 `--no-file-parallelism` 跑法；现有 `useAgentChat.test.ts` 不动

## 10. 非目标（YAGNI，留作未来）

- 拖拽球换角位置
- 「感知当前文章」上下文注入（如点选"总结这篇文章"）
- 未读消息角标 / 推送
- 小窗内历史会话抽屉

## 11. 风险与待验证

- **ChatWelcome 在小窗的密度**：`compact` prop 具体尺寸以 384px 宽度打磨（头像 ~44px、标题 ~16px、chip 更紧凑）
- **editor 全屏信号**：先确认 `MarkdownLiveEditor` 全屏是自定义 class（非原生 Fullscreen API），用模块级 ref 通信
- **跨路由保持展开**：若实测打扰可一键改为切路由自动收起（集中于 `useFloatingAssistant` 一处）
- **与既有 z-index 事故的交互**：遵循"Teleport + 显式 z-index + 常量单源"既有规范，避免重蹈全屏层级覆盖覆辙