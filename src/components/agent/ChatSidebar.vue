<script setup lang="ts">
import { computed } from 'vue'
import ChatHistoryItem from './ChatHistoryItem.vue'
import type { Conversation } from '../../types/agent'

const props = defineProps<{
  conversations: Conversation[]
  activeConversationId: string | null
  searchQuery: string
  loading: boolean
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'new-conversation': []
  'select-conversation': [id: string]
  'rename-conversation': [id: string, title: string]
  'delete-conversation': [id: string]
  'clear-all': []
  'open-settings': []
}>()

// Group conversations by date
interface Group {
  label: string
  conversations: Conversation[]
}

const groupedConversations = computed<Group[]>(() => {
  const q = props.searchQuery.trim().toLowerCase()
  let filtered = props.conversations
  if (q) {
    filtered = filtered.filter(c => c.title.toLowerCase().includes(q))
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: Group[] = [
    { label: '今天', conversations: [] },
    { label: '昨天', conversations: [] },
    { label: '近7天', conversations: [] },
    { label: '更早', conversations: [] },
  ]

  for (const conv of filtered) {
    const d = new Date(conv.updatedAt)
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (dateOnly.getTime() >= today.getTime()) {
      groups[0].conversations.push(conv)
    } else if (dateOnly.getTime() >= yesterday.getTime()) {
      groups[1].conversations.push(conv)
    } else if (dateOnly.getTime() >= weekAgo.getTime()) {
      groups[2].conversations.push(conv)
    } else {
      groups[3].conversations.push(conv)
    }
  }

  return groups.filter(g => g.conversations.length > 0)
})

function onSearchInput(e: Event) {
  emit('update:searchQuery', (e.target as HTMLInputElement).value)
}

function onNewConversation() {
  emit('new-conversation')
}

function onClearAll() {
  if (confirm('确定要清空所有对话记录吗？此操作不可撤销。')) {
    emit('clear-all')
  }
}

function onRenameConversation(id: string, title: string) {
  emit('rename-conversation', id, title)
}
</script>

<template>
  <aside class="chat-sidebar">
    <!-- New conversation button -->
    <div class="chat-sidebar__top">
      <button class="chat-sidebar__new-btn" @click="onNewConversation">
        ✨ 新对话
      </button>

      <!-- Search box -->
      <div class="chat-sidebar__search">
        <span class="chat-sidebar__search-icon">🔍</span>
        <input
          type="text"
          class="chat-sidebar__search-input"
          placeholder="搜索对话…"
          :value="searchQuery"
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Skeleton loading -->
    <div v-if="loading" class="chat-sidebar__skeleton">
      <div v-for="n in 3" :key="n" class="chat-sidebar__skeleton-item" />
    </div>

    <!-- Conversation list -->
    <div v-else class="chat-sidebar__list">
      <template v-if="groupedConversations.length > 0">
        <div
          v-for="group in groupedConversations"
          :key="group.label"
          class="chat-sidebar__group"
        >
          <div class="chat-sidebar__group-label">{{ group.label }}</div>
          <ChatHistoryItem
            v-for="conv in group.conversations"
            :key="conv.id"
            :id="conv.id"
            :title="conv.title"
            :message-count="conv.messageCount"
            :is-active="conv.id === activeConversationId"
            @select="emit('select-conversation', $event)"
            @rename="onRenameConversation"
            @delete="emit('delete-conversation', $event)"
          />
        </div>
      </template>

      <div v-else class="chat-sidebar__empty">
        <p v-if="searchQuery">没有找到匹配的对话</p>
        <p v-else>暂无对话，点击上方按钮开始</p>
      </div>
    </div>

    <!-- Bottom toolbar -->
    <div class="chat-sidebar__bottom">
      <button class="chat-sidebar__bottom-btn" @click="emit('open-settings')">
        ⚙️ 设置
      </button>
      <button class="chat-sidebar__bottom-btn chat-sidebar__bottom-btn--danger" @click="onClearAll">
        🗑️ 清空历史
      </button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.chat-sidebar {
  width: 280px;
  height: calc(100vh - 60px);
  background: var(--color-bg-secondary, #F7F8FA);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;

  &__top {
    padding: 16px 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__new-btn {
    width: 100%;
    height: 44px;
    border: none;
    background: linear-gradient(135deg, #2060C0, #4080E0);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      filter: brightness(1.1);
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--color-bg-primary);
    border-radius: 8px;
    padding: 0 10px;
    height: 36px;
    border: 1px solid transparent;
    transition: border-color 0.2s;

    &:focus-within {
      border-color: var(--color-accent-primary, #2060C0);
    }
  }

  &__search-icon {
    font-size: 14px;
    flex-shrink: 0;
    opacity: 0.5;
  }

  &__search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    font-size: 13px;
    outline: none;
    padding: 0;

    &::placeholder {
      color: var(--color-text-muted, #94a3b8);
    }
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  &__skeleton {
    flex: 1;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__skeleton-item {
    height: 48px;
    background: var(--color-bg-glass);
    border-radius: 8px;
    animation: agent-pulse 1.5s ease-in-out infinite;
  }

  &__group {
    margin-bottom: 4px;
  }

  &__group-label {
    font-size: 11px;
    color: var(--color-text-muted, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 12px 16px 6px;
    font-weight: 600;
    user-select: none;
  }

  &__empty {
    padding: 32px 16px;
    text-align: center;

    p {
      font-size: 13px;
      color: var(--color-text-muted, #94a3b8);
      margin: 0;
    }
  }

  &__bottom {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    border-top: 1px solid var(--color-border);
    margin-top: auto;
  }

  &__bottom-btn {
    flex: 1;
    height: 36px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-glass);
      color: var(--color-text-primary);
    }

    &--danger:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
  }
}

@keyframes agent-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

// Responsive
@media (max-width: 1023px) {
  .chat-sidebar {
    width: 240px;
  }
}

@media (max-width: 767px) {
  .chat-sidebar {
    display: none; // Drawer-style on mobile — handled by parent
  }
}

// Dark mode
html.dark .chat-sidebar {
  background: #1E1E2E;
}
</style>
