import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../locales/en'
import zh from '../locales/zh'
import AuthModal from '../components/AuthModal.vue'

// 必须 mock api/auth：组件挂载与 store/user 都依赖它，避免真实 axios 请求
vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  sendEmailCode: vi.fn(),
  resetPassword: vi.fn(),
  getUserInfo: vi.fn(),
  logout: vi.fn(),
}))
import { resetPassword } from '../api/auth'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, zh },
})

const mountModal = (initialMode: 'login' | 'register' | 'reset' = 'login') =>
  mount(AuthModal, {
    props: { isOpen: true, initialMode },
    global: {
      plugins: [i18n],
      stubs: { Teleport: true, AnimatedTextLogo: true },
    },
  })

describe('AuthModal 忘记密码（reset 模式）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should enter reset view when clicking forgot-password link', async () => {
    const wrapper = mountModal('login')

    await wrapper.find('a.forgot-password').trigger('click')

    expect(wrapper.text()).toContain('Verify your email and set a new password')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Reset Password')
    // reset 模式不显示用户名输入框
    expect(wrapper.find('input[placeholder="Enter your username"]').exists()).toBe(false)
  })

  it('should call resetPassword with full payload when reset form submitted', async () => {
    ;(resetPassword as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: true })
    const wrapper = mountModal('login')
    await wrapper.find('a.forgot-password').trigger('click')

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[maxlength="6"]').setValue('123456')
    const passwordInputs = wrapper.findAll('input[type="password"]')
    await passwordInputs[0].setValue('NewPass123')
    await passwordInputs[1].setValue('NewPass123')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(resetPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      emailCode: '123456',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    })
  })

  it('should return to login form 1.5s after successful reset', async () => {
    ;(resetPassword as any).mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: true })
    const wrapper = mountModal('login')
    await wrapper.find('a.forgot-password').trigger('click')

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[maxlength="6"]').setValue('123456')
    const passwordInputs = wrapper.findAll('input[type="password"]')
    await passwordInputs[0].setValue('NewPass123')
    await passwordInputs[1].setValue('NewPass123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // 提交后 1.5s 自动切回登录模式
    vi.advanceTimersByTime(1500)
    await flushPromises()

    expect(wrapper.find('input[placeholder="Enter your username"]').exists()).toBe(true)
  })

  it('should return to login view when clicking back button in reset mode', async () => {
    const wrapper = mountModal('reset')

    await wrapper.find('.back-btn-corner').trigger('click')

    expect(wrapper.find('input[placeholder="Enter your username"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
  })
})
