<script setup lang="ts">
/**
 * 头像裁剪对话框 —— 选图后的圆形取景步骤：
 * 拖动图片平移、滚轮 / 双指捏合缩放，确定后只把截出的正方形
 * 结果（大图压到 AVATAR_MAX_SIDE）交给父组件上传，原图不直接上传。
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useToast } from '../composables/useToast';
import { pickAvatarOutputSize } from '../utils/avatarFile';

const props = defineProps<{
  /** 待裁剪的本地图片；null 时不渲染 */
  file: File | null;
  /** 父组件正在上传裁剪结果（禁用确定/关闭，防重复提交） */
  uploading: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [cropped: File];
}>();

const { t } = useI18n();
const { addToast } = useToast();

const imgRef = ref<HTMLImageElement | null>(null);
const cropper = shallowRef<Cropper | null>(null);
const previewUrl = ref('');
const isReady = ref(false);

/** 缩放值相对初始贴合视口的比例（1 = 初始 contain 状态） */
const ZOOM_MAX = 4;
const zoomMin = ref(1); // 恰好盖满圆形视口的最小值，ready 后按图片比例计算
const zoomRatio = ref(1);
const sliderActive = ref(false);
const containerSize = ref(0); // 圆形视口边长（用于还原时居中）

const close = () => {
  if (!props.uploading) emit('cancel');
};

const initCropper = async (file: File) => {
  // 复用旧实例则销毁并回收旧 URL
  cropper.value?.destroy();
  cropper.value = null;
  isReady.value = false;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);

  previewUrl.value = URL.createObjectURL(file);
  await nextTick();

  const img = imgRef.value;
  if (!img) return;
  img.src = previewUrl.value;

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode-failed'));
    });
  } catch {
    addToast(t('profile.avatarDecodeFailed'), 'error');
    emit('cancel');
    return;
  }

  cropper.value = new Cropper(img, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    guides: false,
    center: false,
    highlight: false,
    modal: false,
    background: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    wheelZoomRatio: 0.08,
    // 初始化：先把图片放到正好盖满视口，再把裁剪框固定为整个视口。
    // 缩放值语义（cropperjs v1）：ratio = 渲染宽 / 自然宽，初始渲染为贴合视口
    ready: () => {
      const c = cropper.value;
      if (!c) return;
      const container = c.getContainerData();
      const image = c.getImageData();
      containerSize.value = container.width;
      // 恰好盖满正方形视口所需的最小缩放：宽、高各自补齐到容器尺寸
      const cover = Math.max(
        container.width / image.naturalWidth,
        container.height / image.naturalHeight
      );
      zoomMin.value = cover;
      c.zoomTo(cover * 1.15); // 默认放大一点点，拖拽留出余量
      c.setCropBoxData({ width: container.width, height: container.height, left: 0, top: 0 });
      isReady.value = true;
      zoomRatio.value = cover * 1.15;
    },
    // 事件可能来自滚轮/双指缩放/滑条：越界直接 cancel（zoomTo 会中止本次缩放）
    zoom: (event: CustomEvent<{ ratio: number }>) => {
      const ratio = event.detail.ratio;
      if (ratio < zoomMin.value - 1e-4 || ratio > ZOOM_MAX + 1e-4) {
        event.preventDefault();
        return;
      }
      if (!sliderActive.value) zoomRatio.value = ratio;
    },
  });
};

watch(
  () => props.file,
  (file) => {
    if (file) void initCropper(file);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  cropper.value?.destroy();
  cropper.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

const applyZoom = (target: number) => {
  if (!cropper.value) return;
  cropper.value.zoomTo(Math.min(ZOOM_MAX, Math.max(zoomMin.value, target)));
};

const stepZoom = (delta: number) => {
  sliderActive.value = false;
  applyZoom(zoomRatio.value + delta);
};

const resetView = () => {
  const c = cropper.value;
  if (!c || !containerSize.value) return;
  applyZoom(zoomMin.value * 1.15);
  // 图片放大后重新居中
  const d = c.getImageData();
  c.moveTo((containerSize.value - d.width) / 2, (containerSize.value - d.height) / 2);
  sliderActive.value = false;
};

const onSliderInput = () => applyZoom(zoomRatio.value);

const doConfirm = async () => {
  const c = cropper.value;
  if (!isReady.value || !c || props.uploading) return;
  try {
    // 以自然分辨率截取裁剪框区域，再统一降采样到 AVATAR_MAX_SIDE 以内
    const source = c.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });
    const side = pickAvatarOutputSize(source.width);
    if (!side) throw new Error('empty-crop');
    let output = source;
    if (side !== source.width) {
      output = document.createElement('canvas');
      output.width = side;
      output.height = side;
      const ctx = output.getContext('2d');
      if (!ctx) throw new Error('no-canvas-context');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, side, side);
    }
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('no-blob');
    emit('confirm', new File([blob], 'avatar.png', { type: 'image/png' }));
  } catch {
    addToast(t('profile.avatarDecodeFailed'), 'error');
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close();
};

onMounted(() => document.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div v-if="file" class="avatar-crop-overlay" @click.self="close">
      <div
        class="avatar-crop-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="t('profile.avatarCropTitle')"
      >
        <div class="avatar-crop-modal__header">
          <h3 class="avatar-crop-modal__title">{{ t('profile.avatarCropTitle') }}</h3>
          <button
            type="button"
            class="avatar-crop-modal__close"
            :disabled="uploading"
            :aria-label="t('profile.avatarCancel')"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="avatar-crop-modal__body">
          <div class="crop-viewport" :class="{ 'crop-viewport--ready': isReady }">
            <img ref="imgRef" alt="" class="crop-viewport__img" />
            <div v-if="!isReady" class="crop-viewport__loading">{{ t('common.loading') }}</div>
          </div>

          <div class="crop-zoom">
            <button
              type="button"
              class="crop-zoom__btn"
              :disabled="!isReady || zoomRatio <= zoomMin"
              :aria-label="t('profile.avatarZoomOut')"
              @click="stepZoom(-0.1)"
            >
              −
            </button>
            <input
              class="crop-zoom__slider"
              type="range"
              :min="zoomMin"
              :max="ZOOM_MAX"
              step="0.01"
              v-model.number="zoomRatio"
              :disabled="!isReady"
              @pointerdown="sliderActive = true"
              @pointerup="sliderActive = false"
              @change="sliderActive = false"
              @input="onSliderInput"
            />
            <button
              type="button"
              class="crop-zoom__btn"
              :disabled="!isReady || zoomRatio >= ZOOM_MAX"
              :aria-label="t('profile.avatarZoomIn')"
              @click="stepZoom(0.1)"
            >
              ＋
            </button>
            <button type="button" class="btn-link crop-zoom__reset" :disabled="!isReady" @click="resetView">
              {{ t('profile.avatarReset') }}
            </button>
          </div>

          <p class="avatar-crop-modal__hint">{{ t('profile.avatarCropHint') }}</p>
        </div>

        <div class="avatar-crop-modal__footer">
          <button type="button" class="btn-secondary" :disabled="uploading" @click="close">
            {{ t('profile.avatarCancel') }}
          </button>
          <button type="button" class="btn-primary" :disabled="!isReady || uploading" @click="doConfirm">
            {{ uploading ? t('profile.avatarUploading') : t('profile.avatarConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.avatar-crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.avatar-crop-modal {
  background: $color-bg-primary;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  max-height: calc(100vh - 48px);
  overflow-y: auto;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: $color-text-primary;
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: $color-text-secondary;
    font-size: 18px;
    cursor: pointer;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: $color-bg-secondary;
      color: $color-text-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__body {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 0 24px 20px;
  }

  &__hint {
    margin: -6px 0 0;
    font-size: 12px;
    color: $color-text-tertiary;
    text-align: center;
  }
}

/* 圆形取景视口：图片被裁到圆内，裁剪框本身不可见（固定盖满正方形视口） */
.crop-viewport {
  position: relative;
  width: min(78vw, 340px);
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  background: $color-bg-secondary;
  flex-shrink: 0;

  /* 圆环描边，让裁剪区域边界清晰 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.35);
    pointer-events: none;
  }

  /* cropperjs 生成的结构铺满视口，并把自带的方形裁剪框视觉全部隐藏 */
  :deep(.cropper-container),
  :deep(.cropper-wrap-box),
  :deep(.cropper-canvas),
  :deep(.cropper-crop-box),
  :deep(.cropper-drag-box) {
    width: 100%;
    height: 100%;
  }

  :deep(.cropper-view-box),
  :deep(.cropper-face) {
    background: none;
    outline: none;
  }

  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-text-secondary;
    font-size: 13px;
    background: $color-bg-secondary;
    border-radius: 50%;
  }
}

.crop-zoom {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 340px;

  &__btn {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: 1px solid $color-border;
    background: transparent;
    color: $color-text-secondary;
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: $color-bg-secondary;
      color: $color-text-primary;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__slider {
    flex: 1;
    min-width: 0;
    accent-color: $color-accent-primary;

    &:disabled {
      opacity: 0.4;
    }
  }

  &__reset {
    flex-shrink: 0;
    font-size: 13px;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: none;
    }
  }
}
</style>
