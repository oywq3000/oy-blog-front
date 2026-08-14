<script setup lang="ts">
import type { SuggestedQuestion } from '../../types/agent'

defineProps<{
  suggestedQuestions: SuggestedQuestion[]
}>()

const emit = defineEmits<{
  questionClick: [text: string]
}>()

function handleClick(text: string) {
  emit('questionClick', text)
}
</script>

<template>
  <div class="chat-welcome">
    <div class="chat-welcome__center">
      <!-- AI Avatar -->
      <div class="chat-welcome__avatar">🤖</div>

      <!-- Title -->
      <h1 class="chat-welcome__title">你好，我是 OY AI 助手</h1>

      <!-- Subtitle -->
      <p class="chat-welcome__subtitle">
        我可以帮你解答技术问题、搜索博客文章、闲聊
      </p>

      <!-- Suggested questions -->
      <div v-if="suggestedQuestions.length > 0" class="chat-welcome__suggestions">
        <div
          v-for="(q, index) in suggestedQuestions"
          :key="index"
          class="chat-welcome__chip"
          @click="handleClick(q.text)"
          role="button"
          tabindex="0"
        >
          <span class="chat-welcome__chip-icon">{{ q.icon }}</span>
          <span class="chat-welcome__chip-text">{{ q.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.chat-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 24px;
  min-height: 0;

  &__center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 600px;
    width: 100%;
  }

  &__avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2060C0, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    box-shadow: 0 8px 32px rgba(32, 96, 192, 0.2);
    margin-bottom: 20px;
    user-select: none;
  }

  &__title {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 8px;
  }

  &__subtitle {
    font-size: 15px;
    color: var(--color-text-secondary);
    margin: 0 0 32px;
    max-width: 400px;
    line-height: 1.6;
  }

  &__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    max-width: 600px;
  }

  &__chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;

    &:hover {
      border-color: var(--color-accent-primary, #2060C0);
      box-shadow: 0 4px 12px rgba(32, 96, 192, 0.1);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &__chip-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  &__chip-text {
    font-size: 14px;
    color: var(--color-text-primary);
    line-height: 1.4;
  }
}
</style>
