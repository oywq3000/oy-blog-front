<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { computeMenuPlacement, type MenuPlacement } from './chatHistoryMenu'

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

// 菜单估算尺寸（用于翻转到下方放不下时的预判）
const MENU_WIDTH = 128
const MENU_EST_HEIGHT = 104

const rootEl = ref<HTMLElement | null>(null)
const menuBtn = ref<HTMLButtonElement | null>(null)

// ---- ··· 下拉菜单状态 ----
const menuOpen = ref(false)
const confirmingDelete = ref(false)
const menuStyle = ref<MenuPlacement>({ left: 0, top: 0 })

// ---- 行内重命名状态 ----
const editing = ref(false)
const editDraft = ref('')
const editInput = ref<HTMLInputElement | null>(null)
// Esc 取消时打标记：v-if 移除 input 后浏览器可能补发 blur，
// 没有标记会被误当成失焦提交
let escapedDuringEdit = false

function handleSelect() {
  emit('select', props.id)
}

// ---- 菜单开合 ----

function anchorRect(e: MouseEvent, anchor: 'button' | 'cursor') {
  if (anchor === 'cursor') {
    // 右键唤出：菜单左上角贴着光标
    const x = e.clientX || 0
    const y = e.clientY || 0
    return { right: x + MENU_WIDTH, bottom: y }
  }
  const rect = menuBtn.value?.getBoundingClientRect()
  return { right: rect?.right ?? 0, bottom: rect?.bottom ?? 0 }
}

function openMenu(e: MouseEvent, anchor: 'button' | 'cursor' = 'button') {
  e.preventDefault()
  e.stopPropagation()
  if (menuOpen.value) return
  confirmingDelete.value = false
  menuStyle.value = computeMenuPlacement({
    trigger: anchorRect(e, anchor),
    menuSize: { width: MENU_WIDTH, height: MENU_EST_HEIGHT },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  })
  menuOpen.value = true
}

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  if (menuOpen.value) {
    closeMenu()
  } else {
    openMenu(e, 'button')
  }
}

function closeMenu() {
  menuOpen.value = false
  confirmingDelete.value = false
}

// 点击外部 / 右键其他条目 / Esc / 滚动 / 窗口缩放时关闭菜单
function onDocumentClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) closeMenu()
}
function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}
function onScrollOrResize() {
  closeMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  // capture：右键另一条目时先关闭本条的菜单
  document.addEventListener('contextmenu', onDocumentClick, true)
  document.addEventListener('keydown', onDocumentKeydown)
  // capture：sidebar 列表滚动（scroll 不冒泡）时菜单会与条目脱节，立即关闭
  window.addEventListener('scroll', onScrollOrResize, true)
  document.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('contextmenu', onDocumentClick, true)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('scroll', onScrollOrResize, true)
  document.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})

// ---- 菜单动作 ----

function startRename() {
  closeMenu()
  escapedDuringEdit = false
  editDraft.value = props.title
  editing.value = true
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

function commitRename() {
  if (!editing.value) return
  editing.value = false
  const title = editDraft.value.trim()
  if (title && title !== props.title) {
    emit('rename', props.id, title)
  }
}

function cancelRename() {
  escapedDuringEdit = true
  editing.value = false
}

function onEditBlur() {
  if (escapedDuringEdit) {
    escapedDuringEdit = false
    return
  }
  commitRename()
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitRename()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelRename()
  }
}

function requestDelete() {
  confirmingDelete.value = true
}

function confirmDelete() {
  closeMenu()
  emit('delete', props.id)
}

function onItemContextMenu(e: MouseEvent) {
  openMenu(e, 'cursor')
}
</script>

<template>
  <div
    ref="rootEl"
    class="chat-history-item"
    :class="{ 'chat-history-item--active': isActive }"
    @click="handleSelect"
    @contextmenu="onItemContextMenu"
    role="button"
    tabindex="0"
    :aria-label="`对话: ${title}`"
  >
    <div class="chat-history-item__icon">📄</div>
    <div class="chat-history-item__content">
      <div v-if="!editing" class="chat-history-item__title">{{ title }}</div>
      <div v-else class="chat-history-item__edit">
        <input
          ref="editInput"
          v-model="editDraft"
          class="chat-history-item__edit-input"
          maxlength="50"
          aria-label="重命名对话"
          @keydown="onEditKeydown"
          @blur="onEditBlur"
          @click.stop
        />
      </div>
      <div class="chat-history-item__meta">{{ messageCount }} 条消息</div>
    </div>
    <div class="chat-history-item__actions" @click.stop>
      <button
        ref="menuBtn"
        class="chat-history-item__menu-btn"
        :class="{ 'chat-history-item__menu-btn--active': menuOpen }"
        :title="'更多操作'"
        aria-label="更多操作"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        @click="toggleMenu"
      >
        ⋯
      </button>
    </div>

    <!-- 操作菜单：fixed 定位在按钮/鼠标旁，翻转到边界自动夹回视口 -->
    <Transition name="menu-pop">
      <div
        v-if="menuOpen"
        class="chat-history-item__menu"
        role="menu"
        :style="{ left: `${menuStyle.left}px`, top: `${menuStyle.top}px` }"
        @click.stop
      >
        <template v-if="!confirmingDelete">
          <button class="chat-history-item__menu-item" role="menuitem" @click="startRename">
            <span class="chat-history-item__menu-icon">✏️</span>重命名
          </button>
          <button
            class="chat-history-item__menu-item chat-history-item__menu-item--danger"
            role="menuitem"
            @click="requestDelete"
          >
            <span class="chat-history-item__menu-icon">🗑️</span>删除
          </button>
        </template>
        <template v-else>
          <div class="chat-history-item__menu-confirm-text">确定删除该对话？</div>
          <div class="chat-history-item__menu-confirm-actions">
            <button
              class="chat-history-item__menu-item"
              role="menuitem"
              @click="confirmingDelete = false"
            >
              取消
            </button>
            <button
              class="chat-history-item__menu-item chat-history-item__menu-item--danger"
              role="menuitem"
              @click="confirmDelete"
            >
              删除
            </button>
          </div>
        </template>
      </div>
    </Transition>
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

  &__edit {
    min-width: 0;
  }

  &__edit-input {
    width: 100%;
    padding: 2px 6px;
    font-size: 13px;
    line-height: 1.4;
    border: 1px solid var(--color-accent-primary, #2060C0);
    border-radius: 4px;
    background: var(--color-bg-primary, #fff);
    color: var(--color-text-primary);
    outline: none;
    box-sizing: border-box;
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

    &:hover,
    &--active {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
  }

  &__menu {
    position: fixed;
    z-index: 1000;
    width: 128px;
    padding: 4px;
    background: var(--color-bg-primary, #fff);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__menu-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 12.5px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;

    &:hover {
      background: var(--color-bg-glass);
    }

    &--danger {
      color: #ef4444;

      &:hover {
        background: rgba(239, 68, 68, 0.1);
      }
    }
  }

  &__menu-icon {
    flex-shrink: 0;
    font-size: 13px;
  }

  &__menu-confirm-text {
    font-size: 12px;
    color: var(--color-text-muted, #94a3b8);
    padding: 6px 10px 8px;
    text-align: center;
  }

  &__menu-confirm-actions {
    display: flex;
    gap: 4px;
  }
}

// 菜单弹出过渡
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

// Dark mode
html.dark .chat-history-item__menu {
  background: #1E1E2E;
}
</style>
