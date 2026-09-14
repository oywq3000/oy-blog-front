<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getPopularTags, type TagStat } from '../api/article';
import TechIcon from './icons/TechIcon.vue';
import HotTagIcon from './icons/HotTagIcon.vue';
import { splitHotTags } from '../utils/tagDisplay';

const { t } = useI18n();

const officialTags = ref<TagStat[]>([]);
const userTags = ref<TagStat[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await getPopularTags();
    if (res.isSuccess && res.data) {
      // 官方云 20（覆盖全部预置标签）+ 用户自创云 12
      const { official, userCreated } = splitHotTags(res.data, 20, 12);
      officialTags.value = official;
      userTags.value = userCreated;
    }
  } catch (error) {
    console.error('Failed to fetch tags:', error);
  } finally {
    loading.value = false;
  }
});

/** 按热度分级：前三名大号、4-7 名中号、其余小号 */
const tierClass = (i: number) => (i < 3 ? 'tier-1' : i < 7 ? 'tier-2' : 'tier-3');
</script>

<template>
  <section class="tag-cloud" aria-label="热门标签">
    <h2 class="tag-cloud__title">
      <HotTagIcon class="tag-cloud__icon" />
      <span class="text-gradient">{{ t('sidebar.hotTags') }}</span>
    </h2>

    <!-- 官方云（预置标签） -->
    <div class="tag-cloud__official">
      <div v-if="loading" class="tag-cloud__chips" aria-hidden="true">
        <span v-for="i in 10" :key="i" class="tag-chip tag-chip--skeleton"></span>
      </div>

      <div v-else-if="officialTags.length" class="tag-cloud__chips">
        <router-link
          v-for="(tag, i) in officialTags"
          :key="tag.id"
          class="tag-chip"
          :class="tierClass(i)"
          :to="{ name: 'search', query: { q: tag.name, filter: 'tag' } }"
        >
          <TechIcon :name="tag.name" :size="14" class="tag-chip__icon" />
          <span class="tag-chip__name">{{ tag.name }}</span>
          <span class="tag-chip__count">{{ tag.articleCount }}</span>
        </router-link>
      </div>
    </div>

    <!-- 用户自创云（紧随官方云，不再单独加标题） -->
    <div v-if="userTags.length" class="tag-cloud__user">
      <div class="tag-cloud__chips">
        <router-link
          v-for="(tag, i) in userTags"
          :key="tag.id"
          class="tag-chip"
          :class="tierClass(i)"
          :to="{ name: 'search', query: { q: tag.name, filter: 'tag' } }"
        >
          <TechIcon :name="tag.name" :size="14" class="tag-chip__icon" />
          <span class="tag-chip__name">{{ tag.name }}</span>
          <span class="tag-chip__count">{{ tag.articleCount }}</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.tag-cloud {
  margin-bottom: $spacing-xl;
}

.tag-cloud__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -1px;
  margin: 0 0 $spacing-lg;
  text-align: center;

  .tag-cloud__icon {
    width: 26px;
    height: 26px;
  }

  @media (max-width: $breakpoint-mobile) {
    font-size: 1.6rem;
  }
}

.tag-cloud__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: $spacing-sm;
}

// 用户自创云：紧随官方云，仅保留一个紧凑间距让两组 chip 可辨
.tag-cloud__user {
  margin-top: $spacing-md;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: $radius-full;
  border: 1px solid var(--color-card-border);
  background: var(--color-card-bg);
  color: $color-text-secondary;
  text-decoration: none;
  transition: $transition-base;

  &:hover {
    border-color: $color-accent-primary;
    color: $color-text-primary;
    box-shadow: $shadow-sm;
    transform: translateY(-2px);
  }

  // 按热度分级
  &.tier-1 {
    font-size: 1.05rem;
    font-weight: 700;
    padding: 8px 18px;
  }

  &.tier-2 {
    font-size: 0.95rem;
    font-weight: 600;
    padding: 7px 16px;
  }

  &.tier-3 {
    font-size: 0.85rem;
    font-weight: 500;
    padding: 6px 14px;
  }

  &--skeleton {
    width: 84px;
    height: 34px;
    border-color: transparent;
    background: rgba(0, 0, 0, 0.08);
    animation: pulse 1.5s infinite ease-in-out;

    :global(.dark) & {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.tag-chip__icon {
  flex-shrink: 0;
}

.tag-chip__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: $radius-full;
  background: rgba(var(--color-accent-primary-rgb), 0.12);
  color: var(--color-accent-primary);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}
</style>
