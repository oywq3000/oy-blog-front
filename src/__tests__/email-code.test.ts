import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEmailCode } from '../composables/useEmailCode'

// ============================================================
// useEmailCode —— 注册验证码发送 + 60s 倒计时逻辑
// ============================================================

describe('useEmailCode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start 60s countdown after successful send', async () => {
    const sendApi = vi.fn().mockResolvedValue({ isSuccess: true })
    const { cooldown, sending, send } = useEmailCode(sendApi)

    expect(cooldown.value).toBe(0)
    await send('a@b.com')

    expect(sendApi).toHaveBeenCalledWith('a@b.com')
    expect(sending.value).toBe(false)
    expect(cooldown.value).toBe(60)

    vi.advanceTimersByTime(1000)
    expect(cooldown.value).toBe(59)
  })

  it('should not resend while cooldown is active', async () => {
    const sendApi = vi.fn().mockResolvedValue({ isSuccess: true })
    const { send } = useEmailCode(sendApi)

    await send('a@b.com')
    await send('a@b.com')

    expect(sendApi).toHaveBeenCalledTimes(1)
  })

  it('should not trigger send concurrently while sending', async () => {
    let resolveSend: (v: unknown) => void
    const sendApi = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveSend = resolve })
    )
    const { send, sending } = useEmailCode(sendApi)

    const first = send('a@b.com')
    expect(sending.value).toBe(true)
    const second = send('a@b.com') // sending 中直接 return
    expect(sendApi).toHaveBeenCalledTimes(1)

    resolveSend!({ isSuccess: true })
    await first
    await second
    expect(sending.value).toBe(false)
  })

  it('should keep cooldown at 0 when send fails', async () => {
    const sendApi = vi.fn().mockRejectedValue(new Error('boom'))
    const { cooldown, sending, send } = useEmailCode(sendApi)

    await expect(send('a@b.com')).rejects.toThrow('boom')
    expect(cooldown.value).toBe(0)
    expect(sending.value).toBe(false)
  })

  it('should reset countdown and stop timer', async () => {
    const sendApi = vi.fn().mockResolvedValue({ isSuccess: true })
    const { cooldown, reset, send } = useEmailCode(sendApi)

    await send('a@b.com')
    expect(cooldown.value).toBe(60)

    reset()
    expect(cooldown.value).toBe(0)

    vi.advanceTimersByTime(3000)
    expect(cooldown.value).toBe(0)
  })
})
