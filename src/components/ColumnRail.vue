<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getRandomSeries, type SeriesReadItem } from '../api/article';
import SeriesBadge from './SeriesBadge.vue';

const { t } = useI18n();
// 首页随机专栏：仅含有已发布文章的专栏（后端过滤），每次进入随机一批
const series = ref<SeriesReadItem[]>([]);
const trackEl = ref<HTMLElement | null>(null);
const canScrollPrev = ref(false);
const canScrollNext = ref(false);

// 轨道边界态：两端各留 4px 余量，防 1px 舍入导致按钮在尽头仍可点
function updateArrowState() {
  const el = trackEl.value;
  if (!el) return;
  canScrollPrev.value = el.scrollLeft > 4;
  canScrollNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
}

// 箭头点击：每次滚动可视宽度 ~80%（约一屏少一点，便于看到上下文）
function scrollStep(dir: number) {
  const el = trackEl.value;
  if (!el) return;
  el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
}

async function load() {
  try {
    const res = await getRandomSeries();
    if (res.isSuccess && res.data) {
      series.value = res.data;
      await nextTick(); // 卡片渲染完成后轨道才有真实宽度，才能初始化边界态
      updateArrowState();
    }
  } catch (e) {
    // request 拦截器对失败一律 reject：区块静默隐藏，不影响首页其余内容
    console.error('Failed to load random columns:', e);
  }
}

onMounted(() => {
  load();
  window.addEventListener('resize', updateArrowState);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateArrowState);
});
</script>

<template>
  <!-- 无有效专栏（空数组）或拉取失败时不渲染整块，首页不留空洞 -->
  <section v-if="series.length" class="column-rail">
    <!-- 标题与上方双窗格 pane-title 同款：text-gradient 主题渐变字 -->
    <h2 class="column-rail__title">
      <span class="text-gradient">{{ t('home.columns') }}</span>
    </h2>
    <!-- 横向滑动区：左右箭头（桌面，边界自动禁用）+ 轨道（触控滑动/滚轮横滑保留） -->
    <div class="column-rail__viewport">
      <button
        type="button"
        class="rail-arrow rail-arrow--prev"
        :disabled="!canScrollPrev"
        :aria-label="t('home.scrollLeft')"
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
        :aria-label="t('home.scrollRight')"
        @click="scrollStep(1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div ref="trackEl" class="column-rail__track" @scroll="updateArrowState">
      <router-link
        v-for="s in series"
        :key="s.id"
        class="column-card"
        :class="{ 'column-card--no-cover': !s.coverUrl }"
        :to="{ name: 'column-detail', params: { id: s.id } }"
      >
        <!-- 有封面：图片铺满 + 底部黑渐变信息带 -->
        <template v-if="s.coverUrl">
          <img class="column-card__cover" :src="s.coverUrl" :alt="s.name" loading="lazy" decoding="async" />
          <div class="column-card__meta">
            <span class="column-card__name">{{ s.name }}</span>
            <span class="column-card__count">{{ t('home.columnArticles', { count: s.articleCount }) }}</span>
          </div>
        </template>
        <!-- 无封面：扁平主题卡——渐变小徽章 + 名称一行，下排简介/篇数；无光晕无投影 -->
        <div v-else class="column-card__art">
          <div class="column-card__art-row">
            <SeriesBadge />
            <span class="column-card__art-name">{{ s.name }}</span>
          </div>
          <span v-if="s.description" class="column-card__art-desc">{{ s.description }}</span>
          <div class="column-card__art-foot">
            <span class="column-card__art-count">{{ t('home.columnArticles', { count: s.articleCount }) }}</span>
          </div>
        </div>
      </router-link>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

// 与上方最新/最热门窗格（.article-pane）同款卡片盒：同背景/边框/圆角/padding，
// 保持整页视觉对齐
.column-rail {
  margin-top: $spacing-lg;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg $spacing-lg;

  @media (max-width: $breakpoint-mobile) {
    padding: $spacing-md;
  }
}

.column-rail__title {
  margin: 0 0 $spacing-sm;
  padding-bottom: $spacing-sm;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
  // 与窗格标题一致的分隔线（gradient 文字由 .text-gradient 着色，见模板）
  border-bottom: 1px dashed var(--color-border);
}

// 箭头按钮的定位上下文（轨道不设 overflow hidden，按钮浮在轨道边缘之上）
.column-rail__viewport {
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
.column-rail__track {
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

// 方形卡片：封面铺满 + 底部黑渐变信息带；无封面 = 主题渐变底（不留空白、不占位图）
.column-card {
  position: relative;
  flex: 0 0 200px;
  aspect-ratio: 1 / 1;
  border-radius: $radius-lg;
  overflow: hidden;
  scroll-snap-align: start;
  text-decoration: none;
  background: $color-bg-secondary;
  border: 1px solid rgba($color-border, 0.5);
  box-shadow: $shadow-sm;
  transition: $transition-base;

  @media (max-width: $breakpoint-mobile) {
    flex-basis: 150px;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--color-accent-primary-rgb), 0.35);
    box-shadow: var(--color-card-hover-shadow);

    .column-card__cover {
      transform: scale(1.06);
    }
  }
}

.column-card__cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

// 无封面 = 扁平主题卡（站点扁平风格）：无光晕无投影，主题色只落在渐变小徽章上，
// 文字层级用语义变量（暗主题自动翻转）
.column-card--no-cover {
  background: var(--color-bg-secondary);
}

.column-card__art {
  position: absolute;
  inset: 0;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}

// 徽章 + 名称同行
.column-card__art-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.column-card__art-name {
  min-width: 0;
  color: var(--color-text-primary);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 简介：最多 3 行（移动端 2 行）
.column-card__art-desc {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: $breakpoint-mobile) {
    -webkit-line-clamp: 2;
  }
}

.column-card__art-foot {
  display: flex;
  justify-content: flex-end;
}

.column-card__art-count {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-family: $font-family-code;
}

.column-card__meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  padding: 28px 12px 10px;
  color: #fff;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.66), transparent);
}

.column-card__name {
  font-size: 0.95rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.column-card__count {
  flex-shrink: 0;
  font-size: 0.78rem;
  opacity: 0.85;
  font-family: $font-family-code;
}
</style>
