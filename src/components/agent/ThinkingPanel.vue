<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  thinking: string
  thinkingTime?: number
  defaultOpen?: boolean
}>()

const isOpen = ref(props.defaultOpen ?? true)

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}

const formattedTime = computed(() => {
  if (!props.thinkingTime) return ''
  const seconds = props.thinkingTime / 1000
  return seconds >= 1 ? `${seconds.toFixed(1)}s` : `${props.thinkingTime}ms`
})
</script>

<template>
  <div class="thinking-panel" :class="{ 'thinking-panel--collapsed': !isOpen }">
    <div class="thinking-panel__header" @click="toggleOpen" role="button" tabindex="0" aria-label="Toggle thinking process">
      <span class="thinking-panel__arrow">{{ isOpen ? '▼' : '▶' }}</span>
      <span class="thinking-panel__label">思考过程</span>
      <span v-if="formattedTime" class="thinking-panel__time">⏱ {{ formattedTime }}</span>
    </div>
    <div class="thinking-panel__content" :class="{ 'thinking-panel__content--hidden': !isOpen }">
      <pre class="thinking-panel__text">{{ thinking }}</pre>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.thinking-panel {
  margin-bottom: 12px;
  border: 1px dashed var(--color-border);
  border-radius: $radius-md;
  background: var(--color-bg-secondary);
  overflow: hidden;
  transition: all 0.3s ease;

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;

    &:hover {
      background: var(--color-bg-glass);
    }
  }

  &__arrow {
    font-size: 10px;
    color: var(--color-text-muted, #94a3b8);
    transition: transform 0.3s ease;
    width: 12px;
    text-align: center;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted, #94a3b8);
    letter-spacing: 0.04em;
  }

  &__time {
    margin-left: auto;
    font-size: 11px;
    color: var(--color-text-tertiary, #94a3b8);
    font-family: $font-family-code;
  }

  &__content {
    max-height: 300px;
    opacity: 1;
    transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
    overflow-y: auto;

    &--hidden {
      max-height: 0;
      opacity: 0;
    }
  }

  &__text {
    padding: 8px 12px 12px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-muted, #94a3b8);
    font-family: $font-family-code;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
}

// Dark mode
html.dark .thinking-panel {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
