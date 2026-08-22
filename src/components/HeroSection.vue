<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { GITHUB_URL } from '../config/site';

/** 统计条数据；null = 数据加载中（展示骨架） */
const props = defineProps<{
  stats: { articleCount: number; views: number; likes: number; tags: number } | null;
}>();

const { t, locale } = useI18n();
const router = useRouter();

// ---- 打字标语 ----
const typedText = ref('');
const typingSpeed = 80;
let timer: ReturnType<typeof setInterval> | null = null;

const isReducedMotion = () =>
  document.documentElement.classList.contains('reduce-motion');

const typeText = () => {
  if (timer) clearInterval(timer);
  const slogan = t('hero.slogan');
  // 减弱动态时直接展示完整标语，不启动打字动画
  if (isReducedMotion()) {
    typedText.value = slogan;
    return;
  }
  typedText.value = '';
  let i = 0;
  timer = setInterval(() => {
    i++;
    typedText.value = slogan.slice(0, i);
    if (i >= slogan.length && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, typingSpeed);
};

watch(locale, () => typeText());

// ---- 搜索 ----
const searchQuery = ref('');
const submitSearch = () => {
  const q = searchQuery.value.trim();
  router.push({ name: 'search', query: q ? { q } : {} });
};

// ---- CTA：平滑滚动到文章区 ----
const scrollToArticles = () => {
  document.getElementById('articles-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ---- 统计条 ----
const statItems = computed(() => {
  if (!props.stats) return [];
  return [
    { key: 'articles', value: props.stats.articleCount, label: t('home.stats.articles') },
    { key: 'views', value: props.stats.views, label: t('home.stats.views') },
    { key: 'likes', value: props.stats.likes, label: t('home.stats.likes') },
    { key: 'tags', value: props.stats.tags, label: t('home.stats.tags') },
  ];
});

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// ---- 入场动画（与全局 .fade-in-up 独立，避免被 HomeView 的 IntersectionObserver 抢先触发）----
onMounted(() => {
  typeText();
  const els = Array.from(document.querySelectorAll<HTMLElement>('.hero-anim'));
  if (isReducedMotion()) {
    els.forEach((el) => el.classList.add('visible'));
  } else {
    els.forEach((el, i) => setTimeout(() => el.classList.add('visible'), 150 + i * 120));
  }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <section class="hero">
    <!-- 背景光球 + 网格（纯装饰） -->
    <div class="hero__bg" aria-hidden="true">
      <span class="hero__orb hero__orb--one"></span>
      <span class="hero__orb hero__orb--two"></span>
      <span class="hero__grid"></span>
    </div>

    <div class="container hero__content">
      <span class="hero__badge hero-anim stagger-delay-1">{{ t('home.tag') }}</span>

      <h1 class="hero__title hero-anim stagger-delay-1">
        <span class="text-gradient">{{ t('home.title') }}</span>
      </h1>

      <p class="hero__slogan hero-anim stagger-delay-2" :aria-label="t('hero.slogan')">
        {{ typedText }}<span class="hero__cursor" aria-hidden="true"></span>
      </p>

      <form class="hero__search hero-anim stagger-delay-2" role="search" @submit.prevent="submitSearch">
        <svg class="hero__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          class="hero__search-input"
          :placeholder="t('common.searchPlaceholder')"
          :aria-label="t('common.search')"
        />
        <button type="submit" class="btn-primary hero__search-btn">{{ t('common.search') }}</button>
      </form>

      <div class="hero__actions hero-anim stagger-delay-3">
        <button class="btn-primary hero__cta" type="button" @click="scrollToArticles">{{ t('hero.cta') }}</button>
        <a class="btn-secondary hero__cta" :href="GITHUB_URL" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </div>
    </div>

    <!-- 底部统计条：加载中显示骨架 -->
    <div class="hero__stats">
      <div v-if="stats" class="hero__stats-grid">
        <div v-for="s in statItems" :key="s.key" class="hero__stat">
          <span class="hero__stat-value">{{ formatCount(s.value) }}</span>
          <span class="hero__stat-label">{{ s.label }}</span>
        </div>
      </div>
      <div v-else class="hero__stats-grid" aria-hidden="true">
        <div v-for="i in 4" :key="i" class="hero__stat-skeleton"></div>
      </div>
    </div>

    <div class="hero__scroll-indicator hero-anim" aria-hidden="true">
      <div class="hero__mouse"><div class="hero__mouse-wheel"></div></div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh; // 移动端地址栏伸缩适配
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding-top: 72px; // NavBar 高度偏移

  // 矮视口（横屏/小屏）：改为内容自适应，避免与底部统计条重叠
  @media (max-height: 700px) {
    min-height: auto;
    padding: 96px 0 150px;
  }
}

// ---- 入场动画（与全局 .fade-in-up 独立：HomeView 的观察器不会抢跑）----
.hero-anim {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);

  &.visible {
    opacity: 1;
    transform: none;
  }
}

// ---- 背景装饰 ----
.hero__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero__orb {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--color-accent-primary-rgb), 0.22), transparent 70%);
  filter: blur(60px);

  &--one {
    top: -160px;
    left: -120px;
  }

  &--two {
    bottom: -180px;
    right: -140px;
    background: radial-gradient(circle, rgba(var(--color-accent-secondary-rgb), 0.18), transparent 70%);
  }
}

.hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--color-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.35;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 75%);
}

// ---- 内容 ----
.hero__content {
  position: relative;
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero__badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(var(--color-accent-primary-rgb), 0.1);
  border: 1px solid var(--color-accent-primary);
  border-radius: $radius-full;
  color: var(--color-accent-primary);
  font-size: 0.8rem;
  margin-bottom: $spacing-lg;
  letter-spacing: 1px;
  font-family: $font-family-code;
}

.hero__title {
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  font-weight: 900;
  margin: 0 0 $spacing-md;
  line-height: 1.1;
  letter-spacing: -2px;
  filter: drop-shadow(0 0 24px rgba(var(--color-accent-primary-rgb), 0.25));
}

.hero__slogan {
  font-size: 1.2rem;
  color: $color-text-secondary;
  margin: 0 0 $spacing-lg;
  min-height: 1.8em;
  font-weight: 500;
}

.hero__cursor {
  display: inline-block;
  width: 6px;
  height: 0.9em;
  background: $gradient-primary;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
  margin-inline-start: 8px;
  border-radius: 2px;
}

// ---- 搜索 ----
.hero__search {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  width: 100%;
  max-width: 560px;
  padding: 6px 6px 6px $spacing-md;
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border);
  border-radius: $radius-full;
  transition: $transition-base;

  &:focus-within {
    border-color: $color-accent-primary;
    box-shadow: 0 0 0 3px $color-input-focus-ring;
  }

  @media (max-width: $breakpoint-mobile) {
    padding-inline-start: $spacing-sm;
  }
}

.hero__search-icon {
  width: 20px;
  height: 20px;
  color: $color-text-secondary;
  flex-shrink: 0;
}

.hero__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-input-text);
  font-size: 1rem;
  padding: 0.5rem 0;
  outline: none;

  &::placeholder {
    color: var(--color-input-placeholder);
  }
}

.hero__search-btn {
  flex-shrink: 0;
  border-radius: $radius-full;
  padding: 0.5rem 1.25rem;

  @media (max-width: $breakpoint-mobile) {
    padding: 0.5rem 1rem;
  }
}

// ---- CTA ----
.hero__actions {
  display: flex;
  gap: $spacing-md;
  margin-top: $spacing-lg;

  .hero__cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0.65rem 1.75rem;
    border-radius: $radius-full;
    text-decoration: none;
    font-size: 1rem;
  }

  @media (max-width: $breakpoint-mobile) {
    flex-wrap: wrap;
    justify-content: center;
  }
}

// ---- 统计条 ----
.hero__stats {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--color-border);
}

.hero__stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  max-width: 1400px;
  margin: 0 auto;
  padding: $spacing-md $spacing-lg;

  @media (max-width: $breakpoint-mobile) {
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-sm;
  }
}

.hero__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hero__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-text-primary;
  font-variant-numeric: tabular-nums;
}

.hero__stat-label {
  font-size: 0.8rem;
  color: $color-text-secondary;
  letter-spacing: 0.5px;
}

.hero__stat-skeleton {
  width: 64px;
  height: 14px;
  margin: 0 auto;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.08);
  animation: pulse 1.5s infinite ease-in-out;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.08);
  }
}

// ---- 滚动指示器 ----
.hero__scroll-indicator {
  position: absolute;
  bottom: 108px; // 统计条上方
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.6;
  animation: float 2s ease-in-out infinite;

  // 小屏：统计条变 2×2 变高，隐藏装饰性指示器
  @media (max-width: $breakpoint-mobile) {
    display: none;
  }
}

.hero__mouse {
  width: 26px;
  height: 40px;
  border: 2px solid $color-text-secondary;
  border-radius: 13px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    background-color: $color-text-secondary;
    border-radius: 50%;
    animation: scrollWheel 1.5s infinite;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes float {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, 10px); }
}

@keyframes scrollWheel {
  0% { opacity: 1; top: 8px; }
  100% { opacity: 0; top: 20px; }
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}
</style>
