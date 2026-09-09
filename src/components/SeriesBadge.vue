<script setup lang="ts">
// 专栏无封面时的主题徽章（紫渐变 + 白描边书册图标）。
// 扁平风格、无阴影；首页专栏卡与专栏详情页头部共用，size 控制整体尺寸
defineProps<{ size?: number }>();
</script>

<template>
  <div
    class="series-badge"
    :style="{
      width: (size ?? 40) + 'px',
      height: (size ?? 40) + 'px',
      borderRadius: Math.round((size ?? 40) * 0.3) + 'px',
    }"
  >
    <svg
      :style="{
        width: (size ?? 40) * 0.5 + 'px',
        height: (size ?? 40) * 0.5 + 'px',
      }"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  </div>
</template>

<style lang="scss" scoped>
.series-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--color-accent-primary),
    var(--color-accent-secondary)
  );
}

svg {
  display: block;
}
</style>
