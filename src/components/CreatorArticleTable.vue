<script setup lang="ts">
import type { ArticleInfo } from '../api/article';

defineProps<{
  articles: ArticleInfo[];
  status: 'published' | 'draft';
  isLoading: boolean;
}>();

const emit = defineEmits<{
  'edit': [id: string];
  'delete': [id: string];
  'publish': [id: string];
}>();

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<template>
  <div class="article-table-wrapper">
    <table class="article-table">
      <thead>
        <tr>
          <th class="col-title">{{ $t('creator.title') }}</th>
          <th v-if="status === 'published'" class="col-category">{{ $t('creator.category') }}</th>
          <th class="col-time">{{ status === 'published' ? $t('creator.time') : $t('creator.lastModified') }}</th>
          <th v-if="status === 'published'" class="col-views">{{ $t('creator.views') }}</th>
          <th v-if="status === 'published'" class="col-comments">{{ $t('creator.comments') }}</th>
          <th class="col-actions">{{ $t('creator.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="isLoading">
          <td :colspan="status === 'published' ? 6 : 3" class="empty-cell">
            {{ $t('common.loading') || 'Loading...' }}
          </td>
        </tr>
        <tr v-else-if="articles.length === 0">
          <td :colspan="status === 'published' ? 6 : 3" class="empty-cell">
            {{ status === 'published' ? $t('creator.emptyPublished') : $t('creator.emptyDrafts') }}
          </td>
        </tr>
        <tr v-for="article in articles" :key="article.id">
          <!-- Title -->
          <td class="col-title">
            <router-link
              v-if="status === 'published'"
              :to="`/article/${article.id}`"
              target="_blank"
              class="title-link"
            >
              {{ article.title || $t('editor.untitled') || 'Untitled' }}
            </router-link>
            <router-link
              v-else
              :to="`/creator/articles/${article.id}/edit`"
              class="title-link"
            >
              {{ article.title || $t('editor.untitled') || 'Untitled' }}
            </router-link>
          </td>

          <!-- Category (published only) -->
          <td v-if="status === 'published'" class="col-category">
            {{ article.categoryCode || '-' }}
          </td>

          <!-- Time -->
          <td class="col-time">
            {{ formatDate(status === 'published' ? article.publishAt : article.updatedAt) }}
          </td>

          <!-- Views (published only) -->
          <td v-if="status === 'published'" class="col-views">
            {{ article.viewCount ?? 0 }}
          </td>

          <!-- Comments (published only) -->
          <td v-if="status === 'published'" class="col-comments">
            {{ article.commentCount ?? 0 }}
          </td>

          <!-- Actions -->
          <td class="col-actions">
            <template v-if="status === 'published'">
              <button class="action-btn action-edit" @click="emit('edit', article.id)">
                {{ $t('creator.edit') }}
              </button>
              <button class="action-btn action-delete" @click="emit('delete', article.id)">
                {{ $t('creator.delete') }}
              </button>
            </template>
            <template v-else>
              <button class="action-btn action-edit" @click="emit('edit', article.id)">
                {{ $t('creator.continueEdit') }}
              </button>
              <button class="action-btn action-publish" @click="emit('publish', article.id)">
                {{ $t('creator.publish') }}
              </button>
              <button class="action-btn action-delete" @click="emit('delete', article.id)">
                {{ $t('creator.delete') }}
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.article-table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.article-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th {
    text-align: left;
    padding: 12px 16px;
    border-bottom: 2px solid $color-border;
    color: $color-text-secondary;
    font-weight: 600;
    white-space: nowrap;
  }

  td {
    padding: 12px 16px;
    border-bottom: 1px solid $color-border;
    color: $color-text-primary;
  }

  tbody tr:hover {
    background: $color-bg-secondary;
  }
}

.col-title {
  min-width: 180px;
}

.col-category {
  width: 100px;
}

.col-time {
  width: 150px;
  white-space: nowrap;
}

.col-views,
.col-comments {
  width: 70px;
  text-align: center;
}

.col-actions {
  width: 180px;
  white-space: nowrap;
}

.title-link {
  color: $color-text-primary;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: $color-accent-primary;
  }
}

.empty-cell {
  text-align: center;
  color: $color-text-tertiary;
  padding: 40px 16px;
}

.action-btn {
  padding: 4px 12px;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 6px;

  &:last-child {
    margin-right: 0;
  }
}

.action-edit {
  background: transparent;
  color: $color-accent-primary;
  border-color: $color-accent-primary;

  &:hover {
    background: $color-accent-primary;
    color: #fff;
  }
}

.action-publish {
  background: transparent;
  color: #10b981;
  border-color: #10b981;

  &:hover {
    background: #10b981;
    color: #fff;
  }
}

.action-delete {
  background: transparent;
  color: #ef4444;
  border-color: #ef4444;

  &:hover {
    background: #ef4444;
    color: #fff;
  }
}

// Mobile: ensure table scrolls horizontally
@media (max-width: 768px) {
  .article-table {
    font-size: 0.8rem;

    th,
    td {
      padding: 8px 10px;
    }
  }

  .col-actions {
    width: auto;
  }

  .action-btn {
    padding: 4px 8px;
    font-size: 0.75rem;
    margin-right: 4px;
  }
}
</style>
