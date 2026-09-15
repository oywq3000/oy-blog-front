<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { buildVditorOptions } from './vditorOptions';
import { buildImageInsertMarkdown } from '../utils/imageInsert';
import {
  CONTENT_IMAGE_POLICY,
  imageIssueMessageKey,
  prepareImageFiles,
} from '../utils/imageUpload';
import { uploadContentImage } from '../api/upload';
import { useToast } from '../composables/useToast';

const props = withDefaults(defineProps<{
  modelValue: string;
  theme: 'light' | 'dark';
  placeholder?: string;
}>(), {
  placeholder: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'html-changed', html: string): void;
}>();

const { t } = useI18n();
const { addToast } = useToast();
const editorEl = ref<HTMLElement | null>(null);
let vditor: Vditor | null = null;

/** 正文图上传:复用既有 imageUpload 前处理管线(1MB 上限降采样等),成功后插入图片 markdown */
const handleUpload = async (files: File[]) => {
  const prepared = await prepareImageFiles(files, CONTENT_IMAGE_POLICY);
  prepared.issues.forEach((issue) => addToast(t(imageIssueMessageKey(issue)), 'warning'));
  if (prepared.files.length === 0) return;
  const results = await Promise.all(prepared.files.map((file) => uploadContentImage(file)));
  const urls = results.filter((r) => r.isSuccess).map((r) => r.data);
  if (urls.length && vditor) {
    vditor.insertValue(`${buildImageInsertMarkdown(urls)}\n`);
  }
};

onMounted(() => {
  if (!editorEl.value) return;
  vditor = new Vditor(editorEl.value, buildVditorOptions({
    mode: 'ir',
    theme: props.theme === 'dark' ? 'dark' : 'classic',
    placeholder: props.placeholder,
    initialValue: props.modelValue,
    onInput: (value: string) => {
      emit('update:modelValue', value);
      if (vditor) emit('html-changed', vditor.getHTML());
    },
    onUpload: handleUpload,
  }));
});

// 外部回填(如编辑回显、AI 写稿):值不同才 setValue,避免与内部 input 回环
watch(() => props.modelValue, (val) => {
  if (vditor && val !== vditor.getValue()) {
    vditor.setValue(val);
  }
});

watch(() => props.theme, (next) => {
  vditor?.setTheme(next === 'dark' ? 'dark' : 'classic');
});

onBeforeUnmount(() => {
  vditor?.destroy();
  vditor = null;
});

/**
 * 编辑模式切换(ir 即时渲染 / sv 源码分屏),由父组件调用。
 *
 * 说明:vditor 4 的公开 API 里没有「切换编辑模式」的方法 —— 其 setPreviewMode 只接收
 * "editor" | "both",仅控制 sv 模式下的预览分屏,切不走 ir↔sv。真正的 ir/sv 切换由
 * 内部 setEditMode() 完成(工具栏 edit-mode 子菜单按钮的点击 handler 就调它);这里
 * 通过触发对应 `button[data-mode=...]` 复用同一套切换逻辑(vditor 自身的
 * highlightCurrentToolbar 也按这个选择器定位当前模式)。
 */
function setMode(mode: 'ir' | 'sv') {
  if (!vditor) return;
  const editModeEl = vditor.vditor.toolbar?.elements?.['edit-mode'];
  const button = editModeEl?.querySelector<HTMLButtonElement>(`button[data-mode="${mode}"]`);
  button?.click();
}
defineExpose({ setMode });
</script>

<template>
  <div ref="editorEl" class="markdown-live-editor"></div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/markdown' as *;

.markdown-live-editor {
  height: 100%;
  min-height: 0;

  // 透明底 + 无边框,沿用编辑器区的玻璃拟态观感
  :deep(.vditor),
  :deep(.vditor-toolbar) {
    border: none;
    background: transparent;
  }

  :deep(.vditor) {
    height: 100%;
  }

  // 内容排版复用全站 markdown 样式,保证与详情页渲染观感一致
  :deep(.vditor-content) {
    @include markdown-styles;
  }
}
</style>