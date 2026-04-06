<script setup lang="ts">
import { computed } from 'vue';
import TechIcon from './icons/TechIcon.vue';

// TechBadge Component - Replaces shields.io images for better performance and no CLS
// Style: Flat Square (Label | Message)

const props = defineProps<{
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
}>();

const style = computed(() => {
  return {
    backgroundColor: `#${props.color}`
  };
});
</script>

<template>
  <div class="tech-badge">
    <div class="badge-label">
      <TechIcon v-if="logo" :name="logo" :size="12" class="badge-logo" :style="{ color: logoColor || 'white' }" />
      <span>{{ label }}</span>
    </div>
    <div class="badge-message" :style="style">
      {{ message }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tech-badge {
  display: inline-flex;
  align-items: stretch;
  height: 20px; /* Fixed height matching shields.io standard */
  font-family: Verdana, Geneva, "DejaVu Sans", sans-serif;
  font-size: 11px;
  text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3);
  color: #fff;
  border-radius: 3px; /* Slight radius like flat-square */
  overflow: hidden;
  line-height: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
  cursor: default;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  }

  .badge-label {
    background-color: #555;
    padding: 0 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 400;
  }

  .badge-message {
    padding: 0 6px;
    font-weight: 700;
  }
  
  .badge-logo {
    display: block;
  }
}
</style>