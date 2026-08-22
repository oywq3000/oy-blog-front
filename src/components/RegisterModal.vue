<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { register, sendEmailCode } from '../api/auth';
import { useEmailCode } from '../composables/useEmailCode';
import { useFieldErrors } from '../composables/useFieldErrors';
import { isValidEmail, isValidEmailCode } from '../utils/formValidation';
import { useToast } from '../composables/useToast';
import AuthModalShell from './AuthModalShell.vue';

/**
 * 注册弹窗（5 字段：用户名/邮箱/验证码/密码/确认密码）。
 * 互切：switch-login（返回按钮 / 底部链接 / 注册成功 1.5s 后）。
 * 本地校验异常直接拦截不发请求；请求错误由拦截器统一气泡提示。
 */
const props = withDefaults(defineProps<{ isOpen: boolean }>(), { isOpen: false });
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switch-login'): void;
}>();
const { t } = useI18n();
const { addToast } = useToast();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const emailCode = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref(false);

const { fieldErrors, setFieldError, clearFieldErrors, markAll } = useFieldErrors([
  'username', 'email', 'emailCode', 'password', 'confirmPassword',
] as const);

// 邮箱验证码发送 + 60s 倒计时（注册验证码）
const { cooldown: sendCodeCooldown, sending: isSendingCode, send: sendCode, reset: resetEmailCode } = useEmailCode(
  async (email: string) => {
    await sendEmailCode({ email });
  }
);

// 关闭 300ms 后重置状态：标红/表单内容不保留，重新打开为全新状态
watch(() => props.isOpen, (open) => {
  if (!open) {
    setTimeout(resetState, 300);
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
  clearFieldErrors();
  resetEmailCode();
};

const handleSendCode = async () => {
  if (!email.value) {
    error.value = t('auth.fillAll');
    setFieldError('email');
    return;
  }
  if (!isValidEmail(email.value)) {
    error.value = t('auth.invalidEmail');
    setFieldError('email');
    return;
  }
  error.value = '';
  try {
    await sendCode(email.value);
    addToast(t('auth.codeSent'), 'success');
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  }
};

const handleSubmit = async () => {
  error.value = '';
  clearFieldErrors();

  // 本地校验：逐字段检查，异常直接拦截不发请求，对应输入框变红
  const missing: ('username' | 'email' | 'emailCode' | 'password' | 'confirmPassword')[] = [];
  if (!username.value) missing.push('username');
  if (!email.value) missing.push('email');
  if (!emailCode.value) missing.push('emailCode');
  if (!password.value) missing.push('password');
  if (!confirmPassword.value) missing.push('confirmPassword');
  if (missing.length) {
    error.value = t('auth.fillAll');
    missing.forEach(setFieldError);
    return;
  }
  if (!isValidEmail(email.value)) {
    error.value = t('auth.invalidEmail');
    setFieldError('email');
    return;
  }
  if (!isValidEmailCode(emailCode.value)) {
    error.value = t('auth.invalidCode');
    setFieldError('emailCode');
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = t('auth.passwordsDoNotMatch');
    setFieldError('password');
    setFieldError('confirmPassword');
    return;
  }

  isLoading.value = true;
  try {
    await register({
      username: username.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
      email: email.value,
      ipAddress: '127.0.0.1',
      emailCode: emailCode.value
    });

    success.value = true;
    setTimeout(() => {
      // 成功视图期间若用户已关闭弹窗，不得再拉起登录弹窗（ghost-open 守卫）
      if (props.isOpen) {
        emit('switch-login');
      }
    }, 1500);
  } catch {
    // 请求错误：整组标红提示，气泡由拦截器统一打印
    markAll();
  } finally {
    isLoading.value = false;
  }
};

onUnmounted(() => {
  resetEmailCode();
});
</script>

<template>
  <AuthModalShell
    :open="isOpen"
    size="register"
    back-button
    :subtitle="t('auth.registerSubtitle')"
    :close-disabled="isLoading"
    :success="success"
    :success-title="t('auth.welcomeTitle')"
    :success-text="t('auth.accountCreated')"
    @close="emit('close')"
    @back="emit('switch-login')"
  >
    <form @submit.prevent="handleSubmit" class="auth-form" :class="{ 'shake': !!error }">

      <!-- ① 用户名输入框 -->
      <div class="form-group">
        <label>{{ t('auth.username') }}</label>
        <input
          type="text"
          v-model="username"
          :placeholder="t('auth.usernamePlaceholder')"
          :class="{ 'has-error': fieldErrors.username }"
          required
        />
      </div>

      <!-- ② 邮箱输入框 -->
      <div class="form-group">
        <label>{{ t('auth.email') }}</label>
        <input
          type="email"
          v-model="email"
          :placeholder="t('auth.emailPlaceholder')"
          :class="{ 'has-error': fieldErrors.email }"
          required
        />
      </div>

      <!-- ③ 邮箱验证码：输入框 + 发送按钮（带 60s 倒计时，由 useEmailCode 管理） -->
      <div class="form-group">
        <label>{{ t('auth.verifyCode') }}</label>
        <div class="code-row">
          <input
            type="text"
            inputmode="numeric"
            maxlength="6"
            v-model="emailCode"
            :placeholder="t('auth.verifyCodePlaceholder')"
            :class="{ 'has-error': fieldErrors.emailCode }"
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

      <!-- ④ 密码输入框 -->
      <div class="form-group">
        <label>{{ t('auth.password') }}</label>
        <input
          type="password"
          v-model="password"
          :placeholder="t('auth.passwordPlaceholder')"
          :class="{ 'has-error': fieldErrors.password }"
          required
        />
      </div>

      <!-- ⑤ 确认密码输入框 -->
      <div class="form-group">
        <label>{{ t('auth.confirmPassword') }}</label>
        <input
          type="password"
          v-model="confirmPassword"
          :placeholder="t('auth.passwordPlaceholder')"
          :class="{ 'has-error': fieldErrors.confirmPassword }"
          required
        />
      </div>

      <!-- ⑥ 错误提示条：本地校验失败时显示（请求错误由拦截器气泡提示） -->
      <span class="error-msg" v-if="error">{{ error }}</span>

      <!-- ⑦ 提交按钮 -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="isLoading"
        :class="{ 'loading': isLoading }"
      >
        <span v-if="!isLoading">{{ t('auth.signUp') }}</span>
        <div v-else class="spinner"></div>
        <span class="btn-ripple"></span>
      </button>
    </form>

    <!-- 底部：已有账户？去登录 -->
    <div class="modal-footer">
      <p>
        {{ t('auth.hasAccount') }}
        <a href="#" class="switch-to-login-link" @click.prevent="emit('switch-login')">{{ t('auth.signIn') }}</a>
      </p>
    </div>
  </AuthModalShell>
</template>

<style lang="scss" scoped>
@use '../styles/auth-forms' as *;
</style>
