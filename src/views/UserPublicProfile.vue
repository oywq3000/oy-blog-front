<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ArticleCard from '../components/ArticleCard.vue';
import CreatorPagination from '../components/CreatorPagination.vue';
import IconUser from '../components/icons/IconUser.vue';
import { getUserHeatmap, getUserPublishedArticles, type ArticleInfo } from '../api/article';
import { getUserPublicProfile, type UserPublicProfile } from '../api/user';
import { buildHeatmapData, buildMonthLabels, buildWeekdayLabels, cellBackground, type HeatmapData } from '../utils/heatmap';
import { useTheme } from '../composables/useTheme';

const route = useRoute();
const router = useRouter();
const { t, d } = useI18n();
const { theme } = useTheme();

const formatDate = (value: string | undefined) => {
  if (!value) return '';
  try {
    return d(new Date(value), 'short');
  } catch {
    return String(value);
  }
};

const userId = computed(() => String(route.params.id ?? ''));

// --- 用户公开信息（user-service /profile/public/{userId}：头像/名子/自传/统计） ---
const profile = ref<UserPublicProfile | null>(null);
const isProfileLoading = ref(true);
const notFound = ref(false);

// --- 公开热力图 ---
const heatmapData = ref<HeatmapData>(buildHeatmapData([])); // 初始全零网格，布局稳定
const isHeatmapLoading = ref(false);

// 月份标签按网格实际日期定位（列索引 → 标签）
const monthLabelByCol = computed(() => {
  const map = new Map<number, string>();
  for (const { label, colIndex } of buildMonthLabels(heatmapData.value)) {
    map.set(colIndex, label);
  }
  return map;
});

// 星期轴标签按网格第一格真实日期定位
const weekdayAxisLabels = computed(() => buildWeekdayLabels(heatmapData.value));

// --- 已发布文章（分页） ---
const articles = ref<ArticleInfo[]>([]);
const currentPage = ref(1);
const totalPages = ref(0);
const total = ref(0);
const pageSize = 10;
const isArticlesLoading = ref(false);

const loadProfile = async () => {
  isProfileLoading.value = true;
  notFound.value = false;
  try {
    const res = await getUserPublicProfile(userId.value);
    if (res.isSuccess && res.data) {
      profile.value = res.data;
    } else {
      notFound.value = true;
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
    notFound.value = true;
  } finally {
    isProfileLoading.value = false;
  }
};

const loadHeatmap = async () => {
  isHeatmapLoading.value = true;
  try {
    const res = await getUserHeatmap(userId.value);
    if (res.isSuccess) {
      heatmapData.value = buildHeatmapData(res.data || []);
    }
  } catch (error) {
    console.error('Failed to load heatmap:', error);
  } finally {
    isHeatmapLoading.value = false;
  }
};

const loadArticles = async (page = 1) => {
  isArticlesLoading.value = true;
  try {
    const res = await getUserPublishedArticles(userId.value, page, pageSize);
    if (res.isSuccess && res.data) {
      articles.value = res.data.data || [];
      currentPage.value = res.data.currentPage || page;
      totalPages.value = res.data.totalPages || 0;
      total.value = res.data.total || 0;
    } else {
      articles.value = [];
      currentPage.value = page;
      totalPages.value = 0;
      total.value = 0;
    }
  } catch (error) {
    console.error('Failed to load articles:', error);
    articles.value = [];
    currentPage.value = page;
    totalPages.value = 0;
    total.value = 0;
  } finally {
    isArticlesLoading.value = false;
  }
};

const changePage = (page: number) => {
  if (page < 1 || (totalPages.value > 0 && page > totalPages.value)) return;
  loadArticles(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const reload = () => {
  profile.value = null;
  heatmapData.value = buildHeatmapData([]);
  articles.value = [];
  loadProfile();
  loadHeatmap();
  loadArticles(1);
};

watch(userId, () => {
  if (userId.value) reload();
});

onMounted(() => {
  if (userId.value) reload();
});
</script>

<template>
  <div class="container profile-page">
    <div class="profile-layout">
      <!-- Left Sidebar: User Public Card -->
      <aside class="profile-sidebar">
        <div class="profile-card glass-panel">
          <template v-if="isProfileLoading">
            <div class="card-loading">
              <p>{{ t('common.loading', 'Loading...') }}</p>
            </div>
          </template>

          <template v-else-if="notFound || !profile">
            <IconUser :size="120" />
            <h1 class="username">{{ t('userProfile.notFound') }}</h1>
          </template>

          <template v-else>
            <div class="avatar-wrapper">
              <img v-if="profile.avatar" :src="profile.avatar" :alt="profile.name" class="profile-avatar-img" />
              <IconUser v-else :size="120" />
            </div>

            <div class="user-identity">
              <h1 class="username">{{ profile.name }}</h1>
              <p class="role-badge">Developer</p>
            </div>

            <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>

            <div class="stats-row">
              <div class="stat-item">
                <span class="count">{{ profile.articleCount ?? 0 }}</span>
                <span class="label">{{ t('profile.articles') }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="count">{{ profile.likeCount ?? 0 }}</span>
                <span class="label">{{ t('profile.likes') }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="count">{{ profile.favoriteCount ?? 0 }}</span>
                <span class="label">{{ t('profile.favorites') }}</span>
              </div>
            </div>

            <div v-if="profile.createdAt" class="info-list">
              <div class="info-item">
                <svg viewBox="0 0 24 24" class="icon"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor"/></svg>
                <span>{{ t('profile.joined') }} {{ formatDate(profile.createdAt) }}</span>
              </div>
            </div>
          </template>
        </div>
      </aside>

      <!-- Right Main Content -->
      <main class="profile-main">
        <!-- Activity Heatmap (public) -->
        <div class="activity-card glass-panel">
          <h3>{{ t('profile.activity', 'Activity') }}</h3>
          <div class="heatmap-container">
            <div class="heatmap-months">
              <div v-for="(_, i) in heatmapData" :key="i" class="heatmap-month-slot">
                <span v-if="monthLabelByCol.has(i)" class="heatmap-month">{{ monthLabelByCol.get(i) }}</span>
              </div>
            </div>
            <div class="heatmap-body">
              <div class="heatmap-days">
                <div v-for="(label, i) in weekdayAxisLabels" :key="i" class="heatmap-day-slot">
                  <span v-if="label" class="heatmap-day-label">{{ label }}</span>
                </div>
              </div>
              <div class="heatmap-grid" :key="theme">
                <div v-for="(week, i) in heatmapData" :key="i" class="heatmap-col">
                  <div
                    v-for="(day, j) in week"
                    :key="j"
                    class="heatmap-cell"
                    :style="{ backgroundColor: cellBackground(day.intensity) }"
                    :title="t('profile.heatmapTooltip', { count: day.count, date: day.date })"
                  ></div>
                </div>
              </div>
            </div>
            <div class="heatmap-legend">
              <span>Less</span>
              <div class="legend-scale">
                <div class="cell" :style="{ backgroundColor: cellBackground(0.1) }"></div>
                <div class="cell" :style="{ backgroundColor: cellBackground(0.4) }"></div>
                <div class="cell" :style="{ backgroundColor: cellBackground(0.7) }"></div>
                <div class="cell" :style="{ backgroundColor: cellBackground(1) }"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        <!-- Published Articles (paginated) -->
        <section class="published-section glass-panel">
          <h3 class="section-title">{{ t('userProfile.publishedArticles') }}</h3>
          <div v-if="isArticlesLoading" class="empty-state glass-panel">
            <p>{{ t('common.loading', 'Loading...') }}</p>
          </div>
          <div v-else-if="articles.length" class="articles-grid">
            <ArticleCard
              v-for="article in articles"
              :key="article.id"
              :id="article.id"
              :title="article.title"
              :summary="article.summary"
              :publish-at="article.publishAt || article.createdAt"
              :image="article.coverUrl"
              :tags="article.tags"
              :view-count="article.viewCount"
              :like-count="article.likeCount"
              :favorites="article.favorites"
              :reading-time-minutes="article.readingTimeMinutes"
              :author-name="article.authorName"
              :author-avatar="article.authorAvatar"
              :author-id="article.authorId"
            />
          </div>
          <div v-else class="empty-state glass-panel">
            <p>{{ t('userProfile.noArticles') }}</p>
          </div>
          <CreatorPagination
            v-if="totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            @page-change="changePage"
          />
        </section>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.profile-page {
  padding-top: 100px;
  padding-bottom: $spacing-xxl;
  max-width: 1400px;
  margin: 0 auto;
  padding-left: $spacing-lg;
  padding-right: $spacing-lg;
}

.profile-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.glass-panel {
  background: $color-card-bg;
  backdrop-filter: blur($backdrop-blur);
  -webkit-backdrop-filter: blur($backdrop-blur);
  border: 1px solid $color-card-border;
  border-radius: 16px;
  box-shadow: $shadow-card;
  transform: translate3d(0, 0, 0);
  will-change: transform, background-color;
}

/* Sidebar */
.profile-sidebar {
  .profile-card {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: sticky;
    top: 100px;
    min-height: 240px;
    justify-content: center;
  }

  .card-loading {
    color: $color-text-secondary;
  }

  .avatar-wrapper {
    width: 120px;
    height: 120px;
    margin-bottom: 1.5rem;

    .profile-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      border: 4px solid $color-bg-secondary;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .user-identity {
    margin-bottom: 1rem;

    .username {
      font-size: 1.5rem;
      font-weight: 700;
      color: $color-text-primary;
      margin-bottom: 4px;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba($color-accent-primary-rgb, 0.1);
      color: $color-accent-primary;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
  }

  .bio {
    color: $color-text-secondary;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    max-width: 90%;
  }

  .stats-row {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 1rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .count {
        font-weight: 700;
        font-size: 1.1rem;
        color: $color-text-primary;
      }

      .label {
        font-size: 0.75rem;
        color: $color-text-secondary;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .stat-divider {
      width: 1px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .info-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 1.5rem;

    .info-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: $color-text-secondary;
      font-size: 0.9rem;

      .icon {
        width: 18px;
        height: 18px;
        opacity: 0.7;
      }
    }
  }
}

/* Main */
.profile-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.activity-card {
  padding: 1.5rem;

  h3 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: $color-text-primary;
  }
}

/* Activity Heatmap */
.heatmap-container {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 10px;

  .heatmap-months {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
    padding-left: 32px;
    height: 1.1em;
    font-size: 0.75rem;
    color: $color-text-secondary;

    .heatmap-month-slot {
      position: relative;
      width: 10px;
      flex-shrink: 0;

      .heatmap-month {
        position: absolute;
        left: 0;
        white-space: nowrap;
      }
    }
  }

  .heatmap-body {
    display: flex;
    gap: 8px;
  }

  .heatmap-days {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.7rem;
    color: $color-text-secondary;
    height: 94px;
    flex-shrink: 0;

    .heatmap-day-slot {
      position: relative;
      width: 24px;
      height: 10px;
      flex-shrink: 0;

      .heatmap-day-label {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        line-height: 1;
        white-space: nowrap;
      }
    }
  }

  .heatmap-grid {
    display: flex;
    gap: 4px;

    .heatmap-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .heatmap-cell {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      transition: background-color 0.3s, transform 0.2s;
      position: relative;
      z-index: 1;

      &:hover {
        transform: scale(1.4);
        z-index: 10;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
        opacity: 1 !important;
      }
    }
  }

  .heatmap-legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
    font-size: 0.8rem;
    color: $color-text-secondary;

    .legend-scale {
      display: flex;
      gap: 4px;

      .cell {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }
    }
  }
}

/* Published articles */
.published-section {
  padding: 1.5rem;

  .section-title {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: $color-text-primary;
  }
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: $color-text-secondary;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
