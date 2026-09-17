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
  // 小视口下不超屏：球已上移到底部 88px，min-height 固定 400px 会顶出可滚动溢出
  min-height: min(400px, calc(100vh - 160px));
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
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh; // 现代浏览器避开移动端地址栏动态高
    min-height: 0;
    border-radius: 0;
    border: none;

    &__header {
      padding-top: calc(12px + env(safe-area-inset-top));
    }
  }
}
</style>