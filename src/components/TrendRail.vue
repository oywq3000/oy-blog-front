<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getTrendArticles, type ArticleInfo } from '../api/article';
import IconMdiTrendingUp from '~icons/mdi/trending-up';
import ArticleRail from './ArticleRail.vue';
import ArticleRailCard from './ArticleRailCard.vue';

const { t } = useI18n();
// 正在暴涨：近 7 天窗口差分榜（后端 /published/hot/trend），仅取第 1 页前 5 条
const trending = ref<ArticleInfo[]>([]);
const railEl = ref<InstanceType<typeof ArticleRail> | null>(null);

async function load() {
  try {
    const res = await getTrendArticles(1, 5);
    if (res.isSuccess && res.data) {
      trending.value = res.data.data;
      await nextTick(); // 卡片渲染后轨道才有真实宽度，初始化箭头边界态
      railEl.value?.refreshArrows();
    }
  } catch (e) {
    // request 拦截器对失败一律 reject：区块静默隐藏，不影响首页其余内容
    console.error('Failed to load trending articles:', e);
  }
}

onMounted(load);
</script>

<template>
  <!-- 无趋势数据（空数组）或拉取失败时不渲染整块，首页不留空洞 -->
  <section v-if="trending.length" class="trend-rail">
    <ArticleRail
      ref="railEl"
      :prev-label="t('home.scrollLeft')"
      :next-label="t('home.scrollRight')"
      :region-label="t('home.trending')"
    >
      <!-- 标题与双窗格 pane-title 同款：text-gradient 主题渐变字 -->
      <template #title>
        <h2 class="trend-rail__title">
          <IconMdiTrendingUp class="trend-rail__title-icon" aria-hidden="true" />
          <span class="text-gradient">{{ t('home.trending') }}</span>
        </h2>
      </template>
      <ArticleRailCard
        v-for="a in trending"
        :key="a.id"
        size="sm"
        :id="a.id"
        :title="a.title"
        :summary="a.summary"
        :image="a.coverUrl || undefined"
        :tags="a.tags"
        :art-icon="IconMdiTrendingUp"
        :art-label="t('home.trending')"
        :author-name="a.authorName"
        :author-avatar="a.authorAvatar"
        :author-id="a.authorId"
        :view-count="a.viewCount"
        :like-count="a.likeCount"
        :reading-time-minutes="a.readingTimeMinutes"
      />
    </ArticleRail>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

// 外层只负责空态判定与纵向间距；卡片盒/箭头/卡片样式下沉到 ArticleRail / ArticleRailCard
.trend-rail {
  margin-bottom: $spacing-lg;
}

// 与双窗格 pane-title 同款标题：gradient 文字由 .text-gradient 着色
.trend-rail__title {
  margin: 0;
  padding-bottom: $spacing-sm;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
  border-bottom: 1px dashed var(--color-border);
}

.trend-rail__title-icon {
  margin-right: 6px;
  // SVG 以 1em 为基准：随 font-size 定尺寸；accent 色与右侧 text-gradient 主题呼应
  font-size: 1.2rem;
  color: var(--color-accent-primary);
  vertical-align: -0.15em;
}
</style>