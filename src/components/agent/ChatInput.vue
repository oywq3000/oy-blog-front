<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

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
  { value: 'rookie-ai', label: 'Rookie-AI' },
  { value: 'fast-mode', label: '快速模式' },
]

const selectedModelLabel = computed(
  () => models.find(m => m.value === props.selectedModel)?.label ?? 'Rookie-AI'
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
        >
          🧠
        </button>

        <!-- Upload button (placeholder) -->
        <button class="chat-input__tool-btn" title="上传文件">
          📎
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
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-glass);
    }

    &--active {
      background: rgba(32, 96, 192, 0.1);
      color: var(--color-accent-primary, #2060C0);
    }
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
