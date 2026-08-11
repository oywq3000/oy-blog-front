<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCreatorStore } from '../store/creator';

const { t } = useI18n();
const { draftCount } = useCreatorStore();

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
}

const navGroups = computed<NavGroup[]>(() => [
  {
    id: 'content',
    title: t('creator.contentManagement'),
    icon: '📝',
    items: [
      { id: 'published', label: t('creator.published'), icon: '📄', path: '/creator/published' },
      { id: 'drafts', label: t('creator.drafts'), icon: '📋', path: '/creator/drafts', badge: draftCount.value },
    ],
  },
  // Reserved for future expansion:
  // {
  //   id: 'analytics',
  //   title: t('creator.analytics'),
  //   icon: '📊',
  //   items: [
  //     { id: 'read-count', label: t('creator.readCount'), icon: '👁️', path: '/creator/analytics/reads' },
  //   ],
  // },
]);
</script>

<template>
  <aside class="sidebar">
    <!-- CTA: Create Article -->
    <div class="sidebar-create">
      <router-link to="/creator/articles/new" class="btn-create">
        ✏️ {{ t('creator.createArticle') }}
      </router-link>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
      <ul>
        <li v-for="group in navGroups" :key="group.id" class="nav-group">
          <div class="nav-group-title">{{ group.icon }} {{ group.title }}</div>
          <ul class="nav-sub">
            <li v-for="item in group.items" :key="item.id" class="nav-item">
              <router-link :to="item.path" class="nav-link" active-class="nav-link--active">
                <span class="icon">{{ item.icon }}</span>
                <span class="label">{{ item.label }}</span>
                <span v-if="item.badge !== undefined && item.badge > 0" class="badge">{{ item.badge }}</span>
              </router-link>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.sidebar {
  width: 220px;
  min-height: calc(100vh - 70px);
  background: $color-card-bg;
  color: $color-text-primary;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 70px;
  flex-shrink: 0;
  border-right: 1px solid $color-border;
}

.sidebar-create {
  padding: 20px 16px;
  border-bottom: 1px solid $color-border;
}

.btn-create {
  display: block;
  width: 100%;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  color: #fff;
  background: $color-accent-primary;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
}

.nav-group-title {
  padding: 16px 16px 6px;
  font-size: 11px;
  color: $color-text-tertiary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-sub {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  margin: 2px 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: $radius-sm;
  color: $color-text-secondary;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  .icon {
    flex-shrink: 0;
  }

  .label {
    flex: 1;
  }

  &:hover {
    background: $color-bg-secondary;
    color: $color-text-primary;
  }

  &--active {
    background: rgba(var(--color-accent-primary-rgb), 0.12);
    color: $color-accent-primary;
    font-weight: 600;
  }
}

.badge {
  background: #f38ba8;
  color: #fff;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

// Mobile: collapse sidebar to top card
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    min-height: auto;
    position: static;
    flex-direction: column;
    padding: 16px;
    border-right: none;
    border-bottom: 1px solid $color-border;
  }

  .sidebar-create {
    padding: 0 0 12px 0;
    border-bottom: 1px solid $color-border;
    margin-bottom: 12px;
  }

  .btn-create {
    max-width: 200px;
  }

  .nav-group-title {
    padding: 8px 0 4px;
  }

  .nav-sub {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .nav-item {
    margin: 0;
  }

  .nav-link {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>
