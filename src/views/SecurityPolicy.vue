<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="legal-page">
    <div class="container content-layout">
      <header class="legal-header fade-in-up">
        <h1 class="page-title">Security Policy</h1>
        <p class="last-updated">Last Updated: December 2025</p>
      </header>

      <section class="legal-content glass-panel fade-in-up stagger-delay-1">
        <div class="policy-section">
          <h2>1. Security Measures</h2>
          <p>
            At Rookie Blog, we take the security of your data seriously. We employ industry-standard security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information.
          </p>
          <ul>
            <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using TLS (Transport Layer Security).</li>
            <li><strong>Data Storage:</strong> We use secure, redundant storage systems to ensure data integrity and availability.</li>
            <li><strong>Access Control:</strong> Access to personal data is strictly limited to authorized personnel who need it to perform their job duties.</li>
          </ul>
        </div>

        <div class="policy-section">
          <h2>2. Vulnerability Reporting</h2>
          <p>
            We appreciate the contributions of the security research community. If you believe you have found a security vulnerability in our site, please report it to us immediately.
          </p>
          <p>
            Please provide a detailed description of the vulnerability and the steps to reproduce it. We will acknowledge your report and work to resolve the issue as quickly as possible.
          </p>
        </div>

        <div class="policy-section">
          <h2>3. Account Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. We recommend using a strong, unique password and enabling two-factor authentication if available.
          </p>
          <p>
            If you suspect any unauthorized activity on your account, please contact our support team immediately.
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
