import { useToast } from '../composables/useToast';
import { extractErrorMessage } from './errorMessage';

// 多个并发请求同时失败时（如页面并行加载评论+正文+目录），
// 相同文案在窗口期内只弹一次气泡，避免刷屏
const DEDUPE_WINDOW_MS = 2000;
const lastToast = { message: '', at: 0 };

/** 仅供测试重置去重状态 */
export const resetToastDedupe = () => {
  lastToast.message = '';
  lastToast.at = 0;
};

/**
 * 统一请求错误出口：中间顶部弹出小气泡打印错误信息。
 * 所有请求错误（业务错误 isSuccess=false / HTTP 错误 / 网络与超时）
 * 一律由 axios 响应拦截器调用本函数呈现，业务组件不得自行展示错误。
 *
 * 详见 doc/ERROR_HANDLING_FRAMEWORK.md。
 */
export function notifyRequestError(error: unknown, duration = 5000) {
  const message = extractErrorMessage(error);

  const now = Date.now();
  if (message === lastToast.message && now - lastToast.at < DEDUPE_WINDOW_MS) {
    return;
  }
  lastToast.message = message;
  lastToast.at = now;

  try {
    const { addToast } = useToast();
    addToast(message, 'error', duration);
  } catch {
    console.warn('[request] toast unavailable:', message);
  }
}
