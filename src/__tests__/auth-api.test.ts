import { describe, it, expect, beforeEach } from 'vitest'
import service from '../api/request'
import { sendEmailCode, register, resetPassword } from '../api/auth'

// ============================================================
// 邮箱验证码 API 契约测试（adapter-mock 模式）
// ============================================================

describe('email verification API', () => {
  let calls: any[] = []

  beforeEach(() => {
    localStorage.clear()
    calls = []
    ;(service.defaults as any).adapter = async (config: any) => {
      calls.push(config)
      return {
        data: { isSuccess: true, errCode: 200, errMsg: '成功', data: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
  })

  it('sendEmailCode should POST to send-code endpoint with email body', async () => {
    await sendEmailCode({ email: 'a@b.com' })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/user-service/email/verification/send-code')
    expect(calls[0].method).toBe('post')
    expect(JSON.parse(calls[0].data)).toEqual({ email: 'a@b.com' })
  })

  it('register should pass emailCode through to backend', async () => {
    await register({
      username: 'newuser',
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
      email: 'a@b.com',
      ipAddress: '127.0.0.1',
      emailCode: '123456',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/user-service/auth/register')
    expect(JSON.parse(calls[0].data)).toMatchObject({
      username: 'newuser',
      emailCode: '123456',
    })
  })

  it('resetPassword should POST to password/reset endpoint with full body', async () => {
    await resetPassword({
      email: 'a@b.com',
      emailCode: '123456',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/user-service/auth/password/reset')
    expect(calls[0].method).toBe('post')
    expect(JSON.parse(calls[0].data)).toEqual({
      email: 'a@b.com',
      emailCode: '123456',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    })
  })

  it('sendEmailCode should pass purpose=reset through when provided', async () => {
    await sendEmailCode({ email: 'a@b.com', purpose: 'reset' })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/user-service/email/verification/send-code')
    expect(JSON.parse(calls[0].data)).toEqual({ email: 'a@b.com', purpose: 'reset' })
  })
})
