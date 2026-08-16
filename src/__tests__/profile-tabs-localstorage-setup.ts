/**
 * 测试前置模块：必须在 store/user 模块初始化之前执行。
 * profile-tabs.test.ts 中作为第一个 import 引入，保证 store 读取 localStorage 时
 * 已有登录用户信息（store 在模块加载时一次性读取 userInfo）。
 */
localStorage.setItem(
  'userInfo',
  JSON.stringify({
    id: 'u1',
    username: 'alice',
    email: 'alice@test.com',
    status: 1,
    bio: '',
    avatarUrl: '',
    emailVerified: false,
    ipAddress: '',
    lastLogin: '',
  }),
)
