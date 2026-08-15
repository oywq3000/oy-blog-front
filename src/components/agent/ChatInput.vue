<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'

const props = defineProps<{
  streaming: boolean
  deepThinking: boolean
  selectedModel: string
}>()

const emit = defineEmits<{
  send: [content: string]
  stop: []
  'toggle-deep-thinking': []
  'update:model': [model: string]
}>()

const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const showModelMenu = ref(false)

const models = [
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash'},
]

const selectedModelLabel = computed(
  () => models.find(m => m.value === props.selectedModel)?.label ?? 'deepseek-v4-pro'
)

function autoResize() {
  nextTick(() => {
    const el = textareaRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  })
}

function handleSend() {
  const trimmed = inputText.value.trim()
  if (!trimmed || props.streaming) return
  emit('send', trimmed)
  inputText.value = ''
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.focus()
    }
  })
}

function handleStop() {
  emit('stop')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleInput() {
  autoResize()
}

function selectModel(model: string) {
  emit('update:model', model)
  showModelMenu.value = false
}

// Focus textarea when component mounts
defineExpose({ focus: () => textareaRef.value?.focus() })
</script>

<template>
  <div class="chat-input">
    <!-- Input area -->
    <div class="chat-input__box">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="chat-input__textarea"
        :placeholder="'输入你的问题... (Shift+Enter 换行)'"
        rows="1"
        @keydown="handleKeydown"
        @input="handleInput"
        :disabled="streaming"
      />
    </div>

    <!-- Toolbar -->
    <div class="chat-input__toolbar">
      <div class="chat-input__toolbar-left">
        <!-- Deep thinking toggle -->
        <button
          class="chat-input__tool-btn"
          :class="{ 'chat-input__tool-btn--active': deepThinking }"
          @click="emit('toggle-deep-thinking')"
          :title="deepThinking ? '关闭深度思考' : '开启深度思考'"
          :aria-pressed="deepThinking"
        >
          <!-- Line style (unselected) -->
          <svg class="chat-input__brain-line" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 4C10.1046 4 11 4.89543 11 6V12.8271C10.1058 12.1373 8.96602 11.7305 7.6644 11.5136L7.3356 13.4864C8.71622 13.7165 9.59743 14.1528 10.1402 14.7408C10.67 15.3147 11 16.167 11 17.5C11 18.8807 9.88071 20 8.5 20C7.11929 20 6 18.8807 6 17.5V17.1493C6.43007 17.2926 6.87634 17.4099 7.3356 17.4864L7.6644 15.5136C6.92149 15.3898 6.1752 15.1144 5.42909 14.7599C4.58157 14.3573 4 13.499 4 12.5C4 11.6653 4.20761 11.0085 4.55874 10.5257C4.90441 10.0504 5.4419 9.6703 6.24254 9.47014L7 9.28078V6C7 4.89543 7.89543 4 9 4ZM12 3.35418C11.2671 2.52376 10.1947 2 9 2C6.79086 2 5 3.79086 5 6V7.77422C4.14895 8.11644 3.45143 8.64785 2.94126 9.34933C2.29239 10.2415 2 11.3347 2 12.5C2 14.0652 2.79565 15.4367 4 16.2422V17.5C4 19.9853 6.01472 22 8.5 22C9.91363 22 11.175 21.3482 12 20.3287C12.825 21.3482 14.0864 22 15.5 22C17.9853 22 20 19.9853 20 17.5V16.2422C21.2044 15.4367 22 14.0652 22 12.5C22 11.3347 21.7076 10.2415 21.0587 9.34933C20.5486 8.64785 19.8511 8.11644 19 7.77422V6C19 3.79086 17.2091 2 15 2C13.8053 2 12.7329 2.52376 12 3.35418ZM18 17.1493V17.5C18 18.8807 16.8807 20 15.5 20C14.1193 20 13 18.8807 13 17.5C13 16.167 13.33 15.3147 13.8598 14.7408C14.4026 14.1528 15.2838 13.7165 16.6644 13.4864L16.3356 11.5136C15.034 11.7305 13.8942 12.1373 13 12.8271V6C13 4.89543 13.8954 4 15 4C16.1046 4 17 4.89543 17 6V9.28078L17.7575 9.47014C18.5581 9.6703 19.0956 10.0504 19.4413 10.5257C19.7924 11.0085 20 11.6653 20 12.5C20 13.499 19.4184 14.3573 18.5709 14.7599C17.8248 15.1144 17.0785 15.3898 16.3356 15.5136L16.6644 17.4864C17.1237 17.4099 17.5699 17.2926 18 17.1493Z"/></svg>
          <!-- Filled flat design (selected) -->
          <svg class="chat-input__brain-fill" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 2.53513C10.4117 2.19479 9.72857 2 9 2 6.79086 2 5 3.79086 5 6V7.77422C4.14895 8.11644 3.45143 8.64785 2.94126 9.34933 2.29239 10.2415 2 11.3347 2 12.5 2 14.0614 2.79529 15.4356 4 16.242V17.5C4 19.9853 6.01472 22 8.5 22 9.42507 22 10.285 21.7209 11 21.2422V17.5C11 16.167 10.67 15.3147 10.1402 14.7408 9.59743 14.1528 8.71622 13.7165 7.3356 13.4864L7.6644 11.5136C8.96602 11.7305 10.1058 12.1373 11 12.8271V2.53513ZM13 2.53513V12.8271C13.8942 12.1373 15.034 11.7305 16.3356 11.5136L16.6644 13.4864C15.2838 13.7165 14.4026 14.1528 13.8598 14.7408 13.33 15.3147 13 16.167 13 17.5V21.2422C13.715 21.7209 14.5749 22 15.5 22 17.9853 22 20 19.9853 20 17.5V16.242C21.2047 15.4356 22 14.0614 22 12.5 22 11.3347 21.7076 10.2415 21.0587 9.34933 20.5486 8.64785 19.8511 8.11644 19 7.77422V6C19 3.79086 17.2091 2 15 2 14.2714 2 13.5883 2.19479 13 2.53513Z"/></svg>
        </button>

        <!-- Upload button (placeholder) -->
        <button class="chat-input__tool-btn" title="上传文件">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"/></svg>
        </button>

        <!-- Model selector -->
        <div class="chat-input__model-selector">
          <button
            class="chat-input__model-btn"
            @click="showModelMenu = !showModelMenu"
          >
            模型: {{ selectedModelLabel }} ▼
          </button>
          <div v-if="showModelMenu" class="chat-input__model-menu">
            <button
              v-for="m in models"
              :key="m.value"
              class="chat-input__model-option"
              :class="{ 'chat-input__model-option--active': m.value === selectedModel }"
              @click="selectModel(m.value)"
            >
              {{ m.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="chat-input__toolbar-right">
        <!-- Send / Stop button -->
        <button
          v-if="!streaming"
          class="chat-input__send-btn"
          :disabled="!inputText.trim()"
          @click="handleSend"
          title="发送 (Enter)"
        >
          →
        </button>
        <button
          v-else
          class="chat-input__stop-btn"
          @click="handleStop"
          title="停止生成"
        >
          ■
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.chat-input {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-primary);

  &__box {
    display: flex;
    gap: 8px;
  }

  &__textarea {
    flex: 1;
    resize: none;
    min-height: 44px;
    max-height: 200px;
    padding: 12px 16px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-primary);
    font-family: $font-family-main;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus {
      border-color: var(--color-accent-primary, #2060C0);
      box-shadow: 0 0 0 3px rgba(32, 96, 192, 0.1);
    }

    &::placeholder {
      color: var(--color-text-muted, #94a3b8);
    }

    &:disabled {
      opacity: 0.7;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    gap: 12px;
  }

  &__toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__toolbar-right {
    display: flex;
    align-items: center;
  }

  &__tool-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: var(--color-text-muted, #94a3b8);

    svg {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background: var(--color-bg-glass);
      color: var(--color-text-secondary);
    }

    &--active {
      background: rgba(32, 96, 192, 0.1);
      color: var(--color-accent-primary, #2060C0);

      &:hover {
        background: rgba(32, 96, 192, 0.16);
        color: var(--color-accent-primary, #2060C0);
      }
    }
  }

  // Brain icon: line framework when idle, filled flat design when active
  &__brain-fill {
    display: none;
  }

  &__tool-btn--active &__brain-line {
    display: none;
  }

  &__tool-btn--active &__brain-fill {
    display: block;
  }

  &__model-selector {
    position: relative;
  }

  &__model-btn {
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    background: transparent;
    border-radius: 6px;
    font-size: 12px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-secondary);
    }
  }

  &__model-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 4px;
    background: var(--color-dropdown-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 20;
    min-width: 150px;
    overflow: hidden;
  }

  &__model-option {
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--color-text-primary);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;

    &:hover {
      background: var(--color-bg-secondary);
    }

    &--active {
      color: var(--color-accent-primary, #2060C0);
      font-weight: 600;
    }
  }

  &__send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--color-accent-primary, #2060C0);
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    &:disabled {
      background: var(--color-btn-disabled-bg);
      color: var(--color-text-muted, #94a3b8);
      cursor: not-allowed;
    }
  }

  &__stop-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #EF4444;
    color: white;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: #DC2626;
    }
  }
}
</style>
