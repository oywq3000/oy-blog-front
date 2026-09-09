<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getMySeries, createSeries, updateSeries, deleteSeries } from '../api/article';
import type { SeriesOwn, SeriesSaveDto } from '../api/article';
import { useToast } from '../composables/useToast';

// 创作中心「专栏」管理页：我的专栏列表（名称/描述/封面缩略图/已发布计数）
// + 新建/编辑共用表单弹窗 + 删除二次确认（window.confirm，与 CreatorDrafts/CreatorPublished 一致；
// 项目未引入 element-plus，弹窗为手写 Teleport 面板，形态同 ReviewReasonModal）
const { t } = useI18n();
const toast = useToast();

const columns = ref<SeriesOwn[]>([]);
const isLoading = ref(false);

async function load() {
  isLoading.value = true;
  try {
    const res = await getMySeries();
    if (res.isSuccess) columns.value = res.data ?? [];
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  } finally {
    isLoading.value = false;
  }
}

// ---- 新建/编辑共用表单（dialog） ----
const showForm = ref(false);
const editingId = ref<string | null>(null);
const isSaving = ref(false);
const form = reactive({ name: '', description: '', coverUrl: '' });

function openCreate() {
  editingId.value = null;
  form.name = '';
  form.description = '';
  form.coverUrl = '';
  showForm.value = true;
}

function openEdit(c: SeriesOwn) {
  editingId.value = c.id;
  form.name = c.name;
  form.description = c.description ?? '';
  form.coverUrl = c.coverUrl ?? '';
  showForm.value = true;
}

function closeForm() {
  if (isSaving.value) return;
  showForm.value = false;
}

async function save() {
  if (isSaving.value) return;
  const name = form.name.trim();
  if (!name) {
    toast.addToast(t('creator.columnNameRequired'), 'warning');
    return;
  }
  isSaving.value = true;
  // name 必填；description/coverUrl 空值不随 payload（后端可选）
  const payload: SeriesSaveDto = { name };
  if (form.description.trim()) payload.description = form.description.trim();
  if (form.coverUrl.trim()) payload.coverUrl = form.coverUrl.trim();
  try {
    const res = editingId.value
      ? await updateSeries(editingId.value, payload)
      : await createSeries(payload);
    if (res.isSuccess) {
      toast.addToast(editingId.value ? t('creator.columnUpdated') : t('creator.columnCreated'), 'success');
      showForm.value = false;
      await load();
    }
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  } finally {
    isSaving.value = false;
  }
}

// ---- 删除：window.confirm 二次确认后调 DELETE，成功后刷新列表 ----
async function remove(c: SeriesOwn) {
  const confirmed = window.confirm(t('creator.deleteColumnConfirm', { name: c.name }));
  if (!confirmed) return;
  try {
    const res = await deleteSeries(c.id);
    if (res.isSuccess) await load();
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  }
}

// Esc 关闭弹窗（同 ReviewReasonModal 惯例）
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showForm.value) closeForm();
}
onMounted(() => {
  load();
  document.addEventListener('keydown', handleKeydown);
});
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div class="columns-page">
    <div class="columns-toolbar">
      <button type="button" class="btn-new" @click="openCreate">
        ＋ {{ t('creator.newColumn') }}
      </button>
    </div>

    <div class="columns-card">
      <p v-if="isLoading" class="columns-empty">{{ t('common.loading') }}</p>
      <p v-else-if="columns.length === 0" class="columns-empty">{{ t('creator.emptyColumns') }}</p>
      <ul v-else class="columns-list">
        <li v-for="c in columns" :key="c.id" class="columns-item">
          <img v-if="c.coverUrl" :src="c.coverUrl" alt="" class="columns-item__cover" />
          <span v-else class="columns-item__cover columns-item__cover--placeholder" />
          <div class="columns-item__info">
            <div class="columns-item__name">{{ c.name }}</div>
            <div v-if="c.description" class="columns-item__desc">{{ c.description }}</div>
          </div>
          <span class="columns-item__count">{{ t('creator.columnArticlesCount', { count: c.articleCount }) }}</span>
          <div class="columns-item__actions">
            <button type="button" class="action-btn action-btn--edit" @click="openEdit(c)">
              {{ t('creator.edit') }}
            </button>
            <button type="button" class="action-btn action-btn--delete" @click="remove(c)">
              {{ t('creator.delete') }}
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showForm" class="column-form-overlay" @click.self="closeForm">
        <div
          class="column-form"
          role="dialog"
          aria-modal="true"
          :aria-label="editingId ? t('creator.editColumn') : t('creator.newColumn')"
        >
          <div class="column-form__header">
            <h3 class="column-form__title">
              {{ editingId ? t('creator.editColumn') : t('creator.newColumn') }}
            </h3>
            <button type="button" class="column-form__close" :disabled="isSaving" @click="closeForm">✕</button>
          </div>

          <div class="column-form__body">
            <div class="column-form__field">
              <label class="column-form__label" for="column-name">
                {{ t('creator.columnName') }} <em class="column-form__required">*</em>
              </label>
              <input
                id="column-name"
                v-model="form.name"
                type="text"
                class="column-form__input"
                :placeholder="t('creator.columnNamePlaceholder')"
              />
            </div>
            <div class="column-form__field">
              <label class="column-form__label" for="column-desc">{{ t('creator.columnDescription') }}</label>
              <textarea
                id="column-desc"
                v-model="form.description"
                rows="3"
                class="column-form__input"
                :placeholder="t('creator.columnDescriptionPlaceholder')"
              ></textarea>
            </div>
            <div class="column-form__field">
              <label class="column-form__label" for="column-cover">{{ t('creator.columnCover') }}</label>
              <input
                id="column-cover"
                v-model="form.coverUrl"
                type="text"
                class="column-form__input"
                :placeholder="t('creator.columnCoverPlaceholder')"
              />
            </div>
          </div>

          <div class="column-form__footer">
            <button type="button" class="column-form__btn column-form__btn--cancel" :disabled="isSaving" @click="closeForm">
              {{ t('creator.cancel') }}
            </button>
            <button type="button" class="column-form__btn column-form__btn--confirm" :disabled="isSaving" @click="save">
              <span v-if="isSaving" class="spinner"></span>
              {{ t('creator.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.columns-page {
  min-width: 0;
}

.columns-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.btn-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: $color-accent-primary;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.columns-card {
  background: $color-card-bg;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  overflow: hidden;
}

.columns-empty {
  margin: 0;
  padding: 48px 16px;
  text-align: center;
  color: $color-text-tertiary;
  font-size: 0.95rem;
}

.columns-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.columns-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid $color-border;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: $color-bg-secondary;
  }
}

.columns-item__cover {
  width: 64px;
  height: 40px;
  border-radius: $radius-sm;
  object-fit: cover;
  flex-shrink: 0;

  &--placeholder {
    background: $color-bg-secondary;
    border: 1px solid $color-border;
    display: inline-block;
  }
}

.columns-item__info {
  flex: 1;
  min-width: 0;
}

.columns-item__name {
  font-weight: 600;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.columns-item__desc {
  margin-top: 2px;
  font-size: 0.85rem;
  color: $color-text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.columns-item__count {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: $color-text-secondary;
  background: rgba($color-text-secondary, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.columns-item__actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: $radius-sm;
  font-size: 0.8rem;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
  font-family: inherit;

  &--edit {
    color: $color-accent-primary;
    border-color: $color-accent-primary;

    &:hover {
      background: $color-accent-primary;
      color: #fff;
    }
  }

  &--delete {
    color: #ef4444;
    border-color: #ef4444;

    &:hover {
      background: #ef4444;
      color: #fff;
    }
  }
}

/* ---- 新建/编辑弹窗（同 ReviewReasonModal / 编辑器发布弹窗的视觉体系） ---- */
.column-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.column-form {
  background: $color-bg-primary;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 440px;
  box-shadow: $shadow-sm;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-secondary;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: $color-bg-secondary;
      color: $color-text-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__body {
    padding: 20px 24px 8px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-secondary;
  }

  &__required {
    color: #ef4444;
    font-style: normal;
  }

  &__input {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-secondary;
    color: $color-text-primary;
    font-family: inherit;
    font-size: 0.9rem;
    box-sizing: border-box;
    resize: vertical;
    transition: all 0.2s;

    &::placeholder {
      color: rgba($color-text-primary, 0.4);
    }

    &:focus {
      outline: none;
      border-color: $color-accent-primary;
      box-shadow: 0 0 0 2px rgba($color-accent-primary-rgb, 0.15);
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px 20px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 72px;
    padding: 8px 16px;
    border-radius: $radius-md;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
    font-family: inherit;

    &--cancel {
      background: transparent;
      color: $color-text-secondary;
      border-color: $color-border;

      &:hover {
        color: $color-text-primary;
        background: $color-bg-secondary;
      }
    }

    &--confirm {
      background: $color-accent-primary;
      color: #fff;

      &:hover {
        opacity: 0.9;
      }
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Mobile
@media (max-width: 768px) {
  .columns-item {
    flex-wrap: wrap;
    gap: 10px;
  }

  .columns-item__info {
    flex: 1;
    min-width: calc(100% - 90px);
  }

  .columns-item__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
