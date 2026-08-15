<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTheme } from '../composables/useTheme';

const props = withDefaults(defineProps<{
  width?: number | string;
  height?: number | string;
  delay?: number;
}>(), {
  width: 240,
  height: 40,
  delay: 0
});

const { theme } = useTheme();
const isAnimating = ref(false);

const gradientId = 'text_gradient_animated';
const glowId = 'text_glow_animated';
const gradientUrl = `url(#${gradientId})`;
const glowUrl = `url(#${glowId})`;

onMounted(() => {
  setTimeout(() => {
    isAnimating.value = true;
  }, props.delay);
});
</script>

<template>
  <div class="animated-text-logo" :class="{ 'is-animating': isAnimating }">
    <svg :width="width" :height="height" viewBox="0 0 211 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="OY BLOG">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="211" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#00f2ff" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#bd00ff" />
        </linearGradient>
        
        <filter :id="glowId" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g class="logo-text">
        <!-- "OY" -->
        <path class="letter-path" d="M10 20C10 13 15.5 10 23 10C30.5 10 36 13 36 20C36 27 30.5 30 23 30C15.5 30 10 27 10 20ZM14 20C14 24.2 17.6 27 23 27C28.4 27 32 24.2 32 20C32 15.8 28.4 13 23 13C17.6 13 14 15.8 14 20Z" :stroke="gradientUrl" stroke-width="1.5" :fill="gradientUrl" />
        <path class="letter-path" d="M42 10L54.5 18.5V30H59.5V18.5L72 10L67 10L57 18.5L47 10Z" :stroke="gradientUrl" stroke-width="1.5" :fill="gradientUrl" />

        <!-- Separator Dot -->
        <circle class="dot-path" cx="86" cy="25" r="2" fill="#00f2ff" :filter="glowUrl" />

        <!-- "Blog" -->
        <g class="blog-text" :fill="theme === 'dark' ? '#ffffff' : '#2c3e50'" stroke="currentColor" stroke-width="1">
           <path class="letter-path-secondary" d="M96 10V30H104C107.5 30 110 28 110 25C110 22.5 108.5 21 106 20.5C108 20 109 18.5 109 16.5C109 13 106.5 10 103 10H96ZM99 13H103C105 13 106 14 106 16C106 18 105 19 103 19H99V13ZM99 21H104C106 21 107 22.5 107 25C107 27.5 106 28 103 28H99V21Z" />
           <path class="letter-path-secondary" d="M114 10V30H124V27H117V10H114Z" />
           <path class="letter-path-secondary" d="M128 20C128 14.5 132.5 10 138 10C143.5 10 148 14.5 148 20C148 25.5 143.5 30 138 30C132.5 30 128 25.5 128 20ZM131 20C131 23.8 134.2 27 138 27C141.8 27 145 23.8 145 20C145 16.2 141.8 13 138 13C134.2 13 131 16.2 131 20Z" />
           <path class="letter-path-secondary" d="M152 20C152 14.5 156.5 10 162 10H168V13H162C158.5 13 156 15.5 156 19V20H164V30H161V23H156V24C156 27.5 158.5 30 162 30H165C166.5 30 167.5 29 168 27.5V22H171V28C170 30.5 167.5 33 164 33H161C155.5 33 152 28.5 152 24V20Z" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.animated-text-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
}

.letter-path {
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  fill-opacity: 0;
  transition: all 0.5s ease;
}

.letter-path-secondary {
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  fill-opacity: 0;
  stroke: var(--color-text-primary);
  fill: var(--color-text-primary);
  transition: all 0.5s ease;
}

.dot-path {
  opacity: 0;
  transform: scale(0);
  transform-origin: center;
}

.is-animating {
  .letter-path {
    animation: draw 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards,
               fillFade 0.8s ease-out forwards 1.2s;
  }

  .letter-path-secondary {
    animation: draw 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.5s,
               fillFadeSecondary 0.8s ease-out forwards 1.7s;
  }

  .dot-path {
    animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 1.0s;
  }
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

@keyframes fillFade {
  to { fill-opacity: 1; stroke-width: 0; }
}

@keyframes fillFadeSecondary {
  to { fill-opacity: 1; stroke-width: 0; }
}

@keyframes popIn {
  to { opacity: 1; transform: scale(1); }
}
</style>
