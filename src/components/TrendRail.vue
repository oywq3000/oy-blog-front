<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getTrendArticles, type ArticleInfo } from '../api/article';

const { t } = useI18n();
// 正在暴涨：近 7 天窗口差分榜（后端 /published/hot/trend），仅取第 1 页前 5 条
const trending = ref<ArticleInfo[]>([]);
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

function coverOf(a: ArticleInfo): string {
  return a.coverUrl || '';
}

function formatCount(n: number | undefined): string {
  if (n == null) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

async function load() {
  try {
    const res = await getTrendArticles(1, 5);
    if (res.isSuccess && res.data) {
      trending.value = res.data.data;
      await nextTick(); // 卡片渲染完成后轨道才有真实宽度，才能初始化边界态
      updateArrowState();
    }
  } catch (e) {
    // request 拦截器对失败一律 reject：区块静默隐藏，不影响首页其余内容
    console.error('Failed to load trending articles:', e);
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
  <!-- 无趋势数据（空数组）或拉取失败时不渲染整块，首页不留空洞 -->
  <section v-if="trending.length" class="trend-rail">
    <!-- 标题与下方双窗格 pane-title 同款：text-gradient 主题渐变字 -->
    <h2 class="trend-rail__title">
      <span class="trend-rail__title-icon" aria-hidden="true">📈</span>
      <span class="text-gradient">{{ t('home.trending') }}</span>
    </h2>
    <!-- 横向滑动区：左右箭头（桌面，边界自动禁用）+ 轨道（触控滑动/滚轮横滑保留） -->
    <div class="trend-rail__viewport">
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
      <div ref="trackEl" class="trend-rail__track" @scroll="updateArrowState">
        <router-link
          v-for="a in trending"
          :key="a.id"
          class="trend-card"
          :class="{ 'trend-card--no-cover': !coverOf(a) }"
          :to="{ name: 'article-detail', params: { id: a.id } }"
        >
          <!-- 有封面：图片铺满 + 底部黑渐变信息带 -->
          <template v-if="coverOf(a)">
            <img class="trend-card__cover" :src="coverOf(a)" :alt="a.title" loading="lazy" decoding="async" />
            <div class="trend-card__meta">
              <span class="trend-card__title">{{ a.title }}</span>
              <span class="trend-card__views">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {{ formatCount(a.viewCount) }}
              </span>
            </div>
          </template>
          <!-- 无封面：扁平主题卡（站点扁平风格）——📈 徽标 + 标题两行 + 浏览量，不留白 -->
          <div v-else class="trend-card__art">
            <span class="trend-card__art-badge" aria-hidden="true">📈</span>
            <span class="trend-card__art-title">{{ a.title }}</span>
            <span class="trend-card__art-views">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {{ formatCount(a.viewCount) }}
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

// 与双窗格（.article-pane）同款卡片盒：同背景/边框/圆角/padding，保持整页视觉对齐
.trend-rail {
  margin-bottom: $spacing-lg;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg $spacing-lg;

  @media (max-width: $breakpoint-mobile) {
    padding: $spacing-md;
  }
}

.trend-rail__title {
  margin: 0 0 $spacing-sm;
  padding-bottom: $spacing-sm;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
  // 与窗格标题一致的分隔线（gradient 文字由 .text-gradient 着色，见模板）
  border-bottom: 1px dashed var(--color-border);
}

.trend-rail__title-icon {
  margin-right: 6px;
}

// 箭头按钮的定位上下文（轨道不设 overflow hidden，按钮浮在轨道边缘之上）
.trend-rail__viewport {
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
.trend-rail__track {
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

// 横版封面卡：封面铺满 + 底部黑渐变信息带；无封面 = 主题渐变底（不留空白、不占位图）
.trend-card {
  position: relative;
  flex: 0 0 240px;
  aspect-ratio: 16 / 10;
  border-radius: $radius-lg;
  overflow: hidden;
  scroll-snap-align: start;
  text-decoration: none;
  background: $color-bg-secondary;
  border: 1px solid rgba($color-border, 0.5);
  box-shadow: $shadow-sm;
  transition: $transition-base;

  @media (max-width: $breakpoint-mobile) {
    flex-basis: 180px;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--color-accent-primary-rgb), 0.35);
    box-shadow: var(--color-card-hover-shadow);

    .trend-card__cover {
      transform: scale(1.06);
    }
  }
}

.trend-card__cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

// 无封面 = 扁平主题卡（站点扁平风格）：无光晕无投影
.trend-card--no-cover {
  background: var(--color-bg-secondary);
}

// 有封面时底部黑渐变信息带
.trend-card__meta {
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

.trend-card__title {
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-card__views {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  opacity: 0.9;
  font-family: $font-family-code;

  svg {
    width: 13px;
    height: 13px;
  }
}

// 无封面扁平卡内容：📈 徽标 + 标题 + 浏览量
.trend-card__art {
  position: absolute;
  inset: 0;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
}

.trend-card__art-badge {
  font-size: 1.3rem;
  line-height: 1;
}

.trend-card__art-title {
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.trend-card__art-views {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  font-family: $font-family-code;

  svg {
    width: 13px;
    height: 13px;
  }
}
</style>
