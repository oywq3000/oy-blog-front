<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getRandomSeries, type SeriesReadItem } from '../api/article';

const { t } = useI18n();
// 首页随机专栏：仅含有已发布文章的专栏（后端过滤），每次进入随机一批
const series = ref<SeriesReadItem[]>([]);

onMounted(async () => {
  try {
    const res = await getRandomSeries();
    if (res.isSuccess && res.data) {
      series.value = res.data;
    }
  } catch (e) {
    // request 拦截器对失败一律 reject：区块静默隐藏，不影响首页其余内容
    console.error('Failed to load random columns:', e);
  }
});
</script>

<template>
  <!-- 无有效专栏（空数组）或拉取失败时不渲染整块，首页不留空洞 -->
  <section v-if="series.length" class="column-rail">
    <!-- 标题与上方双窗格 pane-title 同款：text-gradient 主题渐变字 -->
    <h2 class="column-rail__title">
      <span class="text-gradient">{{ t('home.columns') }}</span>
    </h2>
    <div class="column-rail__track">
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
        <!-- 无封面：中性深色文字封面卡（大字名称 + 简介 + 篇数），不是紫色占位/默认图 -->
        <div v-else class="column-card__text">
          <div class="column-card__text-main">
            <span class="column-card__text-title">{{ s.name }}</span>
            <span v-if="s.description" class="column-card__text-desc">{{ s.description }}</span>
          </div>
          <span class="column-card__text-count">{{ t('home.columnArticles', { count: s.articleCount }) }}</span>
        </div>
      </router-link>
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

// 横向滑动轨道：隐藏滚动条但保留触控/滚轮横滑
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

// 无封面 = 浅色文字封面卡：浅灰渐变底 + 深色文字（语义变量在暗主题自动翻转深底白字，
// 不再使用品牌紫大面积渐变，避免被误读为"默认紫图"）
.column-card--no-cover {
  background: linear-gradient(135deg, var(--color-bg-secondary), var(--color-border));
}

.column-card__text {
  position: absolute;
  inset: 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.column-card__text-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.column-card__text-title {
  color: var(--color-text-primary);
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.column-card__text-desc {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.column-card__text-count {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
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
