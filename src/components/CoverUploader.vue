<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { uploadSeriesCover } from '../api/upload';
import { useToast } from '../composables/useToast';

/**
 * 封面图本地上传控件（专栏封面用；交互与 ArticleEditor 发布弹窗封面一致）：
 * 点击 / 拖拽图片 → uploadSeriesCover（article-service /article/creator/series/cover）→ 回填 url。
 * - v-model 为封面 URL 字符串；已上传后展示预览，可再次点击更换
 * - ✕ 移除封面 → v-model 置 ''（配合编辑页 PUT 传 '' 即清空的语义）
 * - 上传中禁点（防重复上传）；失败/超限由请求拦截器统一顶部气泡提示
 */
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const { t } = useI18n();
const toast = useToast();

const isDragging = ref(false);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

async function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.addToast(t('coverUpload.invalidType'), 'warning');
    return;
  }
  if (isUploading.value) return;
  isUploading.value = true;
  try {
    const res = await uploadSeriesCover(file);
    if (res.isSuccess) emit('update:modelValue', res.data?.url ?? '');
  } catch {
    // 上传失败（网络/超限）已由拦截器统一顶部气泡提示
  } finally {
    isUploading.value = false;
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) void processFile(file);
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void processFile(file);
  // Reset input value to allow selecting the same file again
  input.value = '';
}

function openPicker() {
  if (!isUploading.value) fileInputRef.value?.click();
}

function remove() {
  if (isUploading.value) return;
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="cover-uploader">
    <div
      class="cover-drop"
      :class="{ dragging: isDragging, 'has-image': !!modelValue }"
      role="button"
      tabindex="0"
      :aria-label="modelValue ? t('coverUpload.change') : t('coverUpload.dragDrop')"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <img v-if="modelValue" :src="modelValue" alt="" class="cover-img" />
      <span
        v-if="modelValue && !isUploading"
        class="cover-remove"
        role="button"
        :title="t('coverUpload.remove')"
        :aria-label="t('coverUpload.remove')"
        @click.stop="remove"
      >✕</span>

      <div v-if="isUploading" class="cover-mask">
        <span class="cover-spinner"></span>
        {{ t('coverUpload.uploading') }}
      </div>
      <div v-else-if="!modelValue" class="cover-placeholder">
        <svg
          class="cover-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>{{ t('coverUpload.dragDrop') }}</span>
      </div>
    </div>
    <input ref="fileInputRef" type="file" accept="image/*" class="cover-file" @change="handleFileSelect" />
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.cover-uploader {
  min-width: 0;
}

.cover-file {
  display: none;
}

.cover-drop {
  position: relative;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  background: $color-bg-secondary;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-accent-primary;
  }

  &.dragging {
    border-color: $color-accent-primary;
    box-shadow: 0 0 0 2px rgba($color-accent-primary-rgb, 0.15);
  }

  &.has-image {
    border-style: solid;
    background: transparent;
  }
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
}

.cover-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba($color-bg-primary, 0.6);
  color: $color-text-primary;
  font-size: 0.85rem;
}

.cover-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba($color-text-primary, 0.25);
  border-radius: 50%;
  border-top-color: $color-text-primary;
  animation: cover-spin 0.8s linear infinite;
}

@keyframes cover-spin {
  to {
    transform: rotate(360deg);
  }
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  text-align: center;
  color: $color-text-secondary;
  font-size: 0.85rem;
}

.cover-icon {
  width: 26px;
  height: 26px;
  color: $color-text-tertiary;
}
</style>
