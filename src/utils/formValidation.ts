/**
 * 表单本地校验纯函数 —— 提交前拦截异常输入，避免发起无效请求。
 *
 * 约定（doc/ERROR_HANDLING_FRAMEWORK.md §8）：
 * 本地校验失败直接拦截（不调 API），表单内联错误 + 对应输入框变红；
 * 请求错误才由拦截器统一顶部气泡提示。
 */

/** 邮箱格式校验（宽松：local@domain.tld，不含空白字符） */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 邮箱验证码：6 位纯数字 */
export function isValidEmailCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
