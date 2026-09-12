import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ChatInput from './ChatInput.vue'
import ChatSettingsModal from './ChatSettingsModal.vue'
import { AGENT_MODELS, DEFAULT_AGENT_MODEL } from '../../utils/agentModels'
import type { ChatSettings } from '../../types/agent'

/**
 * 模型设置同步回归测试。
 *
 * 背景：模型 id 列表曾在设置弹窗与输入框各自硬编码，两处漂移后弹窗保存
 * `deepseek-flash`、输入框列表里没有该值，`?? 'deepseek-v4-pro'` 兜底把标签
 * 伪装成另一个模型——按钮显示 deepseek-v4-pro、实际值是 deepseek-flash，即
 * "设置与输入框错位"。反方向同样错位：输入框选中的值不在弹窗 <option> 里，
 * <select> 显示空白。
 *
 * 模型 id 的真源是后端 BlogAgent app/config.py 的 model_allowlist：
 * 不在允许列表中的 id 会被 app/llm.py:select_model_name 抛 ValueError，
 * 前端不得自行发明。
 */

/** 后端 BlogAgent app/config.py:23 model_allowlist */
const BACKEND_ALLOWLIST = ['deepseek-v4-flash', 'deepseek-v4-pro']

const defaultSettings = (over: Partial<ChatSettings> = {}): ChatSettings => ({
  model: DEFAULT_AGENT_MODEL,
  temperature: 0.7,
  deepThinking: false,
  ...over,
})

/**
 * 复刻 AgentView 的接线：设置弹窗与输入框共享同一份 settings，
 * 弹窗 save 覆盖设置、输入框 update:model 改模型。
 */
function mountAgentSettings(initial: Partial<ChatSettings> = {}) {
  const settings = ref<ChatSettings>(defaultSettings(initial))
  const showSettings = ref(false)

  const Harness = defineComponent({
    setup() {
      return () =>
        h('div', [
          h(ChatInput, {
            streaming: false,
            deepThinking: settings.value.deepThinking,
            selectedModel: settings.value.model,
            // 注意：必须写带冒号的完整事件名，h() 的 onUpdateModel 简写匹配不到 update:model
            'onUpdate:model': (model: string) => {
              settings.value = { ...settings.value, model }
            },
          }),
          h(ChatSettingsModal, {
            settings: settings.value,
            isOpen: showSettings.value,
            onClose: () => {
              showSettings.value = false
            },
            onSave: (next: ChatSettings) => {
              settings.value = next
            },
          }),
        ])
    },
  })

  const wrapper = mount(Harness)

  /** 输入框左下角"模型: xxx"按钮的文案 */
  const inputModelLabel = () => wrapper.find('.chat-input__model-btn').text()
  /** 弹窗 Teleport 到 body，需查 document */
  const modalSelect = () =>
    document.body.querySelector<HTMLSelectElement>('.settings-field__select')!
  const openModal = async () => {
    showSettings.value = true
    await nextTick()
  }
  const saveModal = async () => {
    document.body.querySelector<HTMLButtonElement>('.settings-btn--primary')!.click()
    await nextTick()
  }
  const selectInModal = async (value: string) => {
    const select = modalSelect()
    select.value = value
    select.dispatchEvent(new Event('change'))
    await nextTick()
  }
  /** 点开输入框的模型下拉，选中第 index 项 */
  const pickInInput = async (index: number) => {
    await wrapper.find('.chat-input__model-btn').trigger('click')
    await wrapper.findAll('.chat-input__model-option')[index].trigger('click')
    await nextTick()
  }

  return {
    wrapper,
    settings,
    inputModelLabel,
    modalSelect,
    openModal,
    saveModal,
    selectInModal,
    pickInInput,
  }
}

afterEach(() => {
  // 清掉 Teleport 到 body 的弹窗残留
  document.body.innerHTML = ''
})

describe('模型选项唯一真源', () => {
  it('should expose exactly the backend allowlist as model values', () => {
    expect(AGENT_MODELS.map(m => m.value)).toEqual(BACKEND_ALLOWLIST)
  })

  it('should default to a backend-allowed model', () => {
    expect(BACKEND_ALLOWLIST).toContain(DEFAULT_AGENT_MODEL)
  })
})

describe('设置弹窗 ↔ 输入框 模型同步', () => {
  it('should show the same model in input box after saving it in settings modal', async () => {
    const { settings, inputModelLabel, openModal, saveModal, selectInModal } =
      mountAgentSettings()

    await openModal()
    await selectInModal('deepseek-v4-pro')
    await saveModal()

    expect(settings.value.model).toBe('deepseek-v4-pro')
    expect(inputModelLabel()).toContain('deepseek-v4-pro')
  })

  it('should show the saved model in settings modal when it is reopened', async () => {
    const { settings, openModal, saveModal, selectInModal, modalSelect } =
      mountAgentSettings()

    await openModal()
    await selectInModal('deepseek-v4-pro')
    await saveModal()

    await openModal()
    expect(settings.value.model).toBe('deepseek-v4-pro')
    expect(modalSelect().value).toBe('deepseek-v4-pro')
  })

  it('should reflect a model picked in the input box when the modal is opened', async () => {
    const { settings, openModal, pickInInput, modalSelect } = mountAgentSettings()

    // 输入框下拉切到 pro（此时弹窗从未打开过，localSettings 仍是初始快照）
    await pickInInput(1)
    expect(settings.value.model).toBe('deepseek-v4-pro')

    await openModal()
    expect(modalSelect().value).toBe('deepseek-v4-pro')
  })

  it('should keep modal model in sync after an unrelated settings save', async () => {
    const { openModal, saveModal, modalSelect } = mountAgentSettings()

    // 先保存一次：改温度、保留默认模型
    await openModal()
    await saveModal()
    await openModal()

    expect(modalSelect().value).toBe(DEFAULT_AGENT_MODEL)
  })
})

describe('输入框模型展示', () => {
  it('should not masquerade an unknown model as another model', async () => {
    const wrapper = mount(ChatInput, {
      props: { streaming: false, deepThinking: false, selectedModel: 'deepseek-flash' },
    })

    // 未知 id 必须如实显示自身，暴露漂移，而不是兜底成 deepseek-v4-pro
    expect(wrapper.find('.chat-input__model-btn').text()).toContain('deepseek-flash')
  })

  it('should only offer models the backend accepts', async () => {
    const wrapper = mount(ChatInput, {
      props: { streaming: false, deepThinking: false, selectedModel: DEFAULT_AGENT_MODEL },
    })

    await wrapper.find('.chat-input__model-btn').trigger('click')
    const offered = wrapper
      .findAll('.chat-input__model-option')
      .map(option => option.text())

    expect(offered).toEqual(BACKEND_ALLOWLIST)
  })
})
