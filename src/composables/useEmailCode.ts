import { ref } from 'vue';

/**
 * 邮箱验证码发送 + 倒计时逻辑（注册表单用）。
 *
 * 发送成功后进入 cooldown 秒冷却；冷却中或发送中重复调用 send 会被忽略。
 */
export function useEmailCode(sendApi: (email: string) => Promise<unknown>, cooldownSeconds = 60) {
  const cooldown = ref(0);
  const sending = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startCooldown = () => {
    stopTimer();
    cooldown.value = cooldownSeconds;
    timer = setInterval(() => {
      cooldown.value -= 1;
      if (cooldown.value <= 0) {
        stopTimer();
      }
    }, 1000);
  };

  const send = async (email: string) => {
    if (sending.value || cooldown.value > 0) return;
    sending.value = true;
    try {
      await sendApi(email);
      startCooldown();
    } finally {
      sending.value = false;
    }
  };

  const reset = () => {
    stopTimer();
    cooldown.value = 0;
    sending.value = false;
  };

  return { cooldown, sending, send, reset };
}
