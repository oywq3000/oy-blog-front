<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownViewer from '../MarkdownViewer.vue'
import ThinkingPanel from './ThinkingPanel.vue'
import IconCopy from '../icons/IconCopy.vue'
import IconRefresh from '../icons/IconRefresh.vue'
import IconCheck from '../icons/IconCheck.vue'
import IconThumbUp from '../icons/IconThumbUp.vue'
import IconThumbDown from '../icons/IconThumbDown.vue'
import type { Message } from '../../types/agent'

const props = defineProps<{
  message: Message
  messageIndex: number
  showTimeLabel: boolean
}>()

const emit = defineEmits<{
  copy: [content: string]
  resend: [messageId: string]
  feedback: [messageId: string, type: 'like' | 'dislike']
}>()

const copied = ref(false)
const userFeedback = ref<'like' | 'dislike' | null>(null)

const formattedTime = computed(() => {
  if (!props.message.createdAt) return ''
  const d = new Date(props.message.createdAt)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const isUser = computed(() => props.message.role === 'user')
const isStreaming = computed(() => props.message.streaming === true)
const hasError = computed(() => props.message.error === true)
const hasThinking = computed(() => !!props.message.thinking)

function handleCopy() {
  navigator.clipboard.writeText(props.message.content).then(() => {
    copied.value = true
    emit('copy', props.message.content)
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = props.message.content
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    emit('copy', props.message.content)
    setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}

function handleResend() {
  emit('resend', props.message.id)
}

function handleFeedback(type: 'like' | 'dislike') {
  if (userFeedback.value === type) {
    userFeedback.value = null
  } else {
    userFeedback.value = type
  }
  emit('feedback', props.message.id, type)
}
</script>

<template>
  <div
    class="chat-message"
    :class="{
      'chat-message--user': isUser,
      'chat-message--assistant': !isUser,
      'chat-message--streaming': isStreaming,
      'chat-message--error': hasError,
    }"
  >
    <!-- Time label -->
    <div v-if="showTimeLabel" class="chat-message__time">
      {{ formattedTime }}
    </div>

    <!-- User message -->
    <template v-if="isUser">
      <div class="chat-message__row chat-message__row--user">
        <div class="chat-message__avatar chat-message__avatar--user">👤</div>
        <div class="chat-message__bubble chat-message__bubble--user">
          {{ message.content }}
        </div>
      </div>
      <!-- Error indicator for user message -->
      <div v-if="hasError" class="chat-message__error-row">
        <span class="chat-message__error-text">⚠️ 发送失败</span>
        <button class="chat-message__retry-btn" @click="handleResend">重试</button>
      </div>
    </template>

    <!-- Assistant message -->
    <template v-else>
      <div class="chat-message__row chat-message__row--assistant">
        <div class="chat-message__avatar chat-message__avatar--assistant">🤖</div>
        <div class="chat-message__body">
          <div class="chat-message__header">
            <span class="chat-message__name">OY AI</span>
            <div class="chat-message__header-actions">
              <button
                v-if="!isStreaming && message.content"
                class="chat-message__copy-btn"
                :class="{ 'chat-message__copy-btn--copied': copied }"
                @click="handleCopy"
                :title="copied ? '已复制' : '复制'"
              >
                <IconCheck v-if="copied" :size="13" />
                <IconCopy v-else :size="13" />
              </button>
            </div>
          </div>
          <div class="chat-message__bubble chat-message__bubble--assistant">
            <!-- Thinking panel -->
            <ThinkingPanel
              v-if="hasThinking"
              :thinking="message.thinking!"
              :thinking-time="message.thinkingTime"
              :default-open="!!message.thinking && !message.content"
            />
            <!-- Content with markdown -->
            <div v-if="message.content" class="chat-message__markdown">
              <MarkdownViewer :content="message.content" />
            </div>
            <!-- Streaming cursor -->
            <span v-if="isStreaming && !message.content" class="chat-message__cursor">▌</span>
            <span v-if="isStreaming && message.content" class="chat-message__cursor chat-message__cursor--inline">▌</span>
          </div>
          <!-- Actions for completed AI messages -->
          <div v-if="!isStreaming && message.content" class="chat-message__actions">
            <button class="chat-message__action-btn" @click="handleCopy" :title="'复制'">
              <IconCopy :size="15" />
            </button>
            <button class="chat-message__action-btn" @click="handleResend" :title="'重新生成'">
              <IconRefresh :size="15" />
            </button>
            <button
              class="chat-message__action-btn"
              :class="{ 'chat-message__action-btn--active': userFeedback === 'like' }"
              @click="handleFeedback('like')"
              :title="'赞'"
            >
              <IconThumbUp :size="15" :filled="userFeedback === 'like'" />
            </button>
            <button
              class="chat-message__action-btn"
              :class="{ 'chat-message__action-btn--active': userFeedback === 'dislike' }"
              @click="handleFeedback('dislike')"
              :title="'踩'"
            >
              <IconThumbDown :size="15" :filled="userFeedback === 'dislike'" />
            </button>
          </div>
          <!-- Error display -->
          <div v-if="hasError" class="chat-message__error-panel">
            <span class="chat-message__error-text">{{ message.errorMessage || '生成失败' }}</span>
            <button class="chat-message__retry-btn" @click="handleResend">继续生成</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.chat-message {
  margin-bottom: 8px;

  &__time {
    text-align: center;
    font-size: 12px;
    color: var(--color-text-muted, #94a3b8);
    margin: 16px 0;
    user-select: none;
  }

  &__row {
    display: flex;
    gap: 8px;
    align-items: flex-start;

    &--user {
      justify-content: flex-end;
    }

    &--assistant {
      justify-content: flex-start;
    }
  }

  &__avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;

    &--user {
      background: linear-gradient(135deg, #2060C0, #4080E0);
      color: white;
      order: 2;
    }

    &--assistant {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
    max-width: 85%;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    padding: 0 4px;
  }

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  &__header-actions {
    margin-left: auto;
  }

  &__copy-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-text-muted, #94a3b8);
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;

    &:hover {
      background: var(--color-bg-glass);
      color: var(--color-text-primary);
    }

    &--copied {
      color: var(--color-accent-primary, #2060C0);
    }
  }

  &__bubble {
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.7;
    word-break: break-word;

    &--user {
      background: #2060C0;
      color: #ffffff;
      border-radius: 16px 16px 4px 16px;
      max-width: 70%;
      box-shadow: 0 1px 3px rgba(32, 96, 192, 0.2);
    }

    &--assistant {
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      border-radius: 16px 16px 16px 4px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
  }

  &__markdown {
    // The MarkdownViewer handles its own styling
  }

  &__cursor {
    display: inline-block;
    animation: agent-blink 1s step-end infinite;
    color: var(--color-accent-primary, #6366f1);
    font-weight: bold;

    &--inline {
      margin-left: 1px;
    }
  }

  &__actions {
    display: flex;
    gap: 4px;
    padding: 4px 4px 0;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &__row--assistant:hover &__actions,
  .chat-message:hover &__actions {
    opacity: 1;
  }

  &__action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    color: var(--color-text-muted, #94a3b8);
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    &--active {
      color: var(--color-accent-primary, #2060C0);
      background: rgba(32, 96, 192, 0.1);
    }
  }

  &__error-row,
  &__error-panel {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 16px;
    margin-top: 4px;
  }

  &__error-row {
    justify-content: flex-end;
  }

  &__error-text {
    font-size: 12px;
    color: #ef4444;
  }

  &__retry-btn {
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-accent-primary, #6366f1);
    font-size: 12px;
    padding: 2px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-accent-primary, #6366f1);
      color: white;
    }
  }

  &--error &__bubble--assistant {
    border-color: #ef4444;
  }
}

@keyframes agent-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// Dark mode adjustments
html.dark {
  .chat-message__bubble--user {
    background: #3B82F6;
  }

  .chat-message__bubble--assistant {
    background: #2D2D3F;
    border-color: rgba(255, 255, 255, 0.08);
  }
}
</style>
