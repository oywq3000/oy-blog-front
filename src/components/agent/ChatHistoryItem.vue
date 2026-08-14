<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  title: string
  messageCount: number
  isActive: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  rename: [id: string, title: string]
  delete: [id: string]
}>()

const isEditing = computed(() => false)

function handleSelect() {
  emit('select', props.id)
}

function handleRename() {
  const newTitle = prompt('重命名对话', props.title)
  if (newTitle && newTitle.trim()) {
    emit('rename', props.id, newTitle.trim())
  }
}

function handleDelete() {
  if (confirm('确定要删除这个对话吗？')) {
    emit('delete', props.id)
  }
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  // Simple context menu via browser prompt
  const action = prompt('操作：输入 r 重命名，输入 d 删除，输入 c 取消')
  if (action === 'r') handleRename()
  else if (action === 'd') handleDelete()
}
</script>

<template>
  <div
    class="chat-history-item"
    :class="{ 'chat-history-item--active': isActive }"
    @click="handleSelect"
    @contextmenu="handleContextMenu"
    role="button"
    tabindex="0"
    :aria-label="`对话: ${title}`"
  >
    <div class="chat-history-item__icon">📄</div>
    <div class="chat-history-item__content">
      <div class="chat-history-item__title">{{ title }}</div>
      <div class="chat-history-item__meta">{{ messageCount }} 条消息</div>
    </div>
    <div class="chat-history-item__actions" @click.stop>
      <button
        class="chat-history-item__menu-btn"
        @click="handleContextMenu"
        :title="'更多操作'"
        aria-label="更多操作"
      >
        …
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.chat-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: $radius-md;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  border-left: 3px solid transparent;
  position: relative;
  user-select: none;

  &:hover {
    background: var(--color-bg-glass);

    .chat-history-item__actions {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &--active {
    background: rgba(32, 96, 192, 0.08);
    border-left-color: var(--color-accent-primary, #2060C0);

    .chat-history-item__title {
      color: var(--color-accent-primary, #2060C0);
      font-weight: 600;
    }
  }

  &__icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }

  &__content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  &__title {
    font-size: 13px;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }

  &__meta {
    font-size: 11px;
    color: var(--color-text-muted, #94a3b8);
    margin-top: 2px;
  }

  &__actions {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }

  &__menu-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 4px;
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
  }
}
</style>
