<template>
  <div class="avatar-container" :style="{ width: size + 'px', height: size + 'px' }">
    <img v-if="avatar && isAvatarValid" :src="avatar" :alt="alt"
      :class="['avatar-image', { 'avatar-image-error': avatarError }]"
      :style="{ width: size + 'px', height: size + 'px' }" @error="handleImageError" @load="handleImageLoad" />
    <svg v-else xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      class="default-avatar">
      <path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
interface Props {
  size?: number | string
  avatar?: string
  alt?: string
}
const props = withDefaults(defineProps<Props>(), {
  size: 24,
  avatar: '',
  alt: '用户头像'
})
const avatarError = ref(false)
const isAvatarValid = computed(() => {
  if (!props.avatar) return false

  // 检查是否为有效的URL格式
  try {
    const url = new URL(props.avatar)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // 如果不是完整URL，可能是相对路径或base64
    return props.avatar.startsWith('/') ||
      props.avatar.startsWith('data:image') ||
      props.avatar.startsWith('./') ||
      props.avatar.startsWith('../')
  }
})
const handleImageError = () => {
  avatarError.value = true
}
const handleImageLoad = () => {
  avatarError.value = false
}
</script>
<style scoped>
.avatar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f5f5f5;
}

.avatar-image {
  object-fit: cover;
  border-radius: 50%;
}

.avatar-image-error {
  display: none;
}

.default-avatar {
  color: #999;
}
</style>