/**
 * Agent 可选模型 —— 前端唯一真源。
 *
 * 模型 id 的权威来源是后端 BlogAgent `app/config.py` 的 `model_allowlist`：
 * 不在允许列表中的 id 会被 `app/llm.py:select_model_name` 直接抛 ValueError。
 * 因此前端不得自行发明模型 id，设置弹窗与输入框必须共用本模块，
 * 否则两处列表漂移后，显示标签与实际值会错位（见 agentModelSettings.test.ts）。
 */
export interface AgentModelOption {
  value: string
  label: string
}

/** 与后端 model_allowlist 逐项对应 */
export const AGENT_MODELS: readonly AgentModelOption[] = [
  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
]

/** 与后端 model_default 一致 */
export const DEFAULT_AGENT_MODEL = 'deepseek-v4-flash'

/**
 * 取模型展示名。未知 id 如实返回自身 —— 宁可显示一个后端不认的值暴露漂移，
 * 也不要兜底成另一个模型，让用户以为在用 A 实际发出去的是 B。
 */
export function getModelLabel(value: string): string {
  return AGENT_MODELS.find(model => model.value === value)?.label ?? value
}
