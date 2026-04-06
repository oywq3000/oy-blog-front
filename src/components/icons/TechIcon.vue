<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  name: string;
  size?: number | string;
  color?: string;
}>(), {
  size: 16
});

// Simple hash function to generate a color from string if needed, 
// though we will mostly use specific brand colors
const getBrandColor = (name: string) => {
  if (props.color) return props.color;
  
  const n = name.toLowerCase();
  if (n.includes('java')) return '#f89820';
  if (n.includes('spring')) return '#6db33f';
  if (n.includes('vue')) return '#42b883';
  if (n.includes('typescript')) return '#3178c6';
  if (n.includes('docker')) return '#2496ed';
  if (n.includes('kubernetes')) return '#326ce5';
  if (n.includes('aws')) return '#ff9900';
  if (n.includes('redis')) return '#dc382d';
  if (n.includes('mysql')) return '#4479a1';
  if (n.includes('react')) return '#61dafb';
  return 'currentColor';
};

const iconPath = computed(() => {
  const n = props.name.toLowerCase();
  
  // Custom Icon Map
  const iconMap: Record<string, string> = {
    // Tech Stack
    'java': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    'openjdk': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    'spring': 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8l6 3v6.4l-6 3-6-3V7.8l6-3z',
    'springboot': 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8l6 3v6.4l-6 3-6-3V7.8l6-3z',
    'vue': 'M12 22L2 4h3.2l6.8 12.4L18.8 4H22L12 22zm0-5l-3.4-6H15.4L12 17z',
    'vuedotjs': 'M12 22L2 4h3.2l6.8 12.4L18.8 4H22L12 22zm0-5l-3.4-6H15.4L12 17z',
    'typescript': 'M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm10 13.5h-2v-7h-2.5V6h7v2.5H14v7zm-5 0H7v-2.5h2v-2H7V6h4v2.5H9v2h2v3z',
    'docker': 'M2.5 11.5v5h19v-5h-19zm2 2h2v1h-2v-1zm4 0h2v1h-2v-1zm4 0h2v1h-2v-1zm-6-3h2v1h-2v-1zm4 0h2v1h-2v-1zm4 0h2v1h-2v-1zm-8-3h2v1h-2v-1zm4 0h2v1h-2v-1z',
    'kubernetes': 'M12 2l8.5 5v10L12 22 3.5 17V7L12 2zm0 2.5L5.8 8v8l6.2 3.5 6.2-3.5V8L12 4.5z',
    'aws': 'M12 16.5c-2.3 0-4.3-.8-5.8-2.2l1.4-1.4c1.1 1 2.6 1.6 4.4 1.6 2.4 0 3.8-1.2 3.8-3s-1.4-3-3.8-3c-1.5 0-2.8.5-3.7 1.4l-1.3-1.4C8.2 7.3 10 6.5 12 6.5c3.6 0 6.2 2 6.2 5s-2.6 5-6.2 5z',
    'redis': 'M4 4h16v16H4V4zm2 2v3h12V6H6zm0 5v7h12v-7H6z',
    'mysql': 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 16c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm-2-6h4v2h-4v-2z',
    'vite': 'M16.5 2l-1.5 8h4.5l-9 12 1.5-8h-4.5z',
    'sass': 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm-4.7 18.2c-1.6 0-2.8-.8-3.4-2.1-.2-.4.3-.8.7-.6.5.3 1.2.8 2.5.8 1.2 0 2.2-.6 2.2-1.6 0-.8-.5-1.3-1.8-1.7-1.7-.5-3.1-1.3-3.1-3.2 0-1.8 1.4-3.1 3.5-3.1 1.4 0 2.4.6 2.9 1.6.2.4-.3.8-.7.6-.5-.3-1.1-.6-2.1-.6-1.1 0-1.9.6-1.9 1.5 0 .7.5 1.2 1.6 1.6 1.8.6 3.2 1.4 3.2 3.3 0 1.9-1.5 3.1-3.6 3.1z',
    'pinia': 'M15 13.5l-3 3-3-3 3-3 3 3z',
    'mybatis': 'M3.1 2h17.8C21.5 2 22 2.5 22 3.1v17.8c0 .6-.5 1.1-1.1 1.1H3.1C2.5 22 2 21.5 2 20.9V3.1C2 2.5 2.5 2 3.1 2zm8.9 7.6l-5 5-2.5-2.5 1.4-1.4 1.1 1.1 3.6-3.6 1.4 1.4z',
    'elasticsearch': 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z',
    'swagger': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    'springdoc': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    
    // UI Icons (MDI)
    'monitor-dashboard': 'M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2M21,16H3V4H21V16M13,10H19V14H13V10M13,6H19V8H13V6M5,6H11V14H5V6Z',
    'server': 'M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21Z',
    'database': 'M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M18.5,10H19V12C19,14.21 15.42,16 11,16C6.58,16 3,14.21 3,12V10H3.5C3.5,12.21 7.08,14 11.5,14C15.92,14 19.5,12.21 19.5,10M18.5,15H19V17C19,19.21 15.42,21 11,21C6.58,21 3,19.21 3,17V15H3.5C3.5,17.21 7.08,19 11.5,19C15.92,19 19.5,17.21 19.5,15Z',
    'book-open-page-variant': 'M19,2L14,6.5V17.5L19,13.5V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.3,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,5.9 21.75,5.55 21,5.25V17.5C19.9,17.15 18.7,17 17.5,17C15.3,17 13.35,17.65 12,18.5V5.2C10.55,4.4 8.45,4 6.5,4C4.55,4 2.45,4.4 1,5.5V6.5C2.45,5.4 4.55,5 6.5,5Z',
    'responsive': 'M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z',
    'magnify': 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z',
    'account-group': 'M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z',
    'sitemap': 'M9,2V8H11V11H5C3.89,11 3,11.89 3,13V16H1V22H7V16H5V13H11V16H9V22H15V16H13V13H19C20.11,13 21,11.89 21,11V8H23V2H17V8H19V11H13V8H15V2H9Z',
    'information-variant': 'M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
    'sparkles': 'M10,1C10,5.97 14.03,10 19,10C14.03,10 10,14.03 10,19C10,14.03 5.97,10 1,10C5.97,10 10,5.97 10,1M19,13C19,15.21 20.79,17 23,17C20.79,17 19,18.79 19,21C19,18.79 17.21,17 15,17C17.21,17 19,15.21 19,13Z'
  };

  // Check map first
  for (const key in iconMap) {
    if (n.includes(key)) return iconMap[key];
  }
  
  // Default / Fallback (Hash/Tag icon)
  return 'M12 2L2 7l10 5 10-5-10-5zm0 9l2-1-2-1-2 1 2 1zm0 2l-5-2.5-5 2.5L12 22l10-9-5-2.5-5 2.5z'; 
});

// Use specific SVG paths for better logos
const isCustomSvg = computed(() => {
  return true; // Always true now as we have paths for everything or fallback
});
</script>

<template>
  <svg 
    :width="size" 
    :height="size" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    class="tech-icon"
    :style="{ color: getBrandColor(name) }"
  >
    <template v-if="isCustomSvg">
       <path :d="iconPath" fill="currentColor" />
    </template>
    <template v-else>
      <!-- Default Tag Icon -->
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </template>
  </svg>
</template>

<style scoped>
.tech-icon {
  display: inline-block;
  vertical-align: middle;
  transition: transform 0.3s ease;
}
</style>
