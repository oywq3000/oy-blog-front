import { ref } from 'vue';

/**
 * 字段级错误标记：校验/提交失败时对应输入框变红（has-error）。
 * 关闭弹窗 resetState 时调用 clearFieldErrors 清空，重新打开不保留标红状态。
 *
 * @param fields 本表单的完整字段集合，markAll() 按整组标红
 * （请求失败时后端不区分具体字段，整组标红）
 */
export function useFieldErrors<T extends string>(fields: readonly T[]) {
  const fieldErrors = ref<Partial<Record<T, boolean>>>({});

  const setFieldError = (field: T) => { fieldErrors.value[field] = true; };
  const clearFieldErrors = () => { fieldErrors.value = {}; };
  const markAll = () => { fields.forEach(setFieldError); };

  return { fieldErrors, setFieldError, clearFieldErrors, markAll };
}
