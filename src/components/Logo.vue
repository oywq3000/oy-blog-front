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
      <path d="M6 8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8V24C18 26.2091 16.2091 28 14 28H10C7.79086 28 6 26.2091 6 24V8Z" fill="url(#logo_gradient_match)" />
      <path d="M10 8C8.89543 8 8 8.89543 8 10V22C8 23.1046 8.89543 24 10 24H14C15.1046 24 16 23.1046 16 22V10C16 8.89543 15.1046 8 14 8H10Z" fill="white" />
      <!-- Accent Dot (Cyan) -->
      <!-- <circle cx="34" cy="8" r="2" fill="#00f2ff" /> -->
    </g>
  </svg>
</template>
