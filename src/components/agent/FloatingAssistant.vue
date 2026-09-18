<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import FloatingChatPanel from './FloatingChatPanel.vue'
import {
  useFloatingAssistant,
  isFloatingAssistantVisible,
  readHintSeen,
  markHintSeen,
} from '../../composables/useFloatingAssistant'
import { useAgentChat } from '../../composables/useAgentChat'
import { FLOATING_Z_INDEX } from '../../utils/zIndex'

const route = useRoute()
const { open, editorFullscreen, toggleOpen, closePanel } = useFloatingAssistant()
const { streaming } = useAgentChat()

const widgetRoot = ref<HTMLElement | null>(null)
const showHint = ref(true)
let hintTimer: ReturnType<typeof setTimeout> | null = null
let observer: MutationObserver | null = null

const visible = computed(() =>
  isFloatingAssistantVisible(route.name as string | null | undefined, editorFullscreen.value)
)

function handleDocumentClick(e: MouseEvent) {
  if (!open.value || !widgetRoot.value) return
  // 不能用 root.contains(target)：点 chip 等触发换 DOM 的目标时，目标子树已被 Vue
  // （v-if 欢迎页↔消息列表）在 document 冒泡到本处理器**之前**卸载，游离节点
  // contains() 必为 false → 误收面板。composedPath() 是派发开始时按当时 DOM 定格的
  // 传播路径，即使监听器运行时节点已脱离，路径仍含 widgetRoot/弹窗遮罩。
  const path = e.composedPath()
  if (path.includes(widgetRoot.value)) return // 点在球/面板内
  // 设置弹窗 Teleport 到 body（widget 外）：开模态时点击在 .settings-overlay 内
  // （遮罩铺满视口），不当"点击外部"收起面板
  if (path.some(n => (n as Element)?.classList?.contains('settings-overlay'))) return
  closePanel()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    // 设置弹窗打开时 ESC 让位（弹窗由遮罩/关闭按钮 dismiss，不联动面板）
    if (document.querySelector('.settings-overlay')) return
    closePanel()
  }
}

// 编辑器全屏写作模式由 vditor 内部切换 .vditor--fullscreen 类，无显式钩子；
// 用 MutationObserver 监听 body 上的 class 变化识别全屏态（含进入/退出）
function installEditorFullscreenObserver() {
  observer = new MutationObserver(() => {
    const el = document.querySelector('.vditor--fullscreen')
    // 仅在需要时写值，避免无变化触发重渲染
    const full = el != null
    if (editorFullscreen.value !== full) {
      const { setEditorFullscreen } = useFloatingAssistant()
      setEditorFullscreen(full)
    }
  })
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  })
}

function handleBallClick() {
  if (showHint.value) {
    showHint.value = false
    markHintSeen()
  }
  toggleOpen()
}

onMounted(() => {
  showHint.value = !readHintSeen()
  if (showHint.value) {
    hintTimer = setTimeout(() => {
      showHint.value = false
    }, 6000)
  }
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('keydown', handleKeydown)
  installEditorFullscreenObserver()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('keydown', handleKeydown)
  observer?.disconnect()
  if (hintTimer) clearTimeout(hintTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="widgetRoot"
      class="floating-root"
      :style="{ zIndex: FLOATING_Z_INDEX }"
    >
      <div v-if="showHint && !open" class="floating-hint">
        你好，有什么可以帮你？
        <span class="floating-hint__arrow" aria-hidden="true" />
      </div>

      <button
        class="floating-ball"
        :class="{ 'floating-ball--streaming': streaming && !open }"
        :aria-expanded="open"
        aria-label="AI 助手"
        @click="handleBallClick"
      >
        <span class="floating-ball__icon" aria-hidden="true">✨</span>
      </button>

      <FloatingChatPanel v-show="open" @close="closePanel" />
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.floating-root {
  position: fixed;
  right: 24px;
  bottom: 88px; // 球底部 88px 高于 BackToTop 顶部 80px（8px 间距），互不遮挡
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.floating-hint {
  position: relative;
  max-width: 220px;
  padding: 10px 14px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-primary);
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  animation: floating-hint-in 0.3s ease;

  &__arrow {
    position: absolute;
    right: 28px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    background: var(--color-bg-primary);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    transform: rotate(45deg);
  }
}

@keyframes floating-hint-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.floating-ball {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  background: linear-gradient(135deg, #2060c0, #6366f1);
  color: #fff;
  box-shadow: 0 6px 20px rgba(32, 96, 192, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(32, 96, 192, 0.45);
  }

  &--streaming {
    animation: floating-ball-pulse 1.2s ease-in-out infinite;
  }
}

@keyframes floating-ball-pulse {
  0%,
  100% {
    box-shadow: 0 6px 20px rgba(32, 96, 192, 0.35);
  }
  50% {
    box-shadow: 0 6px 24px rgba(34, 197, 94, 0.6);
  }
}
</style>