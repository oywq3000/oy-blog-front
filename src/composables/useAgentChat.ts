import { ref, computed, watch, shallowRef, reactive } from 'vue'
import type {
  Conversation,
  Message,
  ChatSettings,
  SendMessageOptions,
  SuggestedQuestion
} from '../types/agent'
import * as agentApi from '../api/agent'
import { useToast } from './useToast'

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function truncateTitle(content: string, maxLen = 20): string {
  const cleaned = content.replace(/\s+/g, ' ').trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned
}

function groupConversationsByDate(convs: Conversation[]): {
  label: string
  conversations: Conversation[]
}[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dayBefore = new Date(today.getTime() - 2 * 86400000)

  const groups: { label: string; conversations: Conversation[] }[] = [
    { label: 'today', conversations: [] },
    { label: 'yesterday', conversations: [] },
    { label: 'lastWeek', conversations: [] },
    { label: 'earlier', conversations: [] },
  ]

  for (const conv of convs) {
    const d = new Date(conv.updatedAt)
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (dateOnly.getTime() >= today.getTime()) {
      groups[0].conversations.push(conv)
    } else if (dateOnly.getTime() >= yesterday.getTime()) {
      groups[1].conversations.push(conv)
    } else if (dateOnly.getTime() >= dayBefore.getTime() - 5 * 86400000) {
      groups[2].conversations.push(conv)
    } else {
      groups[3].conversations.push(conv)
    }
  }

  return groups.filter(g => g.conversations.length > 0)
}

// ============================================================
// Shared reactive state (global singleton)
// ============================================================

const conversations = ref<Conversation[]>([])
const activeConversationId = ref<string | null>(null)
const messagesMap = ref<Map<string, Message[]>>(new Map())
const streaming = ref(false)
const deepThinking = ref(false)
const loading = ref(false)
const sidebarSearch = ref('')

const defaultSettings: ChatSettings = {
  model: 'deepseek-v4-pro',
  temperature: 0.7,
  deepThinking: false,
}
const settings = ref<ChatSettings>({ ...defaultSettings })

const defaultSuggestions: SuggestedQuestion[] = [
  { icon: '💡', text: 'Vue3 响应式原理是什么？' },
  { icon: '📝', text: '怎么写好 Markdown？' },
  { icon: '🔍', text: '博客里有 Rust 的文章吗？' },
  { icon: '🎨', text: '推荐一些前端学习路线' },
  { icon: '📚', text: '总结一下设计模式' },
]

const suggestedQuestions = ref<SuggestedQuestion[]>([...defaultSuggestions])

// Currently accumulating assistant message (for streaming)
const currentStreamContent = ref('')
const currentStreamThinking = ref('')
let abortController: AbortController | null = null

// ============================================================
// Computed
// ============================================================

const activeMessages = computed(() => {
  if (!activeConversationId.value) return []
  return messagesMap.value.get(activeConversationId.value) ?? []
})

const filteredConversations = computed(() => {
  const q = sidebarSearch.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter(c => c.title.toLowerCase().includes(q))
})

const groupedConversations = computed(() =>
  groupConversationsByDate(filteredConversations.value)
)

// ============================================================
// Core methods
// ============================================================

function setConversations(list: Conversation[]) {
  conversations.value = list
}

function createConversation(): string {
  const id = generateConversationId()
  const now = new Date().toISOString()
  const conv: Conversation = {
    id,
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  }
  //insert the start of the array (conversations array)
  conversations.value.unshift(conv)
  messagesMap.value.set(id, [])
  activeConversationId.value = id
  return id
}

function deleteConversation(id: string): void {
  conversations.value = conversations.value.filter(c => c.id !== id)
  messagesMap.value.delete(id)
  if (activeConversationId.value === id) {
    const remaining = conversations.value[0]
    activeConversationId.value = remaining?.id ?? null
  }
  agentApi.deleteConversation(id).catch(() => {})
}

function renameConversation(id: string, title: string): void {
  const conv = conversations.value.find(c => c.id === id)
  if (conv) {
    conv.title = title
  }
  agentApi.renameConversation(id, title).catch(() => {})
}

function switchConversation(id: string): void {
  activeConversationId.value = id
  // If we haven't loaded messages for this conversation, fetch them
  if (!messagesMap.value.has(id) || messagesMap.value.get(id)!.length === 0) {
    loadMessages(id)
  }
}

async function loadConversations(pageNum = 1, pageSize = 20): Promise<void> {
  loading.value = true
  try {
    const res = await agentApi.getConversations(pageNum, pageSize)
    // axios 拦截器返回整个 Result 信封，conversations 端点的 data 是 PageVo，取其 data 字段
    conversations.value = res.data?.data ?? []
  } catch {
    // Keep existing conversations on error
  } finally {
    loading.value = false
  }
}

async function loadMessages(conversationId: string): Promise<void> {
  try {
    const msgs = await agentApi.getMessages(conversationId)
    messagesMap.value.set(conversationId, msgs)
  } catch {
    // Keep empty on error
  }
}

async function sendMessage(
  content: string,
  options?: SendMessageOptions
): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed || streaming.value) return

  // Ensure we have an active conversation
  let convId = activeConversationId.value
  if (!convId) {
    convId = createConversation()
  }

  // Add user message
  const userMsg: Message = {
    id: generateId(),
    role: 'user',
    content: trimmed,
    createdAt: new Date().toISOString(),
  }
  const msgs = messagesMap.value.get(convId) ?? []
  msgs.push(userMsg)
  messagesMap.value.set(convId, msgs)

  // Auto-title: use first 20 chars of first message
  const conv = conversations.value.find(c => c.id === convId)
  if (conv && conv.title === '新对话') {
    conv.title = truncateTitle(trimmed)
  }

  // Create placeholder for assistant message
  // reactive() so that streaming mutations below trigger Vue re-renders;
  // a plain object mutated directly would bypass reactivity entirely
  const assistantMsg = reactive<Message>({
    id: generateId(),
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString(),
    streaming: true,
  })
  msgs.push(assistantMsg)
  messagesMap.value.set(convId, [...msgs])

  streaming.value = true
  currentStreamContent.value = ''
  currentStreamThinking.value = ''

  try {
    const useDeepThinking = options?.deepThinking ?? deepThinking.value
    const model = options?.model ?? settings.value.model

    abortController = new AbortController()

    await streamChat(
      convId,
      trimmed,
      useDeepThinking,
      model,
      abortController.signal,
      (token) => {
        currentStreamContent.value += token
        assistantMsg.content = currentStreamContent.value
        assistantMsg.streaming = true
      },
      (thinking) => {
        currentStreamThinking.value += thinking
        assistantMsg.thinking = currentStreamThinking.value
      },
      (doneMsgId) => {
        assistantMsg.id = doneMsgId || assistantMsg.id
        assistantMsg.streaming = false
        streaming.value = false
        abortController = null

        // Update conversation metadata
        if (conv) {
          conv.updatedAt = new Date().toISOString()
          conv.messageCount = (messagesMap.value.get(convId) ?? []).filter(
            m => !m.streaming
          ).length
        }
      },
      (errorMsg) => {
        assistantMsg.streaming = false
        assistantMsg.error = true
        assistantMsg.errorMessage = errorMsg
        streaming.value = false
        abortController = null
      }
    )
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      assistantMsg.streaming = false
    } else {
      assistantMsg.streaming = false
      assistantMsg.error = true
      assistantMsg.errorMessage = err?.message || '发送失败'
    }
    streaming.value = false
    abortController = null
  }
}

function stopStreaming(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  // Also notify server
  const convId = activeConversationId.value
  if (convId) {
    agentApi.stopGeneration(convId).catch(() => {})
  }
}

async function resendMessage(_messageId: string): Promise<void> {
  const msgs = activeMessages.value
  if (msgs.length < 2) return

  // Remove last assistant message and resend the last user message
  const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')
  if (!lastUserMsg) return

  // Remove the failed assistant message
  const failedIdx = msgs.findLastIndex(m => m.role === 'assistant' && m.error)
  if (failedIdx >= 0) {
    msgs.splice(failedIdx, 1)
    const convId = activeConversationId.value!
    messagesMap.value.set(convId, [...msgs])
  }

  await sendMessage(lastUserMsg.content)
}

function toggleDeepThinking(): void {
  deepThinking.value = !deepThinking.value
  settings.value.deepThinking = deepThinking.value
}

function setModel(model: string): void {
  settings.value.model = model
}

function clearAllConversations(): void {
  conversations.value = []
  messagesMap.value.clear()
  activeConversationId.value = null
  streaming.value = false
  currentStreamContent.value = ''
  currentStreamThinking.value = ''
}

function updateSettings(partial: Partial<ChatSettings>): void {
  settings.value = { ...settings.value, ...partial }
  if (partial.deepThinking !== undefined) {
    deepThinking.value = partial.deepThinking
  }
}

async function loadSuggestedQuestions(): Promise<void> {
  try {
    const res = await agentApi.getSuggestedQuestions()
    if (res && res.length > 0) {
      suggestedQuestions.value = res
    }
  } catch {
    // Keep defaults
  }
}

// ============================================================
// SSE Streaming helper
// ============================================================

async function streamChat(
  conversationId: string,
  message: string,
  deepThinking: boolean,
  model: string,
  signal: AbortSignal,
  onToken: (token: string) => void,
  onThinking: (thinking: string) => void,
  onDone: (messageId?: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const url = `/api/agent-service/chat/stream`
  const body = JSON.stringify({
    conversationId,
    message,
    deepThinking,
    model,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
    },
    body,
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    onError(`HTTP ${response.status}: ${errText}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('Stream not supported')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  // currentEvent must live OUTSIDE the read loop: SSE frames can be split
  // across chunks, and resetting it per read silently drops data lines
  // whose event: line arrived in the previous chunk.
  let currentEvent = ''

  const processLine = (line: string) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      currentEvent = '' // blank line terminates the current event block
      return
    }
    if (trimmedLine.startsWith('event:')) {
      currentEvent = trimmedLine.slice(6).trim()
      return
    }
    if (!trimmedLine.startsWith('data:')) return
    const dataStr = trimmedLine.slice(5).trim()
    try {
      const data = JSON.parse(dataStr)
      if (currentEvent === 'token' && data.content) {
        onToken(data.content)
      } else if (currentEvent === 'thinking' && data.content) {
        onThinking(data.content)
      } else if (currentEvent === 'done') {
        onDone(data.messageId)
      } else if (currentEvent === 'error') {
        onError(data.message || 'Server error')
      }
    } catch {
      // Skip unparseable lines
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        processLine(line)
      }
    }

    // Process remaining buffer (may hold one or more complete lines)
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        processLine(line)
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err
    onError(err?.message || 'Stream error')
  }
}

// ============================================================
// Export composable
// ============================================================

export function useAgentChat() {
  return {
    // State
    conversations,
    activeConversationId,
    messagesMap,
    streaming,
    deepThinking,
    loading,
    sidebarSearch,
    settings,
    suggestedQuestions,

    // Computed
    activeMessages,
    filteredConversations,
    groupedConversations,

    // Actions
    setConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    switchConversation,
    loadConversations,
    loadMessages,
    sendMessage,
    stopStreaming,
    resendMessage,
    toggleDeepThinking,
    setModel,
    clearAllConversations,
    updateSettings,
    loadSuggestedQuestions,
  }
}
