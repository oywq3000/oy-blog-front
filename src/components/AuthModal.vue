<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { login, register, sendEmailCode, resetPassword } from '../api/auth';
import { useUserStore } from '../store/user';
import { useEmailCode } from '../composables/useEmailCode';
import { useToast } from '../composables/useToast';
import AnimatedTextLogo from './AnimatedTextLogo.vue';

interface Props {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'reset';
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  initialMode: 'login'
});

const emit = defineEmits(['close', 'success']);
const { t } = useI18n();
const { fetchUserInfo } = useUserStore();
const { addToast } = useToast();

const mode = ref(props.initialMode);
const loginMethod = ref<'password' | 'wechat'>('password');
const wechatStep = ref<'scan' | 'set-password'>('scan');
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const emailCode = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref(false);

// 邮箱验证码发送 + 60s 倒计时（reset 模式发送重置密码验证码，register 模式发送注册验证码）
const { cooldown: sendCodeCooldown, sending: isSendingCode, send: sendCode, reset: resetEmailCode } = useEmailCode(
  async (email: string) => {
    await sendEmailCode({ email, purpose: mode.value === 'reset' ? 'reset' : undefined });
  }
);

const handleSendCode = async () => {
  if (!email.value) {
    error.value = t('auth.fillAll');
    return;
  }
  error.value = '';
  try {
    await sendCode(email.value);
  } catch (err: any) {
    error.value = err.message || t('auth.codeSendFailed');
  }
};

// WeChat Mock Timer
let scanTimer: any = null;

// Watch for initialMode changes when modal opens
watch(() => props.initialMode, (newVal) => {
  mode.value = newVal;
});

// Reset state when modal closes
watch(() => props.isOpen, (newVal) => {
  if (!newVal) {
    setTimeout(() => {
      resetState();
    }, 300);
  } else {
    // If opening in login mode and wechat selected, restart scan simulation
    if (mode.value === 'login' && loginMethod.value === 'wechat') {
      startScanSimulation();
    }
  }
});

const resetState = () => {
  username.value = '';
  email.value = '';
  password.value = '';
  confirmPassword.value = '';
  emailCode.value = '';
  error.value = '';
  success.value = false;
  isLoading.value = false;
  loginMethod.value = 'password';
  wechatStep.value = 'scan';
  stopScanSimulation();
  resetEmailCode();
};

const title = computed(() => {
  if (success.value) {
    if (mode.value === 'reset') return t('auth.resetTitle');
    return mode.value === 'login' ? t('auth.successTitle') : t('auth.welcomeTitle');
  }
  if (loginMethod.value === 'wechat') return t('auth.wechatLoginTitle');
  if (mode.value === 'register') return t('auth.joinTitle');
  if (mode.value === 'reset') return t('auth.resetTitle');
  return t('auth.title');
});

const subtitle = computed(() => {
  if (success.value) return '';
  if (loginMethod.value === 'wechat') return t('auth.wechatSubtitle');
  if (mode.value === 'register') return t('auth.registerSubtitle');
  if (mode.value === 'reset') return t('auth.resetSubtitle');
  return t('auth.loginSubtitle');
});

const buttonText = computed(() => {
  if (isLoading.value) return t('auth.processing');
  if (mode.value === 'login' && loginMethod.value === 'wechat' && wechatStep.value === 'set-password') return t('auth.completeSetup');
  if (mode.value === 'login') return t('auth.signIn');
  if (mode.value === 'reset') return t('auth.resetPassword');
  return t('auth.signUp');
});

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
  loginMethod.value = 'password'; // Reset to password on mode switch
};

const switchToReset = () => {
  mode.value = 'reset';
  error.value = '';
  loginMethod.value = 'password';
};

const switchToWeChat = () => {
  loginMethod.value = 'wechat';
  mode.value = 'login'; // WeChat handles both login/register flow usually
  error.value = '';
  wechatStep.value = 'scan';
  startScanSimulation();
};

const switchToPassword = () => {
  loginMethod.value = 'password';
  error.value = '';
  stopScanSimulation();
};

const startScanSimulation = () => {
  stopScanSimulation();
  // Simulate a scan after 3 seconds
  scanTimer = setTimeout(() => {
    if (props.isOpen && loginMethod.value === 'wechat' && wechatStep.value === 'scan') {
      wechatStep.value = 'set-password';
    }
  }, 3000);
};

const stopScanSimulation = () => {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
};

const handleSubmit = async () => {
  error.value = '';

  // WeChat Set Password Flow
  if (loginMethod.value === 'wechat' && wechatStep.value === 'set-password') {
     if (!password.value || !confirmPassword.value) {
      error.value = t('auth.fillAll');
      return;
    }
    if (password.value !== confirmPassword.value) {
      error.value = t('auth.passwordsDoNotMatch');
      return;
    }
    
    // Simulate API call for binding/registering
    isLoading.value = true;
    setTimeout(() => {
        isLoading.value = false;
        success.value = true;
        setTimeout(() => {
            emit('success');
            emit('close');
            // Mock login
            // In real app, we would get token here
            fetchUserInfo(); 
        }, 1500);
    }, 1500);
    return;
  }

  // Forgot Password Flow
  if (mode.value === 'reset') {
    if (!email.value || !emailCode.value || !password.value || !confirmPassword.value) {
      error.value = t('auth.fillAll');
      return;
    }
    if (password.value !== confirmPassword.value) {
      error.value = t('auth.passwordsDoNotMatch');
      return;
    }
    isLoading.value = true;
    try {
      const res = await resetPassword({
        email: email.value,
        emailCode: emailCode.value,
        newPassword: password.value,
        confirmPassword: confirmPassword.value
      });
      if (res.isSuccess) {
        addToast(t('auth.resetSuccess'), 'success', 3000);
        success.value = true;
        setTimeout(() => {
          // Switch back to login mode
          mode.value = 'login';
          success.value = false;
          password.value = '';
          confirmPassword.value = '';
          emailCode.value = '';
        }, 1500);
      } else {
        error.value = res.errMsg || t('auth.resetFailed');
      }
    } catch (err: any) {
      console.error(err);
      error.value = err.response?.data?.errmsg || err.message || t('auth.unknownError');
    } finally {
      isLoading.value = false;
    }
    return;
  }

  // Basic Validation
  if (!username.value || !password.value) {
    error.value = t('auth.fillAll');
    return;
  }

  if (mode.value === 'register') {
    if (!email.value || !confirmPassword.value) {
      error.value = t('auth.fillAll');
      return;
    }
    if (password.value !== confirmPassword.value) {
      error.value = t('auth.passwordsDoNotMatch');
      return;
    }
    if (!emailCode.value) {
      error.value = t('auth.codeRequired');
      return;
    }
  }

  isLoading.value = true;

  try {
    if (mode.value === 'login') {
      const res = await login({ 
        username: username.value, 
        password: password.value,
        ipAddress: '127.0.0.1' 
      });
      
      if (res.isSuccess) {
        success.value = true;
        localStorage.setItem('token', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        setTimeout(() => {
          emit('success');
          emit('close');
          // 登录成功后自动刷新当前页面：
          // 仅更新 userStore 无法同步各页面挂载时拉取的数据（评论登录态、点赞状态、菜单项等），
          // 刷新后 App.vue 会重新 fetchUserInfo，全站组件以登录态重新渲染
          window.location.reload();
        }, 1500);
      } else {
        error.value = res.errMsg || t('auth.loginFailed');
      }
    } else {
      if (password.value !== confirmPassword.value) {
        error.value = t('auth.passwordsDoNotMatch');
        isLoading.value = false;
        return;
      }

      const res = await register({
        username: username.value,
        password: password.value,
        confirmPassword: confirmPassword.value,
        email: email.value,
        ipAddress: '127.0.0.1',
        emailCode: emailCode.value
      });

      if (res.isSuccess) {
        success.value = true;
        setTimeout(() => {
          // Switch to login mode
          mode.value = 'login';
          success.value = false;
          password.value = '';
          confirmPassword.value = '';
        }, 1500);
      } else {
        error.value = res.errMsg || t('auth.registerFailed');
      }
    }
  } catch (err: any) {
    console.error(err);
    error.value = err.response?.data?.errmsg || err.message || t('auth.unknownError');
  } finally {
    isLoading.value = false;
  }
};

const handleClose = () => {
  if (!isLoading.value) {
    emit('close');
  }
};

onUnmounted(() => {
  stopScanSimulation();
  resetEmailCode();
});
</script>

<template>
  <!-- Teleport：把弹窗渲染到 <body> 节点下，避免被父容器的 overflow / transform 影响定位 -->
  <Teleport to="body">
    <!-- Transition：弹窗打开 / 关闭时的进出场过渡动画 -->
    <Transition name="modal">
      <!-- 遮罩层：半透明黑色背景，铺满全屏（位于弹窗主体之下） -->
      <div v-if="isOpen" class="modal-backdrop">
        <!-- 弹窗主体卡片；@click.stop 阻止点击事件冒泡到遮罩层（防御性写法） -->
        <div class="modal-container glass-panel" @click.stop>

          <!-- ============ 一、表单内容区（原左侧动画面板已删除，这是弹窗唯一的内容区） ============ -->
          <div class="modal-right">

            <!-- 右上角关闭按钮：点击触发 handleClose（加载中禁止关闭） -->
            <button class="modal-close" @click="handleClose" aria-label="Close modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <!-- 微信登录流程的"返回密码登录"按钮：已注释停用，代码保留备用（对应 switchToPassword） -->
            <!-- <button v-if="loginMethod === 'wechat'" class="back-btn-corner" @click="switchToPassword" aria-label="Back to login">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button> -->

            <!-- 左上角返回按钮：注册 / 重置密码模式显示，点击切换回登录模式 -->
            <button v-if="mode === 'register' || mode === 'reset'" class="back-btn-corner" @click="toggleMode" :aria-label="t('auth.backToLogin')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <!-- ============ 二、成功状态视图（登录/注册成功后显示，替换掉整个表单） ============ -->
            <div v-if="success" class="success-state">
              <!-- 绿色对勾图标 -->
              <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <!-- 成功标题 + 提示文案（按登录 / 注册模式显示不同文案） -->
              <div class="success-content">
                <h3>{{ title }}</h3>
                <p v-if="mode === 'login'">{{ t('auth.welcomeBackExcl') }}</p>
                <p v-else-if="mode === 'register'">{{ t('auth.accountCreated') }}</p>
                <p v-else>{{ t('auth.resetSuccess') }}</p>
              </div>
            </div>

            <!-- 视图切换过渡：mode="out-in" 先出后入。目前内部只剩 standard-view 一个视图（微信视图已移除） -->
            <Transition name="fade-slide" mode="out-in">

              <!-- ============ 三、标准登录/注册视图（核心表单；成功后隐藏，只显示成功状态视图） ============ -->
              <div v-if="!success" key="standard" class="auth-view standard-view">

                <!-- 弹窗头部：品牌动画 Logo + 副标题（副标题按登录/注册切换文案，已国际化） -->
                <div class="modal-header">
                  <div class="logo-wrapper">
                     <AnimatedTextLogo :width="200" :height="34" :delay="300" />
                  </div>
                  <p class="modal-subtitle">{{ subtitle }}</p>
                </div>

                <!-- 表单主体：提交触发 handleSubmit（登录/注册逻辑都在里面）；error 有值时加 shake 抖动动画 -->
                <form @submit.prevent="handleSubmit" class="auth-form" :class="{ 'shake': !!error }">

                  <!-- ① 用户名输入框（登录 / 注册两种模式显示，重置密码模式隐藏） -->
                  <div class="form-group" v-if="mode === 'login' || mode === 'register'">
                    <label>{{ t('auth.username') }}</label>
                    <input
                      type="text"
                      v-model="username"
                      :placeholder="t('auth.usernamePlaceholder')"
                      :class="{ 'has-error': !!error }"
                      required
                    />
                  </div>

                  <!-- ② 邮箱输入框（注册 / 重置密码模式显示） -->
                  <div class="form-group" v-if="mode === 'register' || mode === 'reset'">
                    <label>{{ t('auth.email') }}</label>
                    <input
                      type="email"
                      v-model="email"
                      :placeholder="t('auth.emailPlaceholder')"
                      :class="{ 'has-error': !!error }"
                      required
                    />
                  </div>

                  <!-- ③ 邮箱验证码（注册 / 重置密码模式）：输入框 + 发送按钮（带 60s 倒计时，由 useEmailCode 管理） -->
                  <div class="form-group" v-if="mode === 'register' || mode === 'reset'">
                    <label>{{ t('auth.verifyCode') }}</label>
                    <div class="code-row">
                      <input
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        v-model="emailCode"
                        :placeholder="t('auth.verifyCodePlaceholder')"
                        :class="{ 'has-error': !!error }"
                        required
                      />
                      <!-- 发送验证码按钮：发送中 / 倒计时中 / 未填邮箱时禁用 -->
                      <button
                        type="button"
                        class="code-send-btn"
                        :disabled="isSendingCode || sendCodeCooldown > 0 || !email"
                        @click="handleSendCode"
                      >
                        {{ isSendingCode ? t('auth.processing') : (sendCodeCooldown > 0 ? t('auth.resendInSeconds', { seconds: sendCodeCooldown }) : t('auth.sendCode')) }}
                      </button>
                    </div>
                  </div>

                  <!-- ④ 密码输入框（两种模式都显示；重置密码模式下作为新密码输入框） -->
                  <div class="form-group">
                    <div class="password-header">
                      <label>{{ mode === 'reset' ? t('auth.newPassword') : t('auth.password') }}</label>
                    </div>
                    <input
                      type="password"
                      v-model="password"
                      :placeholder="t('auth.passwordPlaceholder')"
                      :class="{ 'has-error': !!error }"
                      required
                    />
                  </div>

                  <!-- ⑤ 确认密码输入框（注册 / 重置密码模式显示） -->
                  <div class="form-group" v-if="mode === 'register' || mode === 'reset'">
                    <label>{{ t('auth.confirmPassword') }}</label>
                    <input
                      type="password"
                      v-model="confirmPassword"
                      :placeholder="t('auth.passwordPlaceholder')"
                      :class="{ 'has-error': !!error }"
                      required
                    />
                  </div>

                  <!-- ⑥ 忘记密码链接（仅登录模式显示，点击进入重置密码模式） -->
                   <div class="form-actions" v-if="mode === 'login'">
                      <a href="#" class="forgot-password" @click.prevent="switchToReset">{{ t('auth.forgotPassword') }}</a>
                   </div>

                  <!-- ⑦ 错误提示条：error 有值时才显示（登录失败、验证码错误等都会写进 error） -->
                  <span class="error-msg" v-if="error">{{ error }}</span>

                  <!-- ⑧ 提交按钮：加载中显示 spinner；平时显示 buttonText（登录/注册自动切换文案） -->
                  <button
                    type="submit"
                    class="submit-btn"
                    :disabled="isLoading"
                    :class="{ 'loading': isLoading }"
                  >
                    <span v-if="!isLoading">{{ buttonText }}</span>
                    <div v-else class="spinner"></div>
                    <span class="btn-ripple"></span>
                  </button>
                </form>

                <!-- ============ 四、弹窗底部：登录 ⇄ 注册 模式切换 ============ -->
                <div class="modal-footer">
                  <!-- 登录模式：分隔线 "or" + "没有账户？立即注册"（点击切换为注册模式） -->
                  <template v-if="mode === 'login'">
                    <div class="register-prompt">
                      <span>{{ t('auth.noAccount') }}</span>
                      <a href="#" class="register-link" @click.prevent="toggleMode">{{ t('auth.registerNow') }}</a>
                    </div>
                  </template>
                  <!-- 注册模式："已有账户？去登录"（点击切换回登录模式） -->
                  <template v-else-if="mode === 'register'">
                     <p>
                      {{ t('auth.hasAccount') }}
                      <a href="#" @click.prevent="toggleMode">{{ t('auth.signIn') }}</a>
                    </p>
                  </template>
                  <!-- 重置密码模式：返回登录 -->
                  <template v-else>
                     <p>
                      {{ t('auth.hasAccount') }}
                      <a href="#" @click.prevent="toggleMode">{{ t('auth.backToLogin') }}</a>
                    </p>
                  </template>
                </div>
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
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
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

  &:hover {
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
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

.modal-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 4px;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
}

.text-gradient {
  background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-text-secondary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.modal-subtitle {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;

  label {
    font-size: 12px;
    color: var(--color-text-secondary);
    font-weight: 600;
    margin-left: 2px;
  }

  input {
    width: 100%;
    padding: 10px 14px;
    background: var(--color-input-bg);
    border: 1px solid var(--color-input-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 13px;
    transition: all 0.2s ease;
    
    &::placeholder {
      color: var(--color-input-placeholder);
    }

    &:hover {
      border-color: var(--color-text-secondary);
    }

    &:focus {
      outline: none;
      border-color: var(--color-accent-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-accent-primary-rgb), 0.1);
      background: var(--color-bg-primary);
    }

    &.has-error {
      border-color: var(--color-accent-tertiary);
    }
  }
}

.code-row {
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    min-width: 0;
  }
}

.code-send-btn {
  flex-shrink: 0;
  padding: 0 14px;
  border: 1px solid var(--color-accent-primary);
  background: transparent;
  color: var(--color-accent-primary);
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(var(--color-accent-primary-rgb), 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
}

.forgot-password {
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: color 0.2s;
  
  &:hover {
    color: var(--color-accent-primary);
    text-decoration: none;
  }
}

.submit-btn {
  margin-top: 4px;
  padding: 10px;
  background: var(--color-accent-primary);
  color: #fff; // Always white text on primary button
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(var(--color-accent-primary-rgb), 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(var(--color-accent-primary-rgb), 0.3);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
}

.modal-footer {
  margin-top: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  
  p {
    color: var(--color-text-secondary);
    font-size: 14px;
    
    a {
      color: var(--color-accent-primary);
      font-weight: 600;
      &:hover { text-decoration: underline; }
    }
  }
}

.wechat-prompt-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  padding: 10px 16px;
  border-radius: 12px;
  width: 100%;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  box-shadow: var(--shadow-sm);

  .wechat-icon-container {
    width: 28px;
    height: 28px;
    background: #07c160;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .wechat-icon {
    fill: #ffffff;
    filter: none;
  }

  strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  &:hover {
    background: var(--color-bg-secondary);
    border-color: #07c160;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(1px);
  }
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.register-prompt {
  display: flex;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  align-items: center;
  justify-content: center;
}

.register-link {
  color: var(--color-accent-primary);
  font-weight: 600;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
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

// WeChat View Styles
.wechat-view {
  align-items: center;
  text-align: center;
}

.qr-container {
  margin: 16px 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  .qr-placeholder {
    width: 150px;
    height: 150px;
    background: #fff;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    border: 4px solid #fff;
    
    .scan-line {
      position: absolute;
      width: 100%;
      height: 2px;
      background: #07c160;
      box-shadow: 0 0 8px #07c160;
      top: 0;
      animation: scan 2.5s ease-in-out infinite;
    }
  }
  
  .scan-tip {
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 500;
  }
}

.set-password-form {
  width: 100%;
}

.info-text {
  font-size: 14px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  text-align: center;
  background: rgba(var(--color-accent-primary-rgb), 0.1);
  padding: 10px;
  border-radius: 8px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;

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

// Keyframes
@keyframes scan {
  0% { top: 10%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 90%; opacity: 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
