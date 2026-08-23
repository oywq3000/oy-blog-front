import { ref } from 'vue';
import { getCaptcha } from '../api/auth';

/**
 * 图形验证码获取 + 刷新逻辑（注册/重置弹窗共用）。
 *
 * refresh 并发时只发一次请求（loading 守卫）；请求错误由拦截器统一气泡提示。
 */
export function useCaptcha() {
  const captchaId = ref('');
  const captchaImg = ref('');
  const captchaCode = ref('');
  const loading = ref(false);

  const refresh = async () => {
    if (loading.value) return;
    loading.value = true;
    try {
      const res = await getCaptcha();
      captchaId.value = res.data.captchaId;
      captchaImg.value = res.data.captchaImg;
      captchaCode.value = '';
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    captchaId.value = '';
    captchaImg.value = '';
    captchaCode.value = '';
  };

  return { captchaId, captchaImg, captchaCode, loading, refresh, reset };
}
