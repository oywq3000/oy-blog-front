<script setup lang="ts">
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';
import { useTheme } from '../composables/useTheme';

defineProps<{
  content: string;
  codeTheme?: string;
}>();

const { theme } = useTheme();
</script>

<template>
  <div class="markdown-viewer">
    <MdPreview 
      :modelValue="content" 
      :theme="theme === 'dark' ? 'dark' : 'light'"
      preview-theme="github" 
      :code-theme="codeTheme || (theme === 'dark' ? 'atom' : 'github')"
      :no-katex="true"
      :no-mermaid="true"
      :no-img-zoom-in="true"
      class="md-preview-custom"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/markdown' as *;
@use '../styles/variables' as *;

.markdown-viewer {
  @include markdown-styles;
}
</style>
