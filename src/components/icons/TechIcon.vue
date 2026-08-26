<script setup lang="ts">
import { computed } from 'vue';
import { resolveTechIcon, getBrandColor } from './techIcons';

const props = withDefaults(defineProps<{
  name: string;
  size?: number | string;
  color?: string;
}>(), {
  size: 16
});

const resolvedIcon = computed(() => resolveTechIcon(props.name));
</script>

<template>
  <component
    :is="resolvedIcon"
    class="tech-icon"
    :width="size"
    :height="size"
    :style="{ color: color ?? getBrandColor(name) }"
    aria-hidden="true"
  />
</template>

<style scoped>
.tech-icon {
  display: inline-block;
  vertical-align: middle;
  transition: transform 0.3s ease;
}
</style>
