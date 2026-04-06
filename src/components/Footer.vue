<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import FooterLogo from './FooterLogo.vue';
import IconButton from './IconButton.vue';

const { t } = useI18n();

const footerNav = {
  resources: [
    { key: 'footer.community', url: 'https://github.com/patton174/Rookie-Blog', external: true }, // Placeholder
    { key: 'footer.helpCenter', url: '/about', external: false } // Placeholder to About
  ],
  legal: [
    { label: 'Privacy', url: '/privacy', external: false },
    { label: 'Terms', url: '/terms', external: false },
    { label: 'Security', url: '/security', external: false }
  ]
};

const socials = [
  { name: 'GitHub', icon: 'GH', url: 'https://github.com/patton174/Rookie-Blog' },
  { name: 'Twitter', icon: 'TW', url: 'https://twitter.com' },
  { name: 'LinkedIn', icon: 'LI', url: 'https://linkedin.com' }
];
</script>

<template>
  <footer class="footer">
    <!-- Background Overlay -->
    <div class="footer__bg-overlay"></div>

    <div class="container footer__container">
      
      <!-- Top Section: Brand & Main Info -->
      <div class="footer__top">
        <div class="footer__brand-col">
          <FooterLogo variant="horizontal" class="footer__logo-component" />
          <p class="footer__desc">
            {{ t('footer.desc') }}
          </p>
          
          <!-- Social Links -->
          <div class="footer__socials">
            <a 
              v-for="social in socials" 
              :key="social.name" 
              :href="social.url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="social-btn"
              :aria-label="social.name"
            >
              <IconButton size="sm" variant="ghost" as="span">
                <template #icon>{{ social.icon }}</template>
              </IconButton>
            </a>
          </div>
        </div>

        <!-- Links Grid -->
        <div class="footer__nav-grid">
          <!-- Removed unused columns as requested for blog project -->
          
          <div class="nav-col">
            <h4 class="nav-title">{{ t('footer.resources') }}</h4>
            <ul>
              <li v-for="item in footerNav.resources" :key="item.key">
                <a 
                  v-if="item.external" 
                  :href="item.url" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="nav-link"
                >
                  {{ t(item.key) }}
                </a>
                <router-link 
                  v-else 
                  :to="item.url" 
                  class="nav-link"
                >
                  {{ t(item.key) }}
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Middle Section: Stats & Testimonials (Removed as requested) -->
      <!-- 
      <div class="footer__middle">
        <div class="stats-row">
          <div v-for="stat in stats" :key="stat.label" class="stat-card">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
        
        <div class="testimonial-card">
          <p class="quote">"{{ testimonials[0].quote }}"</p>
          <div class="author-info">
            <span class="author-name">{{ testimonials[0].author }}</span>
            <span class="author-role">{{ testimonials[0].role }}</span>
          </div>
        </div>
      </div>
      -->

      <!-- Divider -->
      <div class="footer__divider"></div>

      <!-- Bottom Section: Copyright & Utility -->
      <div class="footer__bottom">
        <p class="copyright">{{ t('footer.rights') }}</p>
        
        <div class="footer__utility">
          <div class="footer__links">
            <template v-for="item in footerNav.legal" :key="item.label">
              <a 
                v-if="item.external" 
                :href="item.url" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {{ item.label }}
              </a>
              <router-link v-else :to="item.url">{{ item.label }}</router-link>
            </template>
          </div>
          
          <!-- Language Switcher Placeholder (Removed as requested) -->
          <!-- 
          <button class="lang-switch">
            <span class="icon">🌐</span> English
          </button>
          -->
        </div>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use 'sass:color';
@use '../styles/variables' as *;

.footer {
  position: relative;
  background-color: $color-footer-bg;
  color: $color-footer-text;
  padding: 80px 0 40px;
  margin-top: 80px;
  overflow: hidden;
  font-family: 'Helvetica Neue', 'Inter', sans-serif;
  transition: background-color 0.3s, color 0.3s;

  // Glassmorphism Background
  &__bg-overlay {
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    width: 100%;
    height: 100%;
    background: $color-footer-overlay; // Fallback / Overlay
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 0;
    pointer-events: none;
    transition: background 0.3s;
    
    // Disable heavy effects on mobile
    @media (max-width: $breakpoint-mobile) {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: var(--color-bg-primary); // Use variable for theme awareness
      border-top: 1px solid var(--color-border);
    }
    
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      inset-inline-start: -20%;
      width: 80%;
      height: 80%;
      background: radial-gradient(circle, rgba($color-accent-primary, 0.05) 0%, transparent 70%);
      pointer-events: none;
      
      // Simplify gradient on mobile
      @media (max-width: $breakpoint-mobile) {
        display: none;
      }
    }
  }

  &__container {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 60px;
  }

  /* --- TOP SECTION --- */
  &__top {
    display: grid;
    grid-template-columns: 4fr 8fr;
    gap: 60px;

    @media (max-width: $breakpoint-tablet) {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }

  &__brand-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__desc {
    font-size: 16px;
    line-height: 1.6;
    max-width: 320px;
    color: $color-text-tertiary;
  }

  &__socials {
    display: flex;
    gap: 12px;
    
    .social-btn {
      text-decoration: none;
      color: inherit;
      display: inline-flex;
    }
  }

  &__nav-grid {
    display: flex;
    justify-content: flex-end;
    gap: 30px;

    @media (max-width: $breakpoint-mobile) {
      justify-content: flex-start;
    }
  }

  .nav-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .nav-title {
    color: $color-footer-heading;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
  }

  .nav-link {
    color: $color-footer-text;
    font-size: 15px;
    text-decoration: none;
    transition: color 0.2s ease, transform 0.2s ease;
    display: inline-block;

    &:hover {
      color: $color-accent-primary;
      transform: translateX(4px);
    }
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* --- MIDDLE SECTION --- */
  &__middle {
    display: grid;
    grid-template-columns: 7fr 5fr;
    gap: 40px;
    align-items: center;
    padding: 40px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    border: 1px solid $color-footer-border;

    @media (max-width: $breakpoint-tablet) {
      grid-template-columns: 1fr;
      padding: 24px;
    }
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;

    @media (max-width: $breakpoint-mobile) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    color: $color-accent-primary;
    font-size: 24px;
    font-weight: 700;
    font-family: 'Fira Code', monospace;
  }

  .stat-label {
    font-size: 13px;
    color: $color-footer-text;
  }

  .testimonial-card {
    border-inline-start: 2px solid $color-accent-secondary;
    padding-inline-start: 20px;
    
    .quote {
      font-size: 16px;
      font-style: italic;
      color: $color-footer-heading;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .author-info {
      display: flex;
      flex-direction: column;
      font-size: 13px;
      
      .author-name { color: $color-footer-heading; font-weight: 600; }
      .author-role { color: $color-footer-text; }
    }
  }

  /* --- BOTTOM SECTION --- */
  &__divider {
    height: 1px;
    background: linear-gradient(
      90deg, 
      transparent, 
      $color-footer-border, 
      transparent
    );
    width: 100%;
    opacity: 0.5;
  }

  &__bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;

    @media (max-width: $breakpoint-mobile) {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }
  }

  &__utility {
    display: flex;
    align-items: center;
    gap: 30px;

    @media (max-width: $breakpoint-mobile) {
      flex-direction: column;
      gap: 16px;
    }
  }

  &__links {
    display: flex;
    gap: 24px;

    a {
      color: $color-footer-text;
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        color: $color-footer-heading;
      }
    }
  }

  .lang-switch {
    background: transparent;
    border: 1px solid $color-footer-border;
    color: $color-footer-text;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;

    &:hover {
      border-color: $color-footer-text;
      color: $color-footer-heading;
    }
  }
}
</style>
