<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatMessage from './ChatMessage.vue'
import type { Message } from '../../types/agent'

const props = defineProps<{
  messages: Message[]
  streaming: boolean
}>()

const emit = defineEmits<{
  copy: [content: string]
  resend: [messageId: string]
  feedback: [messageId: string, type: 'like' | 'dislike']
}>()

const listRef = ref<HTMLElement | null>(null)
const userScrolledUp = ref(false)
const showScrollToBottom = ref(false)

// Determine if we should show time label between messages
function shouldShowTimeLabel(currentIndex: number): boolean {
  if (currentIndex === 0) return true
  const prev = props.messages[currentIndex - 1]
  const curr = props.messages[currentIndex]
  if (!prev || !curr) return false
  const diff =
    new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return diff > 5 * 60 * 1000 // 5 minutes
}

// Auto-scroll to bottom on new messages
function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTo({
        top: listRef.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  })
}

function handleScroll() {
  if (!listRef.value) return
  const el = listRef.value
  const threshold = 100 // px from bottom
  const isNearBottom =
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  userScrolledUp.value = !isNearBottom
  showScrollToBottom.value = !isNearBottom
}

function onFeedback(messageId: string, type: 'like' | 'dislike') {
  emit('feedback', messageId, type)
}

// Watch for new content and auto-scroll
watch(
  () => props.messages.length,
  () => {
    if (!userScrolledUp.value) {
      scrollToBottom(true)
    }
  }
)

// Watch for streaming content changes
watch(
  () => {
    const lastMsg = props.messages[props.messages.length - 1]
    return lastMsg?.content?.length ?? 0
  },
  () => {
    if (!userScrolledUp.value) {
      scrollToBottom(false) // Instant during streaming
    }
  }
)

onMounted(() => {
  scrollToBottom(false)
  listRef.value?.addEventListener('scroll', handleScroll, { passive: true })
})
</script>

<template>
  <div class="chat-message-list" ref="listRef">
    <div class="chat-message-list__inner">
      <ChatMessage
        v-for="(msg, index) in messages"
        :key="msg.id"
        :message="msg"
        :message-index="index"
        :show-time-label="shouldShowTimeLabel(index)"
        @copy="emit('copy', $event)"
        @resend="emit('resend', $event)"
        @feedback="onFeedback"
      />
    </div>

    <!-- Scroll-to-bottom FAB -->
    <button
      v-if="showScrollToBottom"
      class="chat-message-list__scroll-fab"
      @click="scrollToBottom(true); userScrolledUp = false; showScrollToBottom = false"
      title="回到最新"
    >
      ↓
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.chat-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  position: relative;
  min-height: 0;

  &__inner {
    max-width: 800px;
    margin: 0 auto;
  }

  &__scroll-fab {
    position: absolute;
    bottom: 16px;
    right: 24px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-secondary);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
  }
}
</style>
