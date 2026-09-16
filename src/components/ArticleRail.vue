<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { railArrowState, railStepPx } from '../utils/railScroll';

// 纯展示组件：标题/卡片由插槽传入，箭头边界逻辑复用 railScroll 纯函数
defineProps<{
  prevLabel: string;
  nextLabel: string;
  regionLabel: string;
}>();

const trackEl = ref<HTMLElement | null>(null);
const canScrollPrev = ref(false);
const canScrollNext = ref(false);

function updateArrowState() {
  const el = trackEl.value;
  if (!el) return;
  const { canPrev, canNext } = railArrowState(el.scrollLeft, el.clientWidth, el.scrollWidth);
  canScrollPrev.value = canPrev;
  canScrollNext.value = canNext;
}

function scrollStep(dir: number) {
  const el = trackEl.value;
  if (!el) return;
  el.scrollBy({ left: dir * railStepPx(el.clientWidth), behavior: 'smooth' });
}

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  // 等插槽内卡片渲染后轨道才有真实宽度，才能初始化边界态
  await nextTick();
  updateArrowState();
  window.addEventListener('resize', updateArrowState);
  // 数据异步到达时轨道宽度会变：自动监听内容尺寸刷新箭头态。
  // ResizeObserver 在 happy-dom 等测试环境缺失，做能力探测避免挂载崩溃。
  if (typeof ResizeObserver !== 'undefined' && trackEl.value) {
    resizeObserver = new ResizeObserver(updateArrowState);
    resizeObserver.observe(trackEl.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateArrowState);
  resizeObserver?.disconnect();
});

/** 供父级在数据加载完成后（晚于 mounted）主动刷新箭头边界态 */
defineExpose({ refreshArrows: updateArrowState });
</script>

<template>
  <section class="article-rail" :aria-label="regionLabel">
    <header v-if="$slots.title" class="article-rail__header">
      <slot name="title" />
    </header>
    <!-- 横向滑动区：左右箭头（桌面，边界自动禁用）+ 轨道（触控滑动/滚轮横滑保留） -->
    <div class="article-rail__viewport">
      <button
        type="button"
        class="rail-arrow rail-arrow--prev"
        :disabled="!canScrollPrev"
        :aria-label="prevLabel"
        @click="scrollStep(-1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        class="rail-arrow rail-arrow--next"
        :disabled="!canScrollNext"
        :aria-label="nextLabel"
        @click="scrollStep(1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div ref="trackEl" class="article-rail__track" @scroll="updateArrowState">
        <slot />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

// 与双窗格（.article-pane）同款卡片盒：同背景/边框/圆角/padding，保持整页视觉对齐
.article-rail {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg $spacing-lg;

  @media (max-width: $breakpoint-mobile) {
    padding: $spacing-md;
  }
}

.article-rail__header {
  margin: 0 0 $spacing-sm;
}

// 箭头按钮的定位上下文（轨道不设 overflow hidden，箭头浮在轨道边缘之上）
.article-rail__viewport {
  position: relative;
}

.rail-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  box-shadow: $shadow-sm;
  transition: $transition-base;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover:not(:disabled) {
    color: var(--color-accent-primary);
    border-color: rgba(var(--color-accent-primary-rgb), 0.4);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  &--prev {
    left: -4px;
  }

  &--next {
    right: -4px;
  }

  // 移动端：触控滑动为主，隐藏箭头
  @media (max-width: $breakpoint-mobile) {
    display: none;
  }
}

// 横向滑动轨道：隐藏滚动条（桌面靠箭头、移动靠触控滑动）
.article-rail__track {
  display: flex;
  gap: $spacing-md;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  padding: 4px 2px $spacing-sm;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>