<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import ArticleCard from '../components/ArticleCard.vue';
import Sidebar from '../components/Sidebar.vue';
import { useAppStore } from '../store/app';
import { getPublishedArticles } from '../api/article';
import { getSimpleUserProfile } from '../api/user';

const { t } = useI18n();
const { isLoading } = useAppStore();
const isFetching = ref(true);

const showContent = computed(() => !isLoading.value && !isFetching.value);

interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  image: string;
  viewCount?: number;
  likeCount?: number;
  favorites?: number;
  readingTimeMinutes?: number;
  authorName?: string;
  authorAvatar?: string;
}

const articles = ref<ArticleItem[]>([]);

// Fetch author profiles for a set of unique author IDs
async function fetchAuthorProfiles(
  authorIds: string[]
): Promise<Map<string, { name: string; avatar: string }>> {
  const map = new Map<string, { name: string; avatar: string }>();
  const uniqueIds = [...new Set(authorIds.filter(Boolean))];

  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const res = await getSimpleUserProfile(userId);
        if (res.isSuccess && res.data) {
          map.set(userId, { name: res.data.name, avatar: res.data.avatar });
        }
      } catch {
        // Silently ignore failed author fetches
      }
    })
  );

  return map;
}

const observeElements = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  setTimeout(() => {
    const elements = document.querySelectorAll('.fade-in-up');
    if (elements.length > 0) {
      elements.forEach((el) => observer.observe(el));
    }
  }, 100);
};

onMounted(async () => {
  try {
    const res = await getPublishedArticles();
    if (res.isSuccess && res.data) {
      const fetchedArticles = res.data;

      // Collect all author IDs to batch-fetch profiles
      const authorIds = fetchedArticles.map((a) => a.authorId);
      const authorMap = await fetchAuthorProfiles(authorIds);

      // Map all articles with full data
      articles.value = fetchedArticles.map((a) => {
        const author = authorMap.get(a.authorId);
        return {
          id: a.slug || a.id,
          title: a.title,
          summary: a.summary,
          date: a.publishAt || a.createdAt,
          tags: a.tags || [],
          image: a.coverUrl || '',
          viewCount: a.viewCount,
          likeCount: a.likeCount,
          favorites: a.favorites,
          readingTimeMinutes: a.readingTimeMinutes,
          authorName: a.authorName,
          authorAvatar: a.authorAvatar,
        };
      });

      // Sort: pinned articles first, then by publish date descending
      articles.value.sort((a, b) => {
        const aIsTop = fetchedArticles.find((fa) => (fa.slug || fa.id) === a.id)?.isTop;
        const bIsTop = fetchedArticles.find((fa) => (fa.slug || fa.id) === b.id)?.isTop;
        if (aIsTop && !bIsTop) return -1;
        if (!aIsTop && bIsTop) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  } finally {
    isFetching.value = false;
  }
});

watch(showContent, (val) => {
  if (val) {
    nextTick(() => {
      observeElements();
    });
  }
});
</script>

<template>
  <div>
    <!-- Main Content -->
    <div class="container content-layout">
      <div class="main-content">
        <!-- Articles List -->
        <section class="articles-section">
          <h2 class="section-title fade-in-up">
            <span class="text-gradient">{{ t('common.latestArticles') }}</span>
          </h2>

          <div class="articles-list" v-if="showContent">
            <div v-for="article in articles" :key="article.id" class="fade-in-up">
              <ArticleCard v-bind="article" />
            </div>
          </div>

          <!-- Skeleton List -->
          <div class="articles-list" v-else>
            <div v-for="i in 5" :key="i" class="skeleton-row">
              <div class="skeleton-line skeleton-line--short"></div>
              <div class="skeleton-line skeleton-line--long"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
            </div>
          </div>
        </section>
      </div>

      <aside class="sidebar-section fade-in-up">
        <Sidebar />
      </aside>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

// Skeleton Styles
.skeleton-row {
  padding: $spacing-lg;
  margin-bottom: 0;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.08);
  animation: pulse 1.5s infinite ease-in-out;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.06);
  }

  &--short { width: 30%; }
  &--long  { width: 70%; }
  &--medium { width: 50%; }
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}

.content-layout {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: $spacing-xxl;
  margin-top: $spacing-xxl;
  position: relative;

  @media (max-width: $breakpoint-desktop) {
    grid-template-columns: 1fr;
    gap: $spacing-xl;
  }
}

.section-title {
  font-size: 2rem;
  margin-bottom: $spacing-lg;
  font-weight: 800;
  letter-spacing: -1px;

  @media (max-width: $breakpoint-mobile) {
    font-size: 1.6rem;
  }

  span {
    font-weight: 300;
  }
}

.articles-list {
  display: flex;
  flex-direction: column;
  // No gap needed — ArticleCard has its own border-bottom + padding
}

.sidebar-section {
  position: sticky;
  top: 100px;
  height: fit-content;

  @media (max-width: $breakpoint-desktop) {
    position: static;
    order: 1;
  }
}
</style>
