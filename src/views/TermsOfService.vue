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
        <h1 class="page-title">Terms of Service</h1>
        <p class="last-updated">Last Updated: December 2025</p>
      </header>

      <section class="legal-content glass-panel fade-in-up stagger-delay-1">
        <div class="policy-section">
          <h2>1. Agreement to Terms</h2>
          <p>
            These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Rookie Blog ("we," "us" or "our"), concerning your access to and use of the Rookie Blog website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").
          </p>
          <p>
            You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms of Service. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF SERVICE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.
          </p>
        </div>

        <div class="policy-section">
          <h2>2. Intellectual Property Rights</h2>
          <p>
            Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
          </p>
        </div>

        <div class="policy-section">
          <h2>3. User Representations</h2>
          <p>
            By using the Site, you represent and warrant that:
          </p>
          <ul>
            <li>All registration information you submit will be true, accurate, current, and complete.</li>
            <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
            <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
            <li>You are not a minor in the jurisdiction in which you reside.</li>
          </ul>
        </div>

        <div class="policy-section">
          <h2>4. User Registration</h2>
          <p>
            You may be required to register with the Site. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
          </p>
        </div>

        <div class="policy-section">
          <h2>5. Prohibited Activities</h2>
          <p>
            You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
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
