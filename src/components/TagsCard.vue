<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import HotTagIcon from './icons/HotTagIcon.vue';
import TechIcon from './icons/TechIcon.vue';
import { getPopularTags, type TagStat } from '../api/article';

const { t } = useI18n();

// 常用标签（后端 /tags/popular：is_common=1，按文章数降序）
const tags = ref<TagStat[]>([]);

onMounted(async () => {
  try {
    const res = await getPopularTags();
    if (res.isSuccess) {
      tags.value = res.data.slice(0, 10); // 侧栏最多展示 10 个
    }
  } catch (e) {
    console.error('Failed to load popular tags', e);
  }
});
</script>

<template>
  <div class="tags-card">
    <div class="card-header">
      <h3 class="card-title">
        <HotTagIcon class="icon" />
        <span>{{ t('sidebar.hotTags') }}</span>
      </h3>
    </div>

    <div class="card-content">
      <div class="tags-list">
        <!-- 点击标签 → 搜索页按该标签精确过滤（filter=tag） -->
        <router-link
          v-for="tag in tags"
          :key="tag.id"
          :to="{ name: 'search', query: { q: tag.name, filter: 'tag' } }"
          class="tag-item"
        >
          <div class="tag-info">
            <TechIcon :name="tag.name" :size="16" class="tag-icon" />
            <span class="tag-name">{{ tag.name }}</span>
          </div>
          <span class="tag-count">{{ tag.articleCount }}</span>
        </router-link>
      </div>
      <!-- 空态：无常用标签时不渲染列表（不显示 loading 态以保持侧栏简洁） -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.tags-card {
  display: flex;
  flex-direction: column;
  background: $color-bg-secondary; 
  border: 1px solid rgba($color-border, 0.5);
  border-radius: 12px;
  box-shadow: $shadow-sm;
  overflow: hidden;
  flex-shrink: 0;
}

.card-header {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid rgba($color-border, 0.3);
  background: rgba($color-bg-secondary, 0.5);
  flex-shrink: 0;

  .card-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    color: $color-text-primary;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: 0.05em;
    
    .icon {
      width: 18px;
      height: 18px;
      color: $color-accent-primary;
    }
  }
}

.card-content {
  padding: 0.5rem 0;
}

.tags-list {
  display: flex;
  flex-direction: column;
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-icon {
  opacity: 0.8;
  transition: opacity 0.3s;
  flex-shrink: 0;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: $color-text-secondary;
  position: relative;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  // Hover Animation
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: $color-accent-primary;
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  
  &:hover {
    color: $color-text-primary;
    background: rgba($color-text-primary, 0.02);
    
    &::after {
      transform: scaleX(1);
      transform-origin: left;
    }
    
    .tag-count {
      background: rgba($color-accent-primary, 0.1);
      color: $color-accent-primary;
    }

    .tag-icon {
      opacity: 1;
      transform: scale(1.1);
    }
  }
  
  .tag-count {
    font-size: 0.75rem;
    background: rgba($color-text-secondary, 0.1);
    padding: 2px 8px;
    border-radius: 10px;
    transition: all 0.3s ease;
  }
}
</style>
