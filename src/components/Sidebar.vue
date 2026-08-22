<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../store/user';
import type { UserArticleStats } from '../api/article';

/** 站长公开统计（来自 getUserStats，未配置 OWNER_USER_ID 时为 null） */
defineProps<{
  ownerStats?: UserArticleStats | null;
}>();

const { t } = useI18n();
const { isLoggedIn, user } = useUserStore();
</script>

<template>
  <aside class="sidebar">
    <!-- 登录用户卡片 -->
    <div class="sidebar__widget author-card glass-panel" v-if="isLoggedIn && user">
      <div class="author-card__avatar">
        <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.username" class="user-avatar-img" />
        <div v-else class="avatar-placeholder">{{ user.username.charAt(0).toUpperCase() }}</div>
      </div>
      <h3 class="author-card__name text-gradient">{{ user.username }}</h3>

      <!-- Optimized Email Display -->
      <div class="author-card__contact">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="contact-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <span class="contact-text">{{ user.email }}</span>
      </div>

      <div class="author-card__info">
        <!-- Bio / Self Introduction -->
        <p class="bio-text">
          {{ user.bio || t('sidebar.defaultBio') }}
        </p>
      </div>
    </div>

    <!-- 站长公开信息卡（访客可见；未配置 OWNER_USER_ID 时不展示） -->
    <div class="sidebar__widget author-card glass-panel" v-else-if="ownerStats">
      <div class="author-card__avatar">
        <img v-if="ownerStats.avatar" :src="ownerStats.avatar" :alt="ownerStats.name" class="user-avatar-img" />
        <div v-else class="avatar-placeholder">{{ ownerStats.name.charAt(0).toUpperCase() }}</div>
      </div>
      <h3 class="author-card__name text-gradient">{{ ownerStats.name }}</h3>

      <div class="author-card__info">
        <p class="bio-text">
          {{ ownerStats.bio || t('sidebar.defaultBio') }}
        </p>
      </div>

      <div class="author-card__stats">
        <div class="stat-box">
          <span class="stat-value">{{ ownerStats.articleCount ?? 0 }}</span>
          <span class="stat-label">{{ t('home.stats.articles') }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">{{ ownerStats.likeCount ?? 0 }}</span>
          <span class="stat-label">{{ t('home.stats.likes') }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.sidebar {
  &__widget {
    padding: 5px; // Reduced from $spacing-xl (24px) to 5px for tighter layout
    margin-bottom: $spacing-xl;
    position: relative;
    overflow: hidden;
    border-radius: 20px;
    background: var(--color-card-bg);
    border: 1px solid var(--color-card-border);
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

    &:hover {
      transform: translateY(-2px);
      border-color: rgba($color-accent-primary, 0.1);
      box-shadow: var(--color-card-hover-shadow);
      background: var(--color-card-bg);
    }
  }
}

.author-card {
  text-align: center;
  padding: 10px 5px; // Extra internal breathing room

  &__avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 2px solid var(--color-border); // Slightly thicker border
    padding: 4px;
    margin: 5px auto $spacing-md; // Reduced margins
    background: var(--color-bg-secondary);

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, $color-bg-secondary, $color-bg-primary);
      color: $color-text-secondary;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 600;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    &:hover .avatar-placeholder {
      color: $color-accent-primary;
      border-color: rgba($color-accent-primary, 0.3);
      box-shadow: 0 0 20px rgba($color-accent-primary, 0.15);
      transform: scale(1.05);
    }
  }

  &__name {
    font-size: 1.4rem;
    font-weight: 700;
    margin-bottom: 5px; // Tightened
    letter-spacing: -0.5px;
  }

  &__contact {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 14px;
    margin-bottom: 15px;
    background: rgba(var(--color-bg-secondary-rgb), 0.05); // Fallback or variable usage
    background: var(--color-bg-secondary);
    border-radius: 50px; // Pill shape
    border: 1px solid transparent;
    transition: all 0.3s ease;
    max-width: 100%;

    .contact-icon {
      color: $color-text-secondary;
      opacity: 0.7;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .contact-text {
      font-size: 0.85rem;
      color: $color-text-secondary;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &:hover {
      background: var(--color-card-bg);
      border-color: rgba($color-accent-primary, 0.3);
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transform: translateY(-1px);

      .contact-icon {
        color: $color-accent-primary;
        opacity: 1;
      }

      .contact-text {
        color: $color-text-primary;
      }
    }
  }

  .user-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 1px solid var(--color-border);
  }

  .author-card__info {
    margin-top: 0;
    margin-bottom: 20px;
    padding: 0 15px;

    .bio-text {
      font-size: 0.9rem;
      line-height: 1.6;
      color: $color-text-secondary;
      font-style: italic;
      opacity: 0.85;
      position: relative;

      &::before {
        content: '"';
        font-size: 1.4rem;
        color: var(--color-accent-primary);
        opacity: 0.5;
        margin-right: 4px;
        vertical-align: -3px;
      }

      &::after {
        content: '"';
        font-size: 1.4rem;
        color: var(--color-accent-primary);
        opacity: 0.5;
        margin-left: 4px;
        vertical-align: -6px;
        line-height: 0;
      }
    }
  }

  // 站长卡：迷你统计
  &__stats {
    display: flex;
    justify-content: center;
    gap: $spacing-xl;
    padding: 0 0 16px;
    margin-top: -8px;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: $color-text-primary;
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    font-size: 0.75rem;
    color: $color-text-secondary;
  }
}
</style>
