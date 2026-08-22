<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { login } from '../api/auth';
import { useFieldErrors } from '../composables/useFieldErrors';
import AuthModalShell from './AuthModalShell.vue';

/**
 * 登录弹窗（密码登录）。
 * 互切：switch-register（底部注册链接）、switch-reset（忘记密码链接）。
 * 登录成功：写 token → 成功视图 1.5s → emit close + 刷新页面。
 */
const props = withDefaults(defineProps<{ isOpen: boolean }>(), { isOpen: false });
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switch-register'): void;
  (e: 'switch-reset'): void;
}>();
const { t } = useI18n();

const username = ref('');
const password = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref(false);

const { fieldErrors, setFieldError, clearFieldErrors, markAll } = useFieldErrors(['username', 'password'] as const);

// 关闭 300ms 后重置状态：标红/表单内容不保留，重新打开为全新状态
watch(() => props.isOpen, (open) => {
  if (!open) {
    setTimeout(resetState, 300);
  }
});

const resetState = () => {
  username.value = '';
  password.value = '';
  error.value = '';
  success.value = false;
  isLoading.value = false;
  clearFieldErrors();
};

const handleSubmit = async () => {
  error.value = '';
  clearFieldErrors();

  // 本地校验：异常直接拦截不发请求，对应输入框变红
  if (!username.value || !password.value) {
    error.value = t('auth.fillAll');
    if (!username.value) setFieldError('username');
    if (!password.value) setFieldError('password');
    return;
  }

  isLoading.value = true;
  try {
    const res = await login({
      username: username.value,
      password: password.value,
      ipAddress: '127.0.0.1'
    });

    success.value = true;
    localStorage.setItem('token', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setTimeout(() => {
      emit('close');
      // 登录成功后自动刷新当前页面：
      // 仅更新 userStore 无法同步各页面挂载时拉取的数据（评论登录态、点赞状态、菜单项等），
      // 刷新后 App.vue 会重新 fetchUserInfo，全站组件以登录态重新渲染
      window.location.reload();
    }, 1500);
  } catch {
    // 请求错误：整组标红提示，气泡由拦截器统一打印
    markAll();
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthModalShell
    :open="isOpen"
    size="login"
    :subtitle="t('auth.loginSubtitle')"
    :close-disabled="isLoading"
    :success="success"
    :success-title="t('auth.successTitle')"
    :success-text="t('auth.welcomeBackExcl')"
    @close="emit('close')"
  >
    <!-- 表单主体：提交触发 handleSubmit；error 有值时加 shake 抖动动画 -->
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

      <!-- ② 密码输入框 -->
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

      <!-- ③ 忘记密码链接 -->
      <div class="form-actions">
        <a href="#" class="forgot-password" @click.prevent="emit('switch-reset')">{{ t('auth.forgotPassword') }}</a>
      </div>

      <!-- ④ 错误提示条：本地校验失败时显示（请求错误由拦截器气泡提示） -->
      <span class="error-msg" v-if="error">{{ error }}</span>

      <!-- ⑤ 提交按钮：加载中显示 spinner -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="isLoading"
        :class="{ 'loading': isLoading }"
      >
        <span v-if="!isLoading">{{ t('auth.signIn') }}</span>
        <div v-else class="spinner"></div>
        <span class="btn-ripple"></span>
      </button>
    </form>

    <!-- 底部：登录 ⇄ 注册 模式切换 -->
    <div class="modal-footer">
      <div class="register-prompt">
        <span>{{ t('auth.noAccount') }}</span>
        <a href="#" class="register-link" @click.prevent="emit('switch-register')">{{ t('auth.registerNow') }}</a>
      </div>
    </div>
  </AuthModalShell>
</template>

<style lang="scss" scoped>
@use '../styles/auth-forms' as *;
</style>
