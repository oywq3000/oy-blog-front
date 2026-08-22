<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AnimatedTextLogo from './AnimatedTextLogo.vue';

/**
 * 登录/注册/重置弹窗共享外壳：
 * Teleport 到 body（避免被父容器 overflow/transform 影响定位）、
 * 遮罩、容器（data-size 决定高度）、关闭/返回按钮、
 * header（Logo + 副标题）、成功视图、进出场过渡。
 * 表单内容由 default slot 注入。
 */
interface Props {
  open: boolean;
  size?: 'login' | 'register' | 'reset';
  backButton?: boolean;
  closeDisabled?: boolean;
  subtitle?: string;
  success?: boolean;
  successTitle?: string;
  successText?: string;
}

withDefaults(defineProps<Props>(), {
  size: 'login',
  backButton: false,
  closeDisabled: false,
  subtitle: '',
  success: false,
  successTitle: '',
  successText: '',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'back'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <!-- Teleport：把弹窗渲染到 <body> 节点下，避免被父容器的 overflow / transform 影响定位 -->
  <Teleport to="body">
    <!-- Transition：弹窗打开 / 关闭时的进出场过渡动画 -->
    <Transition name="modal">
      <!-- 遮罩层：半透明黑色背景，铺满全屏（位于弹窗主体之下） -->
      <div v-if="open" class="modal-backdrop">
        <!-- 弹窗主体卡片；@click.stop 阻止点击事件冒泡到遮罩层（防御性写法） -->
        <div class="modal-container glass-panel" :data-size="size" @click.stop>

          <div class="modal-right">

            <!-- 右上角关闭按钮：加载中（closeDisabled）禁止关闭 -->
            <button class="modal-close" :disabled="closeDisabled" @click="emit('close')" aria-label="Close modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <!-- 左上角返回按钮：注册 / 重置密码模式显示，点击返回登录 -->
            <button v-if="backButton" class="back-btn-corner" @click="emit('back')" :aria-label="t('auth.backToLogin')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <!-- 成功状态视图（登录/注册/重置成功后显示，替换掉整个表单） -->
            <div v-if="success" class="success-state">
              <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div class="success-content">
                <h3>{{ successTitle }}</h3>
                <p>{{ successText }}</p>
              </div>
            </div>

            <!-- 表单视图：视图切换过渡 mode="out-in" 先出后入 -->
            <Transition v-else name="fade-slide" mode="out-in">
              <div key="standard" class="auth-view standard-view">

                <!-- 弹窗头部：品牌动画 Logo + 副标题 -->
                <div class="modal-header">
                  <div class="logo-wrapper">
                     <AnimatedTextLogo :width="200" :height="34" :delay="300" />
                  </div>
                  <p class="modal-subtitle">{{ subtitle }}</p>
                </div>

                <slot />
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6); // More neutral for light/dark
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  display: flex;
  width: 100%;
  max-width: 446px; // 表单区原宽度（720px × 62%），删除左侧动画后保持页面宽度不变
  height: 480px;
  // 短屏兜底：弹窗高度不超过可视区，超高时由 .modal-right 内部滚动
  max-height: calc(100vh - 48px);
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;

  // 按弹窗类型定高：注册 5 字段 / 重置 4 字段需要更高容器，避免滚动遮挡
  &[data-size='register'] { height: 650px; }
  &[data-size='reset'] { height: 620px; }
}

.modal-right {
  flex: 1;
  padding: 30px 32px;
  display: flex;
  flex-direction: column;
  // 不设 justify-content: center：内容超高时可滚动，避免顶部被裁剪
  overflow-y: auto;
  position: relative;
  z-index: 1;
  // Use theme background
  background: var(--color-bg-secondary);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 20; // Ensure on top

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover:not(:disabled) {
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.auth-view {
  width: 100%;
  // min-height: 内容不足一屏时撑满并垂直居中；内容超高时随内容增长，交给父容器滚动
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.modal-subtitle {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.back-btn-corner {
  position: absolute;
  top: 16px;
  left: 16px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 20;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }
}

// Transitions
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

// Responsive
@media (max-width: 768px) {
  .modal-container {
    flex-direction: column;
    height: auto;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-right {
    padding: 32px 24px;
  }
}

// Success State
.success-state {
  text-align: center;
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  // 作为 .modal-right 的独立子项，用 auto margin 实现垂直居中
  margin-top: auto;
  margin-bottom: auto;

  .success-icon {
    width: 64px;
    height: 64px;
    background: rgba(7, 193, 96, 0.1);
    color: #07c160;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #07c160;
    animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;

    svg {
      width: 32px;
      height: 32px;
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: drawCheck 0.5s ease-out 0.3s forwards;
    }
  }

  .success-content {
    opacity: 0;
    transform: translateY(10px);
    animation: fadeUp 0.5s ease-out 0.4s forwards;

    h3 {
      font-size: 24px;
      color: var(--color-text-primary);
      font-weight: 700;
      margin-bottom: 4px;
    }

    p {
      color: var(--color-text-secondary);
      font-size: 14px;
    }
  }
}

@keyframes drawCheck {
  to { stroke-dashoffset: 0; }
}

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}
</style>
