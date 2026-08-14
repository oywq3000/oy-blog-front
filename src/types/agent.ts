/** Agent chat type definitions */

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  thinkingTime?: number
  createdAt: string
  streaming?: boolean
  error?: boolean
  errorMessage?: string
}

export interface ChatStreamEvent {
  type: 'token' | 'thinking' | 'done' | 'error'
  content?: string
  messageId?: string
  conversationId?: string
  code?: number
  message?: string
}

export interface AgentChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Map<string, Message[]>
  streaming: boolean
  deepThinking: boolean
  selectedModel: string
  loading: boolean
  sidebarSearch: string
}

export interface SendMessageOptions {
  deepThinking?: boolean
  model?: string
  files?: File[]
}

export interface ChatSettings {
  model: string
  temperature: number
  deepThinking: boolean
}

export interface SuggestedQuestion {
  icon: string
  text: string
}
