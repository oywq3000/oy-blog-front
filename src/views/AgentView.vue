<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NavBar from '../components/NavBar.vue'
import ChatSidebar from '../components/agent/ChatSidebar.vue'
import ChatWelcome from '../components/agent/ChatWelcome.vue'
import ChatMessageList from '../components/agent/ChatMessageList.vue'
import ChatInput from '../components/agent/ChatInput.vue'
import ChatSettingsModal from '../components/agent/ChatSettingsModal.vue'
import { useAgentChat } from '../composables/useAgentChat'
import { useToast } from '../composables/useToast'
import { submitFeedback } from '../api/agent'

const {
  conversations,
  activeConversationId,
  streaming,
  deepThinking,
  loading,
  sidebarSearch,
  settings,
  suggestedQuestions,
  activeMessages,
  createConversation,
  deleteConversation,
  renameConversation,
  switchConversation,
  loadConversations,
  sendMessage,
  stopStreaming,
  resendMessage,
  toggleDeepThinking,
  setModel,
  clearAllConversations,
  updateSettings,
  loadSuggestedQuestions,
} = useAgentChat()

const { addToast } = useToast()

// Settings modal state
const showSettings = ref(false)

// Sidebar visibility (for mobile drawer)
const sidebarVisible = ref(false)

onMounted(() => {
  loadConversations()
  loadSuggestedQuestions()
})

// New conversation
function handleNewConversation() {
  createConversation()
}

// Select conversation
function handleSelectConversation(id: string) {
  switchConversation(id)
}

// Handle rename
function handleRenameConversation(id: string, title: string) {
  renameConversation(id, title)
}

// Handle delete
function handleDeleteConversation(id: string) {
  deleteConversation(id)
}

// Handle clear all
function handleClearAll() {
  clearAllConversations()
}

// Handle send message
async function handleSend(content: string) {
  await sendMessage(content)
}

// Handle stop
function handleStop() {
  stopStreaming()
}

// Handle suggested question click
function handleQuestionClick(text: string) {
  handleSend(text)
}

// Handle resend
async function handleResend(messageId: string) {
  await resendMessage(messageId)
}

// Handle copy
function handleCopy(_content: string) {
  addToast('已复制', 'success', 2000)
}

// Handle feedback
function handleFeedback(messageId: string, type: 'like' | 'dislike') {
  submitFeedback(messageId, type).catch(() => {})
}

// Handle settings save
function handleSettingsSave(newSettings: typeof settings.value) {
  updateSettings(newSettings)
  addToast('设置已保存', 'success', 2000)
}

// Toggle sidebar on mobile
function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}
</script>

<template>
  <div class="agent-page">
    <NavBar />

    <div class="agent-layout">
      <!-- Sidebar -->
      <ChatSidebar
        :conversations="conversations"
        :active-conversation-id="activeConversationId"
        :search-query="sidebarSearch"
        :loading="loading"
        @update:search-query="sidebarSearch = $event"
        @new-conversation="handleNewConversation"
        @select-conversation="handleSelectConversation"
        @rename-conversation="handleRenameConversation"
        @delete-conversation="handleDeleteConversation"
        @clear-all="handleClearAll"
        @open-settings="showSettings = true"
      />

      <!-- Mobile sidebar toggle -->
      <button class="agent-page__sidebar-toggle" @click="toggleSidebar">
        ☰
      </button>

      <!-- Main chat area -->
      <main class="chat-main">
        <!-- Welcome page (no active conversation) -->
        <ChatWelcome
          v-if="!activeConversationId"
          :suggested-questions="suggestedQuestions"
          @question-click="handleQuestionClick"
        />

        <!-- Message list -->
        <ChatMessageList
          v-else
          :messages="activeMessages"
          :streaming="streaming"
          @copy="handleCopy"
          @resend="handleResend"
          @feedback="handleFeedback"
        />

        <!-- Input area (always visible at bottom) -->
        <ChatInput
          :streaming="streaming"
          :deep-thinking="deepThinking"
          :selected-model="settings.model"
          @send="handleSend"
          @stop="handleStop"
          @toggle-deep-thinking="toggleDeepThinking"
          @update:model="setModel"
        />
      </main>
    </div>

    <!-- Settings modal -->
    <ChatSettingsModal
      :settings="settings"
      :is-open="showSettings"
      @close="showSettings = false"
      @save="handleSettingsSave"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.agent-page {
  // 必须是确定高度而非 min-height：高度不定时子元素 flex-basis: 0%
  // 会按 CSS 规范退化为内容尺寸，整条 flex 链被消息撑开，页面随消息增长
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
}

.agent-layout {
  display: flex;
  flex: 1; // 高度由 .agent-page 的确定高度分配而来，无需再声明 height
  padding-top: 60px; // NavBar height
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  position: relative;
}

// Mobile sidebar toggle button
.agent-page__sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  align-items: center;
  justify-content: center;
}

// Responsive
@media (max-width: 767px) {
  .agent-page__sidebar-toggle {
    display: flex;
  }

  .agent-layout {
    // On mobile, sidebar is hidden by default
    // Will be implemented as a slide-out drawer in a future iteration
  }
}
</style>
