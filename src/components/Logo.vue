<script setup lang="ts">
withDefaults(defineProps<{
  width?: number | string;
  height?: number | string;
}>(), {
  width: 40,
  height: 40
});
</script>

<template>
  <svg :width="width" :height="height" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rookie Blog Logo" shape-rendering="geometricPrecision">
    <defs>
      <!-- Tech Gradient matching the text logo -->
      <linearGradient id="logo_gradient_match" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#00f2ff" />
        <stop offset="100%" stop-color="#bd00ff" />
      </linearGradient>
      
      <!-- Subtle Glow - Optimized -->
      <!-- Reduced blur deviation for performance -->
      <filter id="logo_glow_match" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="0.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Main Shape: Abstract 'R' Monogram constructed from geometric cuts -->
    <!-- Removed filter from group to avoid re-calculating for all children, applied selectively if needed or keep but optimized -->
    <!-- Applying filter to the group is actually efficient if we want the whole thing to glow. -->
    <g filter="url(#logo_glow_match)" style="will-change: transform;">
      <!-- Combined paths where possible or simplified -->
      <path d="M8 8H14L12 32H8V8ZM14 8H24C28 8 32 11 32 16C32 20 29 22 26 23H20V18H24C26 18 27 17 27 16C27 15 26 14 24 14H18V23H14V8ZM22 23H27L32 32H27L22 23Z" fill="url(#logo_gradient_match)" />
      
      <!-- Accent Dot (Cyan) -->
      <circle cx="34" cy="8" r="2" fill="#00f2ff" />
    </g>
  </svg>
</template>
