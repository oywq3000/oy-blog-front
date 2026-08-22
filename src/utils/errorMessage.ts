import i18n from '../i18n';

/**
 * 统一错误信息提取 —— 全项目唯一出口。
 *
 * 能识别的错误形状（按优先级）：
 * 1. 字符串 → 原样返回
 * 2. axios 错误 response.data 为 JSON → errMsg → message → error 依次取
 * 3. axios 错误 response.data 为纯文本 → 原样返回
 * 4. Error.message —— Network Error / 超时映射为 i18n 文案
 * 5. 其余 → errors.unknown 兜底
 *
 * 详见 doc/ERROR_HANDLING_FRAMEWORK.md §4。
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (!error) return i18n.global.t('errors.unknown');

  const err = error as any;

  // 1. axios 响应体里的后端错误信息（errMsg 已按请求头 lang 国际化）
  const data = err?.response?.data;
  if (data) {
    if (typeof data === 'string' && data.trim()) return data;
    if (typeof data === 'object') {
      if (typeof data.errMsg === 'string' && data.errMsg.trim()) return data.errMsg;
      if (typeof data.message === 'string' && data.message.trim()) return data.message;
      if (typeof data.error === 'string' && data.error.trim()) return data.error;
    }
  }

  // 2. Error.message
  const message = typeof err?.message === 'string' ? err.message : '';
  if (message) {
    if (message === 'Network Error') return i18n.global.t('errors.network');
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(message)) {
      return i18n.global.t('errors.timeout');
    }
    // axios 无响应体的 HTTP 状态错误（如网关 502/504）
    const statusMatch = message.match(/Request failed with status code (\d+)/);
    if (statusMatch) return i18n.global.t('errors.http', { status: statusMatch[1] });
    return message;
  }

  return i18n.global.t('errors.unknown');
}
