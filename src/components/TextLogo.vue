<script setup lang="ts">
const props = withDefaults(defineProps<{
  width?: number | string;
  height?: number | string;
  variant?: 'light' | 'dark';
  idSuffix?: string;
}>(), {
  width: 200,
  height: 40,
  variant: 'light',
  idSuffix: 'main'
});

</script>

<template>
  <svg width="120" height="24" viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>
  </defs>
  
  <text x="0" y="18" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" font-style="italic" fill="url(#textGradient)">OY</text>
  <text x="32" y="18" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" font-style="italic" fill="#1F2937">-BLOG</text>
</svg>
</template>

<style scoped>
.logo-text {
  font-family: 'Fira Code', monospace; /* Fallback if SVG fails to load */
}
</style>
