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