import { ref } from 'vue';

export type AuthModalType = 'login' | 'register' | 'reset';

/**
 * 登录/注册/重置弹窗协调状态机（NavBar 使用）。
 * 单 ref 原子状态：'login' | 'register' | 'reset' | null（null = 全部关闭），
 * 三模态常驻渲染、至多一个 open，互切通过 switchTo 完成。
 */
export function useAuthModalState() {
  const current = ref<AuthModalType | null>(null);

  const openLogin = () => { current.value = 'login'; };
  const switchTo = (type: AuthModalType) => { current.value = type; };
  const close = () => { current.value = null; };

  return { current, openLogin, switchTo, close };
}
