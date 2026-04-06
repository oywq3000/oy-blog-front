<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="legal-page">
    <div class="container content-layout">
      <header class="legal-header fade-in-up">
        <h1 class="page-title">{{ t('cookie.title') }}</h1>
        <p class="last-updated">Last Updated: December 2025</p>
      </header>

      <section class="legal-content glass-panel fade-in-up stagger-delay-1">
        <div class="policy-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Rookie Blog. We are committed to protecting your personal information and your right to privacy.
            If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information,
            please contact us.
          </p>
        </div>

        <div class="policy-section">
          <h2>2. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the website,
            express an interest in obtaining information about us or our products and services, when you participate in activities on the website
            (such as posting messages in our online forums or entering competitions, contests or giveaways) or otherwise when you contact us.
          </p>
          <ul>
            <li><strong>Personal Information Provided by You:</strong> Names, email addresses, usernames, passwords, and other similar information.</li>
            <li><strong>Automatically Collected Information:</strong> IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our website and other technical information.</li>
          </ul>
        </div>

        <div class="policy-section">
          <h2>3. Use of Cookies</h2>
          <p>
            We use cookies and similar tracking technologies (like web beacons and pixels) to access or store information.
            Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
          </p>
          <div class="cookie-highlight">
            <h3>Essential Cookies</h3>
            <p>These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas.</p>
          </div>
        </div>

        <div class="policy-section">
          <h2>4. How We Use Your Information</h2>
          <p>
            We use personal information collected via our website for a variety of business purposes described below.
            We process your personal information for these purposes in reliance on our legitimate business interests,
            in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
          </p>
          <ul>
            <li>To facilitate account creation and logon process.</li>
            <li>To post testimonials.</li>
            <li>To request feedback.</li>
            <li>To enable user-to-user communications.</li>
            <li>To manage user accounts.</li>
          </ul>
        </div>

        <div class="policy-section">
          <h2>5. Data Security</h2>
          <p>
            We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process.
            However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.legal-page {
  padding-top: 100px;
  min-height: 100vh;
  padding-bottom: 80px;
}

.legal-header {
  text-align: center;
  margin-bottom: 40px;

  .page-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 12px;
    background: linear-gradient(135deg, $color-text-primary 0%, $color-text-secondary 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .last-updated {
    color: $color-text-tertiary;
    font-size: 0.9rem;
  }
}

.legal-content {
  padding: 40px;
  border-radius: 16px;
  background: rgba($color-bg-secondary, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba($color-border, 0.5);
  
  @media (max-width: $breakpoint-mobile) {
    padding: 24px;
  }
}

.policy-section {
  margin-bottom: 40px;

  &:last-child {
    margin-bottom: 0;
  }

  h2 {
    font-size: 1.5rem;
    color: $color-text-primary;
    margin-bottom: 16px;
    font-weight: 700;
  }

  h3 {
    font-size: 1.1rem;
    color: $color-text-primary;
    margin-bottom: 12px;
    font-weight: 600;
  }

  p {
    color: $color-text-secondary;
    line-height: 1.8;
    margin-bottom: 16px;
    font-size: 1rem;
  }

  ul {
    list-style-type: disc;
    padding-left: 24px;
    margin-bottom: 16px;
    color: $color-text-secondary;

    li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
  }
}

.cookie-highlight {
  background: rgba($color-accent-primary, 0.05);
  border-left: 3px solid $color-accent-primary;
  padding: 20px;
  border-radius: 0 8px 8px 0;
  margin: 20px 0;
}

// Animations
.fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.stagger-delay-1 { animation-delay: 0.1s; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
