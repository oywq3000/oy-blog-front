<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import CreatorSidebar from '../components/CreatorSidebar.vue';
import { useCreatorStore } from '../store/creator';

const { t } = useI18n();
const route = useRoute();
const { draftCount, refreshDraftCount } = useCreatorStore();

onMounted(() => {
  refreshDraftCount();
});

// Refresh draft count when navigating between tabs
watch(() => route.path, () => {
  refreshDraftCount();
});
</script>

<template>
  <div class="creator-layout">
    <CreatorSidebar />
    <main class="creator-content">
      <!-- Tabs -->
      <div class="creator-tabs">
        <router-link
          to="/creator/published"
          class="tab-btn"
          active-class="tab-btn--active"
        >
          {{ t('creator.published') }}
        </router-link>
        <router-link
          to="/creator/drafts"
          class="tab-btn"
          active-class="tab-btn--active"
        >
          {{ t('creator.drafts') }}
          <span v-if="draftCount > 0" class="tab-badge">{{ draftCount }}</span>
        </router-link>
      </div>

      <!-- Child route content -->
      <router-view />
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.creator-layout {
  display: flex;
  min-height: calc(100vh - 70px);
  padding-top: 70px;
}

.creator-content {
  flex: 1;
  padding: 24px;
  min-width: 0;
}

.creator-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 2px solid $color-border;
  padding-bottom: 0;
}

.tab-btn {
  padding: 10px 24px;
  font-size: 0.95rem;
  font-weight: 500;
  color: $color-text-secondary;
  text-decoration: none;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: $color-text-primary;
  }

  &--active {
    color: $color-accent-primary;
    border-bottom-color: $color-accent-primary;
  }
}

.tab-badge {
  background: #f38ba8;
  color: #fff;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

// Mobile
@media (max-width: 768px) {
  .creator-layout {
    flex-direction: column;
  }

  .creator-content {
    padding: 16px;
  }

  .tab-btn {
    padding: 8px 16px;
    font-size: 0.85rem;
  }
}
</style>
