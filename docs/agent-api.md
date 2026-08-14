# AgentView 后端 API 与请求框架说明

> 文档基于 `src/views/AgentView.vue` 及其依赖链整理，最后更新：2026-08-13

## 1. 分层结构

```
AgentView.vue (视图层，事件绑定)
    ↓
src/composables/useAgentChat.ts (状态 + 业务逻辑，全局单例)
    ↓
src/api/agent.ts (API 封装，BASE = /api/agent)
    ├── axios 实例 (src/api/request.ts)  ← 常规 REST 请求
    └── 原生 fetch (SSE 流式)            ← 聊天流式响应
```

## 2. 请求框架

AgentView 使用**两条请求通道**：

### 2.1 REST 通道：axios 实例（[src/api/request.ts](../src/api/request.ts)）

```ts
axios.create({ baseURL: '', timeout: 10000, withCredentials: true })
```

- **请求拦截器**：自动附加 `Authorization: Bearer <token>`（localStorage 读取）和 `lang: zh|en` 头
- **响应拦截器**：
  - 统一响应体 `{ isSuccess, errCode, errMsg, data }`，`isSuccess === false` 时 reject 并抛出后端 `errMsg`
  - **401 自动续期**：调用 `/api/user-service/auth/refresh` 刷新 token，并发请求排队等待、刷新后重放；刷新失败派发 `auth:unauthorized` 事件并清空登录态
  - 非 401 错误自动弹全局 Toast
- **重要**：拦截器返回的是整个 body（`res`），所以 api 层全部 `as any` 并手动解包 `res.data ?? res`

### 2.2 SSE 流式通道：原生 fetch（[src/composables/useAgentChat.ts:359-456](../src/composables/useAgentChat.ts#L359-L456)）

- 聊天请求不用 axios（无法流式读取），直接用 `fetch` 发 POST
- **手动**从 localStorage 取 token 拼 `Authorization` 头（不走 axios 拦截器）
- 用 `AbortController` 实现"停止生成"
- 逐行解析 SSE 帧：`event: token|thinking|done|error` + `data: <JSON>`

### 2.3 开发代理（[vite.config.ts](../vite.config.ts)）

- `/api` → `http://localhost:8080`，`rewrite` 去掉 `/api` 前缀，`changeOrigin: true`，并强制设置 `Referer`/`Origin` 头（规避 Sa-Token CORS 校验）

## 3. 后端 API 清单

所有 REST 接口基地址 `/api/agent`（代理后实际为 `http://localhost:8080/agent/...`）：

| # | 方法   | 路径                                         | 参数/请求体                                          | 响应                                                         | 用途             | 调用位置                                |
| - | ------ | -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ | ---------------- | --------------------------------------- |
| 1 | GET    | `/api/agent/conversations`                 | query:`page`, `size`                             | `{ data: Conversation[], total, currentPage, totalPages }` | 会话列表（分页） | `loadConversations`                   |
| 2 | GET    | `/api/agent/conversations/{id}/messages`   | —                                                   | `Message[]`                                                | 会话历史消息     | `loadMessages`（切换会话时懒加载）    |
| 3 | DELETE | `/api/agent/conversations/{id}`f           | —                                                   | `void`                                                     | 删除会话         | `deleteConversation`                  |
| 4 | PATCH  | `/api/agent/conversations/{id}`            | `{ title }`                                        | `void`                                                     | 重命名会话       | `renameConversation`                  |
| 5 | POST   | `/api/agent/conversations/{id}/stop`       | —                                                   | `void`                                                     | 服务端停止生成   | `stopStreaming`                       |
| 6 | GET    | `/api/agent/suggestions`                   | —                                                   | `SuggestedQuestion[]`                                      | 推荐问题         | `loadSuggestedQuestions`（onMounted） |
| 7 | POST   | `/api/agent/messages/{messageId}/feedback` | `{ feedback: 'like' \| 'dislike' }`                 | `void`                                                     | 消息点赞/点踩    | `handleFeedback`                      |
| 8 | POST   | `/api/agent/chat/stream`                   | `{ conversationId, message, deepThinking, model }` | **SSE 流**                                             | 发送消息（流式） | `sendMessage` → `streamChat`       |

### 3.1 SSE 事件格式（接口 #8）

响应为标准 SSE，`data` 为 JSON：

| event        | data 字段         | 前端处理                     |
| ------------ | ----------------- | ---------------------------- |
| `token`    | `{ content }`   | 追加到回复正文               |
| `thinking` | `{ content }`   | 追加到思考过程               |
| `done`     | `{ messageId }` | 结束流，回填服务端 messageId |
| `error`    | `{ message }`   | 标记消息失败                 |

## 4. 数据类型（[src/types/agent.ts](../src/types/agent.ts)）

```ts
interface Conversation { id, title, createdAt, updatedAt, messageCount }
interface Message {
  id, role: 'user' | 'assistant', content, thinking?, thinkingTime?,
  createdAt, streaming?, error?, errorMessage?
}
interface ChatSettings { model, temperature, deepThinking }
interface SuggestedQuestion { icon, text }
interface SendMessageOptions { deepThinking?, model?, files? }
```

## 5. AgentView 中的调用时机

| 时机                  | 调用                                                   | 说明                                            |
| --------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| 页面挂载（onMounted） | `loadConversations()` + `loadSuggestedQuestions()` | 两个请求并行发起                                |
| 新建会话              | **无后端请求**                                   | 本地生成`conv_*` ID，后端在首次聊天时隐式创建 |
| 切换会话              | `loadMessages(id)`                                   | 仅当本地无缓存时懒加载                          |
| 发送消息              | `streamChat`（SSE）                                  | 先本地乐观追加 user/assistant 消息，再流式填充  |
| 停止生成              | `abort()` + 接口 #5                                  | 双保险：本地中断 + 通知服务端                   |
| 删除/重命名           | 接口#3 / #4                                            | 先改本地状态，失败静默忽略                      |
| 点赞/点踩             | 接口#7                                                 | 失败静默忽略（`.catch(() => {})`）            |
| 清空全部会话          | **无后端请求**                                   | 仅清本地内存状态，后端数据不删除                |

## 6. 注意事项

1. **创建会话是纯本地行为**：`createConversation` 只生成 `conv_` 前缀的临时 ID 并写入本地列表，没有 `POST /conversations` 接口；后端应支持"首次收到该 conversationId 的聊天消息时自动建档"。
2. **`clearAllConversations` 未对接后端**：清空只影响前端内存，刷新后会话仍会从接口 #1 拉回。
3. **错误处理策略宽松**：绝大多数写操作 `catch(() => {})` 静默失败，仅乐观更新本地状态，不做回滚。
4. **api 层大量 `as any`**：因 axios 拦截器返回整个 body 而非 `data` 字段，类型标注不精确，需后端保证响应结构稳定。
5. **SSE 通道独立于 axios**：不经过 token 自动续期、lang 头、统一错误 Toast 等拦截器逻辑，需自行处理（目前仅手动拼 token）。
6. **推荐问题有本地兜底**：接口 #6 失败或返回空时，使用 [useAgentChat.ts:82-88](../src/composables/useAgentChat.ts#L82-L88) 中的 5 条默认问题。
