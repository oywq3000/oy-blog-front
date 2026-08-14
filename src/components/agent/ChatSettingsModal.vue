<script setup lang="ts">
import { ref } from 'vue'
import type { ChatSettings } from '../../types/agent'

const props = defineProps<{
  settings: ChatSettings
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [settings: ChatSettings]
}>()

const localSettings = ref<ChatSettings>({ ...props.settings })

const models = [
  { value: 'rookie-ai', label: 'Rookie-AI (默认)' },
  { value: 'fast-mode', label: '快速模式' },
]

function handleSave() {
  emit('save', { ...localSettings.value })
  emit('close')
}

function handleClose() {
  localSettings.value = { ...props.settings }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="settings-overlay" @click.self="handleClose">
      <div class="settings-modal">
        <div class="settings-modal__header">
          <h2 class="settings-modal__title">AI 助手设置</h2>
          <button class="settings-modal__close" @click="handleClose">✕</button>
        </div>

        <div class="settings-modal__body">
          <!-- Model selection -->
          <div class="settings-field">
            <label class="settings-field__label">模型选择</label>
            <select v-model="localSettings.model" class="settings-field__select">
              <option v-for="m in models" :key="m.value" :value="m.value">
                {{ m.label }}
              </option>
            </select>
          </div>

          <!-- Temperature -->
          <div class="settings-field">
            <label class="settings-field__label">
              温度: {{ localSettings.temperature.toFixed(1) }}
            </label>
            <input
              type="range"
              v-model.number="localSettings.temperature"
              min="0"
              max="2"
              step="0.1"
              class="settings-field__range"
            />
            <div class="settings-field__range-labels">
              <span>精确 0</span>
              <span>平衡 1.0</span>
              <span>创造 2.0</span>
            </div>
          </div>

          <!-- Deep thinking -->
          <div class="settings-field settings-field--toggle">
            <div class="settings-field__toggle-info">
              <label class="settings-field__label">深度思考</label>
              <p class="settings-field__hint">开启后 AI 会展示思考过程，但回复会变慢</p>
            </div>
            <label class="settings-toggle">
              <input
                type="checkbox"
                v-model="localSettings.deepThinking"
                class="settings-toggle__input"
              />
              <span class="settings-toggle__slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-modal__footer">
          <button class="settings-btn settings-btn--secondary" @click="handleClose">
            取消
          </button>
          <button class="settings-btn settings-btn--primary" @click="handleSave">
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.settings-modal {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 18px;
    cursor: pointer;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
  }

  &__body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid var(--color-border);
  }
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--toggle {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  &__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__hint {
    font-size: 12px;
    color: var(--color-text-muted, #94a3b8);
    margin: 2px 0 0;
  }

  &__select {
    height: 40px;
    padding: 0 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-input-bg);
    color: var(--color-text-primary);
    font-size: 14px;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: var(--color-accent-primary, #2060C0);
    }
  }

  &__range {
    width: 100%;
    accent-color: var(--color-accent-primary, #2060C0);
  }

  &__range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--color-text-muted, #94a3b8);
  }
}

.settings-toggle {
  position: relative;
  width: 48px;
  height: 26px;
  flex-shrink: 0;

  &__input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__slider {
    position: absolute;
    inset: 0;
    background: var(--color-border);
    border-radius: 26px;
    cursor: pointer;
    transition: background 0.2s;

    &::before {
      content: '';
      position: absolute;
      width: 22px;
      height: 22px;
      left: 2px;
      top: 2px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
  }

  &__input:checked + &__slider {
    background: var(--color-accent-primary, #2060C0);

    &::before {
      transform: translateX(22px);
    }
  }
}

.settings-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &--primary {
    background: var(--color-accent-primary, #2060C0);
    color: white;
    border: none;

    &:hover {
      filter: brightness(1.1);
    }
  }

  &--secondary {
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);

    &:hover {
      background: var(--color-bg-secondary);
    }
  }
}
</style>
