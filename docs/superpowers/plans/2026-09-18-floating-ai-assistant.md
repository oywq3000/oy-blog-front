# 可悬浮 AI 助手（Floating Assistant）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给博客加一个全站常驻的悬浮 AI 助手：平时是一个球，点开弹小窗对话，可与 `/agent` 全屏页共享同一份会话。

**Architecture:** 在 App 级挂一个 `FloatingAssistant` 组件（Teleport 到 body，z-index 950），内部由 `FloatingChatPanel` 组合复用已有的 `ChatWelcome`/`ChatMessageList`/`ChatInput`/`ChatSettingsModal`，全部状态来自 `useAgentChat` 模块级单例（与全屏页天然共享）；新增 `useFloatingAssistant` 承载 UI 状态（开合/首访气泡/可见性）并全部可单测。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript + vitest（happy-dom）

**Spec:** [2026-09-18-floating-ai-assistant-design.md](../specs/2026-09-18-floating-ai-assistant-design.md)

## Global Constraints

- **文案硬编码中文**（偏离 spec §8）：既有 agent 七个组件全部硬编码，仅 nav 标签接了 i18n；给浮窗单独做双语会产生同屏混排且制造未来统一改造债。若需双语，应随后对整个 agent 模块统一处理。**执行前如用户要求双语，需先扩大此计划**。
- z-index 遵循 `src/utils/zIndex.ts` 单源规范，模态 9999 / Toast 100000 保持不动，浮窗新增 `FLOATING_Z_INDEX = 950`。
- 单文件测试直接跑 `npx vitest run <路径>`；**全量用 `npx vitest run --no-file-parallelism`**（既有经验：防 worker 崩溃）。
- happy-dom 注意事项：不断言含 `var()` 的计算样式（断言 class/状态/DOM 结构）；mount 组件用 `attachTo: document.body`（Teleport 到 body 时必须）。
- 不得改动用户工作区未提交的 `src/components/ArticleRailCard.*` 文件。

---

### Task 1: useFloatingAssistant 组合式函数 + zIndex 常量

**Files:**
- Modify: `src/utils/zIndex.ts`（追加 `FLOATING_Z_INDEX`）
- Create: `src/composables/useFloatingAssistant.ts`
- Create: `src/composables/useFloatingAssistant.test.ts`

**Interfaces:**
- Produces:
  - `FLOATING_HINT_KEY = 'oy_blog_floating_hint_seen'`（string 常量）
  - `isFloatingAssistantVisible(routeName: string | null | undefined, editorFullscreen?: boolean): boolean`
  - `readHintSeen(): boolean`；`markHintSeen(): void`
  - `useFloatingAssistant(): { open: Ref<boolean>, editorFullscreen: Ref<boolean>, toggleOpen(): void, openPanel(): void, closePanel(): void, setEditorFullscreen(v: boolean): void }`

- [ ] **Step 1: 写失败测试**

创建 `src/composables/useFloatingAssistant.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isFloatingAssistantVisible,
  readHintSeen,
  markHintSeen,
  useFloatingAssistant,
  FLOATING_HINT_KEY,
} from './useFloatingAssistant'

beforeEach(() => {
  localStorage.removeItem(FLOATING_HINT_KEY)
  useFloatingAssistant().closePanel() // open 是模块级单例，倒干净
})

describe('isFloatingAssistantVisible', () => {
  it('全屏 AI 页隐藏', () => {
    expect(isFloatingAssistantVisible('agent')).toBe(false)
    expect(isFloatingAssistantVisible('agent-conversation')).toBe(false)
  })
  it('其余路由展示（含 null/undefined）', () => {
    expect(isFloatingAssistantVisible('home')).toBe(true)
    expect(isFloatingAssistantVisible(null)).toBe(true)
    expect(isFloatingAssistantVisible(undefined)).toBe(true)
  })
  it('编辑器全屏时隐藏', () => {
    expect(isFloatingAssistantVisible('article-detail', true)).toBe(false)
  })
})

describe('open/close 状态', () => {
  it('toggleOpen 往返切换', () => {
    const { open, toggleOpen } = useFloatingAssistant()
    expect(open.value).toBe(false)
    toggleOpen()
    expect(open.value).toBe(true)
    toggleOpen()
    expect(open.value).toBe(false)
  })
  it('openPanel / closePanel 定向设置', () => {
    const { open, openPanel, closePanel } = useFloatingAssistant()
    openPanel()
    expect(open.value).toBe(true)
    closePanel()
    expect(open.value).toBe(false)
  })
  it('setEditorFullscreen 更新信号', () => {
    const { editorFullscreen, setEditorFullscreen } = useFloatingAssistant()
    setEditorFullscreen(true)
    expect(editorFullscreen.value).toBe(true)
    setEditorFullscreen(false)
    expect(editorFullscreen.value).toBe(false)
  })
})

describe('首访气泡 localStorage', () => {
  it('未见过返回 false', () => {
    expect(readHintSeen()).toBe(false)
  })
  it('markHintSeen 后 readHintSeen 返回 true', () => {
    markHintSeen()
    expect(readHintSeen()).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败（模块不存在）**

Run: `npx vitest run src/composables/useFloatingAssistant.test.ts`
Expected: FAIL，模块导入错误。

- [ ] **Step 3: 实现**

修改 `src/utils/zIndex.ts`，追加一行：

```ts
export const FLOATING_Z_INDEX = 950;
```

创建 `src/composables/useFloatingAssistant.ts`：

```ts
import { ref } from 'vue'

// 浮球/面板隐藏的路由：全屏 AI 页不重复出现
export const AGENT_HIDDEN_ROUTES = ['agent', 'agent-conversation'] as const

export const FLOATING_HINT_KEY = 'oy_blog_floating_hint_seen'

// UI 状态用模块级单例：组件在 /agent 上被 v-if 卸载时状态不归零，回到内容页面板保持原样
const open = ref(false)
const editorFullscreen = ref(false)

export function isFloatingAssistantVisible(
  routeName: string | null | undefined,
  editorFullscreen = false
): boolean {
  if (editorFullscreen) return false
  return !(AGENT_HIDDEN_ROUTES as readonly string[]).includes(routeName ?? '')
}

export function readHintSeen(): boolean {
  try {
    return localStorage.getItem(FLOATING_HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function markHintSeen(): void {
  try {
    localStorage.setItem(FLOATING_HINT_KEY, '1')
  } catch {
    /* 忽略存储不可用 */
  }
}

export function useFloatingAssistant() {
  return {
    open,
    editorFullscreen,
    toggleOpen: () => {
      open.value = !open.value
    },
    openPanel: () => {
      open.value = true
    },
    closePanel: () => {
      open.value = false
    },
    setEditorFullscreen: (v: boolean) => {
      editorFullscreen.value = v
    },
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/composables/useFloatingAssistant.test.ts`
Expected: PASS（7 个用例全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/utils/zIndex.ts src/composables/useFloatingAssistant.ts src/composables/useFloatingAssistant.test.ts
git commit -m "feat: 新增悬浮助手 UI 状态组合式函数与可见性判定

open/close 状态、首访气泡 localStorage、路由+编辑器全屏可见性纯函数。

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: ChatWelcome 支持 compact 紧凑模式

**Files:**
- Modify: `src/components/agent/ChatWelcome.vue`
- Create: `src/components/agent/ChatWelcome.test.ts`

**Interfaces:**
- Consumes: 既有 `props.suggestedQuestions: SuggestedQuestion[]`、`emit('questionClick', text)`
- Produces: 新增可选 prop `compact?: boolean`（默认 false，全屏页不受影响）；根元素带条件类 `chat-welcome--compact`

- [ ] **Step 1: 写失败测试**

创建 `src/components/agent/ChatWelcome.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatWelcome from './ChatWelcome.vue'

const suggestions = [{ icon: '💡', text: 'Q1' }]

function mountWelcome(compact = false) {
  return mount(ChatWelcome, {
    props: { suggestedQuestions: suggestions, compact },
  })
}

describe('ChatWelcome', () => {
  it('默认（全屏页）非紧凑', () => {
    expect(mountWelcome(false).classes()).not.toContain('chat-welcome--compact')
  })
  it('compact 时根元素挂 chat-welcome--compact', () => {
    expect(mountWelcome(true).classes()).toContain('chat-welcome--compact')
  })
  it('点击建议问题触发 questionClick', async () => {
    const w = mountWelcome(true)
    await w.find('.chat-welcome__chip').trigger('click')
    expect(w.emitted('questionClick')![0]).toEqual(['Q1'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/agent/ChatWelcome.test.ts`
Expected: FAIL（compact 变化在测试 2、3；测试 3 通过与否取决于属性传递，跑通即可）。

- [ ] **Step 3: 实现**

修改 `ChatWelcome.vue`：

`<script setup>` 内：

```ts
defineProps<{
  suggestedQuestions: SuggestedQuestion[]
  compact?: boolean
}>()
```

根元素（`<div class="chat-welcome">`）改为：

```vue
<div class="chat-welcome" :class="{ 'chat-welcome--compact': compact }">
```

样式追加（scoped 内，`<style lang="scss">` 末尾）：

```scss
// 悬浮小窗紧凑模式：头像/标题缩小、去副标题、建议胶囊更紧凑
.chat-welcome--compact {
  padding: 16px 12px;

  .chat-welcome__avatar {
    width: 44px;
    height: 44px;
    font-size: 22px;
    margin-bottom: 10px;
  }

  .chat-welcome__title {
    font-size: 16px;
    margin-bottom: 4px;
  }

  .chat-welcome__subtitle {
    display: none;
  }

  .chat-welcome__suggestions {
    gap: 8px;
    margin-top: 4px;
  }

  .chat-welcome__chip {
    padding: 8px 12px;
    gap: 6px;
  }

  .chat-welcome__chip-icon {
    font-size: 14px;
  }

  .chat-welcome__chip-text {
    font-size: 13px;
  }
}
```

（`compact` 需要作为顶层 prop 被模板访问，`<script setup>` 中 `defineProps` 返回值赋给变量，例如 `const props = defineProps<{...}>()` 即可在模板直接使用 `compact`。）

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/agent/ChatWelcome.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/agent/ChatWelcome.vue src/components/agent/ChatWelcome.test.ts
git commit -m "feat: ChatWelcome 支持 compact 紧凑模式

适配 384px 悬浮小窗：缩头像/标题、去副标题、胶囊更紧凑。全屏页默认不受影响。

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: FloatingChatPanel 悬浮小窗主体

**Files:**
- Create: `src/components/agent/FloatingChatPanel.vue`
- Create: `src/components/agent/FloatingChatPanel.test.ts`

**Interfaces:**
- Consumes: `useAgentChat`（`activeConversationId`/`activeMessages`/`streaming`/`deepThinking`/`settings`/`suggestedQuestions`/`createConversation`/`sendMessage`/`stopStreaming`/`resendMessage`/`toggleDeepThinking`/`setModel`/`updateSettings`）；`useRouter`；`ChatWelcome(compact)` / `ChatMessageList` / `ChatInput` / `ChatSettingsModal`（Task 1 的 `FLOATING_HINT_KEY` 不需用于本组件）
- Produces: 无 props；`emit('close')`；根类 `.floating-panel`；header 操作按钮类：`.floating-panel__new` / `__expand` / `__close` / `__settings`

- [ ] **Step 1: 写失败测试**

创建 `src/components/agent/FloatingChatPanel.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FloatingChatPanel from './FloatingChatPanel.vue'
import ChatMessageList from './ChatMessageList.vue'
import { useAgentChat } from '../../composables/useAgentChat'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: {} },
      { path: '/agent', name: 'agent', component: {} },
      { path: '/agent/:conversationId', name: 'agent-conversation', component: {} },
    ],
  })
}

function mountPanel() {
  return mount(FloatingChatPanel, {
    global: { plugins: [makeRouter()] },
  })
}

beforeEach(() => {
  useAgentChat().clearAllConversations() // 单例状态倒干净
})

describe('FloatingChatPanel 悬浮小窗', () => {
  it('渲染头部标题（默认落地页为欢迎视图）', () => {
    const w = mountPanel()
    expect(w.find('.floating-panel').exists()).toBe(true)
    expect(w.find('.floating-panel__title').text()).toBe('OY AI 助手')
    expect(w.find('.chat-welcome').exists()).toBe(true)
  })

  it('展开全屏 → 无会话跳 /agent', async () => {
    const router = makeRouter()
    const w = mount(FloatingChatPanel, { global: { plugins: [router] } })
    await w.find('.floating-panel__expand').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/agent')
  })

  it('新对话按钮就地创建会话（无网络）并切到消息列表', async () => {
    const w = mountPanel()
    await w.find('.floating-panel__new').trigger('click')
    await flushPromises()
    expect(w.findComponent(ChatMessageList).exists()).toBe(true)
    expect(w.find('.chat-welcome').exists()).toBe(false)
  })

  it('收起按钮发出 close', async () => {
    const w = mountPanel()
    await w.find('.floating-panel__close').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败（组件与测试标签不存在）**

Run: `npx vitest run src/components/agent/FloatingChatPanel.test.ts`
Expected: FAIL（找不到模块 / 标签找不到元素，`find(...).exists()` 为 false）。

- [ ] **Step 3: 实现**

创建 `src/components/agent/FloatingChatPanel.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ChatWelcome from './ChatWelcome.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatInput from './ChatInput.vue'
import ChatSettingsModal from './ChatSettingsModal.vue'
import { useAgentChat } from '../../composables/useAgentChat'
import { useToast } from '../../composables/useToast'
import { submitFeedback } from '../../api/agent'

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const {
  activeConversationId,
  activeMessages,
  streaming,
  deepThinking,
  settings,
  suggestedQuestions,
  createConversation,
  sendMessage,
  stopStreaming,
  resendMessage,
  toggleDeepThinking,
  setModel,
  updateSettings,
} = useAgentChat()
const { addToast } = useToast()

const showSettings = ref(false)

function handleSend(content: string) {
  sendMessage(content)
}

function handleResend(messageId: string) {
  resendMessage(messageId)
}

function handleCopy() {
  addToast('已复制', 'success', 2000)
}

function handleFeedback(messageId: string, type: 'like' | 'dislike') {
  submitFeedback(messageId, type).catch(() => {})
}

function handleNewConversation() {
  createConversation()
}

function handleExpand() {
  const id = activeConversationId.value
  router.push(id ? `/agent/${id}` : '/agent')
}
</script>

<template>
  <div class="floating-panel">
    <header class="floating-panel__header">
      <span class="floating-panel__status" aria-hidden="true" />
      <span class="floating-panel__title">OY AI 助手</span>
      <div class="floating-panel__actions">
        <button class="floating-panel__new" title="新对话" @click="handleNewConversation">＋</button>
        <button class="floating-panel__settings" title="设置" @click="showSettings = true">⚙</button>
        <button class="floating-panel__expand" title="展开全屏" @click="handleExpand">↗</button>
        <button class="floating-panel__close" title="收起" @click="emit('close')">✕</button>
      </div>
    </header>

    <div class="floating-panel__body">
      <ChatWelcome
        v-if="!activeConversationId"
        :suggested-questions="suggestedQuestions"
        compact
        @question-click="handleSend"
      />
      <ChatMessageList
        v-else
        :messages="activeMessages"
        :streaming="streaming"
        @copy="handleCopy"
        @resend="handleResend"
        @feedback="handleFeedback"
      />
    </div>

    <div class="floating-panel__footer">
      <ChatInput
        :streaming="streaming"
        :deep-thinking="deepThinking"
        :selected-model="settings.model"
        @send="handleSend"
        @stop="stopStreaming"
        @toggle-deep-thinking="toggleDeepThinking"
        @update:model="setModel"
      />
    </div>

    <ChatSettingsModal
      :settings="settings"
      :is-open="showSettings"
      @close="showSettings = false"
      @save="updateSettings"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.floating-panel {
  display: flex;
  flex-direction: column;
  width: min(384px, calc(100vw - 32px));
  height: min(76vh, 640px);
  min-height: 400px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border);
  }

  &__status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
  }

  &__title {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__new,
  &__settings,
  &__expand,
  &__close {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    // 小窗内消息列表自带滚动，压缩默认留白（大屏 24px 在小窗里太占位）
    :deep(.chat-message-list) {
      padding: 12px;
    }
  }

  &__footer {
    flex-shrink: 0;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-primary);
  }
}

@media (max-width: 767px) {
  .floating-panel {
    width: 100%;
    height: 100%;
    min-height: 0;
    border-radius: 0;
    border: none;

    &__header {
      padding-top: calc(12px + env(safe-area-inset-top));
    }
  }
}
</style>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/agent/FloatingChatPanel.test.ts`
Expected: PASS（4 个用例）。

- [ ] **Step 5: 提交**

```bash
git add src/components/agent/FloatingChatPanel.vue src/components/agent/FloatingChatPanel.test.ts
git commit -m "feat: 新增悬浮小窗主体 FloatingChatPanel

复用 ChatWelcome(compact)/ChatMessageList/ChatInput/ChatSettingsModal
与 useAgentChat 单例，含新对话/设置/展开全屏/收起。桌面 384px、移动端全屏。

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: FloatingAssistant 悬浮球 + 首访气泡

**Files:**
- Create: `src/components/agent/FloatingAssistant.vue`
- Create: `src/components/agent/FloatingAssistant.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `useFloatingAssistant`（`open`/`editorFullscreen`/`toggleOpen`/`closePanel`/`setEditorFullscreen`）、`isFloatingAssistantVisible`、`readHintSeen`、`markHintSeen`、`FLOATING_HINT_KEY`；`src/utils/zIndex.ts` 的 `FLOATING_Z_INDEX`；`useAgentChat().streaming`；`useRoute`；Task 3 的 `FloatingChatPanel`
- Produces: Teleport 到 body 的根容器 `.floating-root`（内联 z-index）、球按钮 `.floating-ball`（`aria-expanded="open"`）、气泡 `.floating-hint`

- [ ] **Step 1: 写失败测试**

创建 `src/components/agent/FloatingAssistant.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FloatingAssistant from './FloatingAssistant.vue'
import { FLOATING_HINT_KEY, useFloatingAssistant } from '../../composables/useFloatingAssistant'

function makeRouter(initial: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: {} },
      { path: '/agent', name: 'agent', component: {} },
    ],
  })
  router.push(initial)
  return router
}

async function mountAssistant(initial = '/') {
  const router = makeRouter(initial)
  await router.isReady()
  const wrapper = mount(FloatingAssistant, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: { FloatingChatPanel: true },
    },
  })
  return { wrapper, router }
}

beforeEach(() => {
  localStorage.removeItem(FLOATING_HINT_KEY)
  useFloatingAssistant().closePanel()
})

describe('FloatingAssistant 悬浮助手', () => {
  it('默认收起：球在、面板关（aria-expanded=false）', async () => {
    const { wrapper } = await mountAssistant()
    expect(wrapper.find('.floating-ball').exists()).toBe(true)
    expect(wrapper.find('.floating-ball').attributes('aria-expanded')).toBe('false')
  })

  it('点球开/关面板', async () => {
    const { wrapper } = await mountAssistant()
    const ball = wrapper.find('.floating-ball')
    await ball.trigger('click')
    expect(ball.attributes('aria-expanded')).toBe('true')
    await ball.trigger('click')
    expect(ball.attributes('aria-expanded')).toBe('false')
  })

  it('ESC 收起面板', async () => {
    const { wrapper } = await mountAssistant()
    await wrapper.find('.floating-ball').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('.floating-ball').attributes('aria-expanded')).toBe('false')
  })

  it('点击面板外部收起', async () => {
    const { wrapper } = await mountAssistant()
    await wrapper.find('.floating-ball').trigger('click')
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.find('.floating-ball').attributes('aria-expanded')).toBe('false')
  })

  it('首访气泡：首次显示，点球后标记已见并消失', async () => {
    const { wrapper } = await mountAssistant()
    expect(wrapper.find('.floating-hint').exists()).toBe(true)
    await wrapper.find('.floating-ball').trigger('click')
    expect(wrapper.find('.floating-hint').exists()).toBe(false)
    expect(localStorage.getItem(FLOATING_HINT_KEY)).toBe('1')
  })

  it('已见过则不再显示气泡', async () => {
    localStorage.setItem(FLOATING_HINT_KEY, '1')
    const { wrapper } = await mountAssistant()
    expect(wrapper.find('.floating-hint').exists()).toBe(false)
  })

  it('/agent 全屏页隐藏整个浮球', async () => {
    const { wrapper } = await mountAssistant('/agent')
    expect(wrapper.find('.floating-ball').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败（组件不存在）**

Run: `npx vitest run src/components/agent/FloatingAssistant.test.ts`
Expected: FAIL（找不到模块）。

- [ ] **Step 3: 实现**

创建 `src/components/agent/FloatingAssistant.vue`：

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import FloatingChatPanel from './FloatingChatPanel.vue'
import {
  useFloatingAssistant,
  isFloatingAssistantVisible,
  readHintSeen,
  markHintSeen,
} from '../../composables/useFloatingAssistant'
import { useAgentChat } from '../../composables/useAgentChat'
import { FLOATING_Z_INDEX } from '../../utils/zIndex'

const route = useRoute()
const { open, editorFullscreen, toggleOpen, closePanel } = useFloatingAssistant()
const { streaming } = useAgentChat()

const widgetRoot = ref<HTMLElement | null>(null)
const showHint = ref(true)
let hintTimer: ReturnType<typeof setTimeout> | null = null
let observer: MutationObserver | null = null

const visible = computed(() =>
  isFloatingAssistantVisible(route.name as string | null | undefined, editorFullscreen.value)
)

function handleDocumentClick(e: MouseEvent) {
  if (open.value && widgetRoot.value && !widgetRoot.value.contains(e.target as Node)) {
    closePanel()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) closePanel()
}

// 编辑器全屏写作模式由 vditor 内部切换 .vditor--fullscreen 类，无显式钩子；
// 用 MutationObserver 监听 body 上的 class 变化识别全屏态（含进入/退出）
function installEditorFullscreenObserver() {
  observer = new MutationObserver(() => {
    const el = document.querySelector('.vditor--fullscreen')
    // 仅在需要时写值，避免无变化触发重渲染
    const full = el != null
    if (editorFullscreen.value !== full) {
      const { setEditorFullscreen } = useFloatingAssistant()
      setEditorFullscreen(full)
    }
  })
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  })
}

function handleBallClick() {
  if (showHint.value) {
    showHint.value = false
    markHintSeen()
  }
  toggleOpen()
}

onMounted(() => {
  showHint.value = !readHintSeen()
  if (showHint.value) {
    hintTimer = setTimeout(() => {
      showHint.value = false
    }, 6000)
  }
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('keydown', handleKeydown)
  installEditorFullscreenObserver()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('keydown', handleKeydown)
  observer?.disconnect()
  if (hintTimer) clearTimeout(hintTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="widgetRoot"
      class="floating-root"
      :style="{ zIndex: FLOATING_Z_INDEX }"
    >
      <div v-if="showHint && !open" class="floating-hint">
        你好，有什么可以帮你？
        <span class="floating-hint__arrow" aria-hidden="true" />
      </div>

      <button
        class="floating-ball"
        :class="{ 'floating-ball--streaming': streaming && !open }"
        :aria-expanded="open"
        aria-label="AI 助手"
        @click="handleBallClick"
      >
        <span class="floating-ball__icon" aria-hidden="true">✨</span>
      </button>

      <FloatingChatPanel v-show="open" @close="closePanel" />
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.floating-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.floating-hint {
  position: relative;
  max-width: 220px;
  padding: 10px 14px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-primary);
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  animation: floating-hint-in 0.3s ease;

  &__arrow {
    position: absolute;
    right: 28px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    background: var(--color-bg-primary);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    transform: rotate(45deg);
  }
}

@keyframes floating-hint-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.floating-ball {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  background: linear-gradient(135deg, #2060c0, #6366f1);
  color: #fff;
  box-shadow: 0 6px 20px rgba(32, 96, 192, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(32, 96, 192, 0.45);
  }

  &--streaming {
    animation: floating-ball-pulse 1.2s ease-in-out infinite;
  }
}

@keyframes floating-ball-pulse {
  0%,
  100% {
    box-shadow: 0 6px 20px rgba(32, 96, 192, 0.35);
  }
  50% {
    box-shadow: 0 6px 24px rgba(34, 197, 94, 0.6);
  }
}
</style>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/agent/FloatingAssistant.test.ts`
Expected: PASS（7 个用例）。

> 若 happy-dom 环境报 MutationObserver 未定义，见末尾「执行注意事项」。

- [ ] **Step 5: 提交**

```bash
git add src/components/agent/FloatingAssistant.vue src/components/agent/FloatingAssistant.test.ts
git commit -m "feat: 新增悬浮球与首访气泡 FloatingAssistant

Teleport 到 body（z-index 950），球开关面板、ESC/点外收起、
首访气泡一次性（localStorage）、/agent 与编辑器全屏时隐藏、
流式时球脉冲。挂载生命周期里注册侦听与编辑器全屏 MutationObserver。

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: App 挂载 + 全量回归

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: Task 4 的 `FloatingAssistant`

- [ ] **Step 1: 修改 App.vue**

`<script setup>` 内追加 import：

```ts
import FloatingAssistant from './components/agent/FloatingAssistant.vue'
```

模板 `<BackToTop />` 之后追加：

```vue
      <BackToTop />
      <FloatingAssistant />
```

（组件内部 Teleport 到 body，不依赖 `.app-content` 的 z-index:1 层叠上下文。）

- [ ] **Step 2: 全量测试**

Run: `npx vitest run --no-file-parallelism`
Expected: 全部通过，或全量失败集合相对既有基线**无新增**。若波及既有测试，检查是否是本组件引入的全局副作用（侦听器/observer 未卸载），而非丢给小窗隐藏。

- [ ] **Step 3: 类型 + 构建验证**

Run: `npm run build`
Expected: vue-tsc 无类型错误、vite 构建成功。

- [ ] **Step 4: 手动冒烟（可选但推荐）**

```bash
npm run dev
```

在浏览器验证：首页球可见 → 点开面板 → 发一条消息（需后端）→ 点「↗ 展开全屏」进 `/agent` 会话仍在 → 回到首页面板保持 → ESC/点外收起 → `/agent` 页上无球 → 编辑器全屏写作时球消失。

- [ ] **Step 5: 提交**

```bash
git add src/App.vue
git commit -m "feat: App 挂载悬浮 AI 助手，与全屏页双形态并存

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## 执行注意事项

- 单文件测试不要带 `--no-file-parallelism`；只有全量跑时才带。
- Task 4 的 MutationObserver：happy-dom 已内置 `MutationObserver`。若个别环境未实现，在测试中 `vi.stubGlobal('MutationObserver', class { observe(){} disconnect(){} })` 并保证 `disconnect` 被调用不抛错即可（生产代码不受影响）。
- 若用户要求双语（i18n），在 Task 2~4 前停下，为浮窗文案补 zh/en（注意裸 `@` 陷阱与 `src/locales/compile.test.ts` 回归），并同步缩小「硬编码中文」的全局约束。
- 不要触碰 `src/components/ArticleRailCard.vue` 与其测试（用户工作区未提交改动）。