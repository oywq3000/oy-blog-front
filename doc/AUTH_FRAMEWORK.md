# oy-blog 前端鉴权框架文档

> 版本: 1.0
> 更新日期: 2026-07-21
> 适用分支: master

---

## 目录

1. [架构概览](#1-架构概览)
2. [后端接口约定](#2-后端接口约定)
3. [HTTP 请求层](#3-http-请求层)
4. [API 函数层](#4-api-函数层)
5. [状态管理层](#5-状态管理层)
6. [路由层](#6-路由层)
7. [应用初始化流程](#7-应用初始化流程)
8. [UI 组件层](#8-ui-组件层)
9. [Token 完整生命周期](#9-token-完整生命周期)
10. [用户状态模型](#10-用户状态模型)
11. [国际化支持](#11-国际化支持)
12. [安全特性与边界](#12-安全特性与边界)
13. [文件清单](#13-文件清单)

---

## 1. 架构概览

项目采用 **前后端分离** 架构，前端为 Vue 3 SPA，后端为 Spring Boot + Sa-Token。鉴权体系横跨以下层次：

```
┌──────────────────────────────────────────────────────────┐
│                      UI 组件层                            │
│  AuthModal / NavBar / AuthDropdown / UserProfile         │
│  EmailVerification / CookieNotice                        │
├──────────────────────────────────────────────────────────┤
│                      路由层                               │
│  Vue Router (无鉴权路由守卫，页面公开访问)                   │
├──────────────────────────────────────────────────────────┤
│                    状态管理层                              │
│  useUserStore (reactive 响应式状态)                        │
│  持久化: localStorage(token + userInfo)                   │
├──────────────────────────────────────────────────────────┤
│                     API 函数层                             │
│  auth.ts / user.ts / upload.ts                            │
│  DTO 类型定义 & 接口封装                                   │
├──────────────────────────────────────────────────────────┤
│                    HTTP 请求层                             │
│  Axios 实例 (request.ts)                                  │
│  请求拦截器: 注入 Bearer Token + lang header               │
│  响应拦截器: 统一错误处理 + 401 静默处理 + Toast            │
├──────────────────────────────────────────────────────────┤
│                    后端服务                                │
│  Spring Boot + Sa-Token                                   │
│  API 前缀: /api/user-service                              │
└──────────────────────────────────────────────────────────┘
```

**核心技术栈**:

- Vue 3 (Composition API + `<script setup>`)
- TypeScript
- Axios (HTTP 客户端)
- Vue Router 4 (路由)
- Vue I18n (国际化)
- 自定义 reactive 状态管理 (非 Pinia，基于 `reactive()` + 工厂函数模式)

---

## 2. 后端接口约定

### 2.1 Base URL

```
/api/user-service
```

Vite 开发代理将 `/api` 转发到后端服务（配置于 [vite.config.ts](../vite.config.ts)）。

### 2.2 通用响应格式

所有接口返回统一结构：

```typescript
// 通用成功/失败响应
interface ResultObject {
  errCode: number;    // 错误码，0 表示成功
  errMsg: string;     // 错误信息
  isSuccess: boolean; // 业务是否成功
  data: any;          // 响应数据
}

// 带泛型的响应
interface ResultSaTokenInfo {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: SaTokenInfo;
}
```

### 2.3 鉴权相关接口一览

| 方法 | 路径                                   | 说明             | 需认证 |
| ---- | -------------------------------------- | ---------------- | ------ |
| POST | `/auth/login`                        | 用户登录         | 否     |
| POST | `/auth/register`                     | 用户注册         | 否     |
| POST | `/auth/logout`                       | 用户登出         | 是     |
| POST | `/auth/password/update`              | 修改密码         | 是     |
| GET  | `/profile/info`                      | 获取当前用户信息 | 是     |
| POST | `/profile/update`                    | 更新个人资料     | 是     |
| POST | `/profile/avatar`                    | 上传头像         | 是     |
| GET  | `/profile/public/:userId`            | 获取用户公开信息 | 否     |
| GET  | `/profile/public/simple/:userId`     | 获取用户简明信息 | 否     |
| GET  | `/profile/public/username/:userId`   | 通过ID获取用户名 | 否     |
| GET  | `/email/verification/status`         | 查询邮箱验证状态 | 是     |
| POST | `/email/verification/request`        | 请求发送验证邮件 | 是     |
| POST | `/email/verification/confirm?token=` | 确认邮箱验证     | 否     |

### 2.4 登录响应 (SaTokenInfo)

```typescript
interface SaTokenInfo {
  accessToken: string;         // Bearer Token
  tokenType: number;           // Token 类型
  expiresIn: number;           // Token 有效期 (秒)
  refreshToken: number;        // 刷新 Token
  refreshTokenExpiresIn: number; // 刷新 Token 有效期 (秒)
  userId: string;              // 用户 ID
}
```

### 2.5 用户信息响应 (UserDto)

```typescript
interface UserDto {
  id: string;
  username: string;
  email: string;
  status: number;       // 0=禁用, 1=正常, 2=游客
  avatarUrl: string;
  bio?: string;
  emailVerified: boolean;
  ipAddress: string;
  lastLogin: string;
}
```

---

## 3. HTTP 请求层

文件: [src/api/request.ts](../src/api/request.ts)

### 3.1 Axios 实例配置

```typescript
const service = axios.create({
  baseURL: '',           // 空 — 由 Vite proxy 处理 /api 前缀
  timeout: 10000,        // 10 秒超时
  withCredentials: true, // 允许携带 Cookie
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 3.2 请求拦截器

每次请求自动执行：

1. **Token 注入**: 从 `localStorage.getItem('token')` 读取 token，若存在则设置 `Authorization: Bearer ${token}` 请求头
2. **语言标记**: 根据 `i18n.global.locale` 设置 `lang` 请求头（值为 `zh` 或 `en`）

```typescript
service.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const currentLocale = i18n.global.locale.value;
  config.headers['lang'] = currentLocale === 'zh' ? 'zh' : 'en';
  return config;
});
```

### 3.3 响应拦截器

#### 成功响应处理

- 检查 `isSuccess` 字段：若为 `false`，将 `errMsg` 构造成 Error 并 reject
- 若 `isSuccess === true`，直接透传响应数据

#### 错误响应处理

- 提取服务端错误信息（优先级: `errMsg` → `message` → `error.message`）
- **401 特殊处理**: 不弹出 Toast 通知（未登录是预期状态）
- **其他错误**: 输出控制台日志 + 调用 `useToast().addToast()` 显示错误通知

```typescript
if (error.response && error.response.status !== 401) {
  console.error('API Error:', customError);
  const { addToast } = useToast();
  addToast(errMsg, 'error', 5000);
}
```

---

## 4. API 函数层

### 4.1 认证 API

文件: [src/api/auth.ts](../src/api/auth.ts)

```typescript
// 登录
login(data: LoginDto) → Promise<ResultSaTokenInfo>

// 注册
register(data: RegisterDto) → Promise<ResultObject>

// 登出
logout() → Promise<ResultObject>

// 修改密码
updatePassword(data: UpdatePasswordDto) → Promise<ResultObject>

// 获取当前用户信息
getUserInfo() → Promise<ResultUserDto>

// 更新个人资料
updateUserInfo(data: UpdateProfileDto) → Promise<ResultObject>
```

### 4.2 邮箱验证 API

```typescript
// 查询验证状态
getEmailVerificationStatus() → Promise<ResultBoolean>

// 请求发送验证邮件
requestEmailVerification() → Promise<ResultObject>

// 确认验证 (token 由邮件链接携带)
confirmEmailVerification(token: string) → Promise<ResultObject>
```

### 4.3 用户公开信息 API

文件: [src/api/user.ts](../src/api/user.ts)

```typescript
// 获取用户公开资料
getUserPublicProfile(userId: string) → Promise<any>

// 获取用户简明信息 (name + avatar)
getSimpleUserProfile(userId: string) → Promise<SimpleUserProfileResult>
```

### 4.4 文件上传 API

文件: [src/api/upload.ts](../src/api/upload.ts)

```typescript
// 上传头像 (Content-Type: multipart/form-data)
uploadAvatar(file: File) → Promise<ResultString>

// 上传文章封面
uploadCover(file: File) → Promise<ResultString>

// 上传文章内容图片
uploadContentImage(file: File) → Promise<ResultString>
```

### 4.5 DTO 类型定义

```typescript
interface LoginDto {
  username: string;
  password: string;
  ipAddress: string;    // 当前固定传 '127.0.0.1'
}

interface RegisterDto {
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  ipAddress?: string;
}

interface UpdatePasswordDto {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UpdateProfileDto {
  username?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
}
```

---

## 5. 状态管理层

文件: [src/store/user.ts](../src/store/user.ts)

### 5.1 状态定义

项目采用 **Vue reactive() + 工厂函数** 模式（非 Pinia），每次调用 `useUserStore()` 返回单例状态引用：

```typescript
interface UserState {
  userInfo: UserInfo | null;
  loading: boolean;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  status: number;       // 0=禁用, 1=正常, 2=游客
  bio?: string;
  avatarUrl: string;
  emailVerified: boolean;
  ipAddress: string;
  lastLogin: string;
}
```

### 5.2 初始化

```typescript
const state = reactive<UserState>({
  // 从 localStorage 恢复用户信息（实现页面刷新后状态持久化）
  userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null'),
  loading: false,
});
```

### 5.3 计算属性

| 属性           | 类型                             | 说明                                   |
| -------------- | -------------------------------- | -------------------------------------- |
| `isLoggedIn` | `ComputedRef<boolean>`         | `!!state.userInfo` — 是否有用户信息 |
| `user`       | `ComputedRef<UserInfo \| null>` | 当前用户信息的响应式引用               |

### 5.4 核心方法

#### fetchUserInfo()

```typescript
const fetchUserInfo = async () => {
  // 1. 调用 GET /profile/info
  // 2. 成功 且 status != 2 (非游客) → 更新 state.userInfo + 写入 localStorage
  // 3. 401 错误 → 清除 state.userInfo + 清除 localStorage userInfo
  // 4. 其他错误 (如网络错误) → 静默忽略, 保持当前状态不动
};
```

**关键逻辑**: `status == 2`（游客）的用户虽然能获取到信息，但被视为*未登录*，`isLoggedIn` 为 `false`。

#### clearUser()

```typescript
const clearUser = () => {
  state.userInfo = null;
  localStorage.removeItem('userInfo');
  localStorage.removeItem('token');      // 同时清除 token
};
```

#### logoutUser()

```typescript
const logoutUser = async () => {
  // 1. 调用 POST /auth/logout (通知服务端使 token 失效)
  // 2. 无论 API 调用是否成功, 都执行 clearUser() 清除本地状态
};
```

### 5.5 持久化数据 (localStorage)

| Key          | 内容                         | 写入时机                 | 清除时机                                     |
| ------------ | ---------------------------- | ------------------------ | -------------------------------------------- |
| `token`    | `accessToken` 字符串       | 登录成功                 | `clearUser()` / `logoutUser()`           |
| `userInfo` | `JSON.stringify(UserInfo)` | `fetchUserInfo()` 成功 | `clearUser()` / `fetchUserInfo()` 遇 401 |

---

## 6. 路由层

文件: [src/router/index.ts](../src/router/index.ts)

### 6.1 路由配置

```typescript
const routes = [
  { path: '/',              name: 'home',           component: HomeView },
  { path: '/article/:id',   name: 'article-detail',  component: ArticleDetail },
  { path: '/search',        name: 'search',          component: SearchPage },
  { path: '/profile',       name: 'profile',         component: UserProfile },
  { path: '/editor',        name: 'editor',          component: ArticleEditor },
  { path: '/email/verify',  name: 'email-verify',    component: EmailVerification },
  { path: '/privacy',       name: 'privacy',         component: PrivacyPolicy },
  { path: '/terms',         name: 'terms',           component: TermsOfService },
  { path: '/security',      name: 'security',        component: SecurityPolicy },
  { path: '/about',         name: 'about',           component: AboutView },
  { path: '/:pathMatch(.*)*', name: 'not-found',     component: NotFoundView },
];
```

### 6.2 路由守卫

**当前项目没有鉴权路由守卫**。所有页面公开可访问，鉴权在 API 层面进行：

- `router.beforeEach`: 仅设置全局加载状态（`startLoading()` + 记录时间戳）
- `router.afterEach`: 停止加载动画（保证最少显示 600ms）

若需要添加路由鉴权，可在 `beforeEach` 中检查 `useUserStore().isLoggedIn` 并重定向。

### 6.3 权限敏感页面

以下页面虽然在路由上公开，但内容依赖登录状态：

| 页面              | 未登录时行为                               |
| ----------------- | ------------------------------------------ |
| `/profile`      | 显示空白 / 访客状态卡片                    |
| `/editor`       | 应在内部进行鉴权判断（组件内未做强制拦截） |
| `/email/verify` | 通过 URL query`?token=` 获取验证令牌     |

---

## 7. 应用初始化流程

文件: [src/App.vue](../src/App.vue), [src/main.ts](../src/main.ts)

### 7.1 引导序列

```
main.ts
  │
  ├─ createApp(App)
  ├─ .use(router)       // 安装路由
  ├─ .use(i18n)         // 安装国际化
  └─ .mount('#app')
       │
       ▼
App.vue <script setup>
  │
  ├─ startLoading()           // 显示全局加载动画
  ├─ onMounted():
  │   ├─ initTheme()          // 初始化主题
  │   ├─ fetchUserInfo()      // 恢复用户会话 (关键步骤!)
  │   └─ stopLoading()        // 关闭加载动画
  │       (首页延迟关闭, 等待标题动画完成或 5s 超时)
  └─ watch(locale):
      └─ localStorage.setItem('locale', ...)
```

### 7.2 会话恢复机制

1. 应用启动 → `useUserStore()` 初始化，`state.userInfo` 从 `localStorage.getItem('userInfo')` 还原
2. `fetchUserInfo()` 调用后端 `/profile/info` 验证 token 有效性
3. 服务端验证通过 → 更新 `userInfo`，更新 localStorage
4. 服务端返回 401 → token 已失效，清除 localStorage 中的 token 和 userInfo
5. 网络错误 → 保留现有 localStorage 数据，UI 保持稳定

---

## 8. UI 组件层

### 8.1 组件关系图

```
NavBar
├── Logo / TextLogo
├── 搜索框
├── 语言切换按钮
├── 登录按钮 (未登录时) ──→ AuthModal
│                            ├── 密码登录
│                            ├── 微信登录 (mock)
│                            └── 注册
└── 用户头像胶囊 (已登录时)
    ├── 用户名 + 头像
    └── 下拉菜单
        ├── 个人中心 (/profile)
        └── 退出登录
```

### 8.2 AuthModal

文件: [src/components/AuthModal.vue](../src/components/AuthModal.vue)

**功能**:

- 双模式切换：登录 / 注册
- 登录方式：密码登录 + 微信登录 (mock 模拟)
- 表单验证：前端校验必填字段、密码一致性
- 成功状态动画：绿色对勾 → 自动关闭

**登录流程**:

```
用户提交表单
  → 调用 login(dto)
  → 获取 SaTokenInfo.accessToken
  → localStorage.setItem('token', accessToken)
  → 显示成功动画 (1.5s)
  → emit('success') + emit('close')
  → 调用 fetchUserInfo() 获取完整用户信息
```

**注册流程**:

```
用户提交表单
  → 调用 register(dto)
  → 成功 → 显示 "账号已创建" 动画 (1.5s)
  → 自动切换到登录模式
```

**微信登录流程 (mock)**:

```
点击微信登录
  → 显示 QR 码占位图
  → 3 秒模拟扫码
  → 进入"设置密码"步骤
  → 提交 → 模拟 API → 成功
```

### 8.3 NavBar

文件: [src/components/NavBar.vue](../src/components/NavBar.vue)

**登录状态相关逻辑**:

```typescript
const { isLoggedIn, user, logoutUser } = useUserStore();

// 菜单项：编辑器和个人中心仅在登录后显示
const menuItems = computed(() => {
  const items = [
    { name: 'nav.home', link: '/' },
    { name: 'nav.articles', link: '/search' }
  ];
  if (isLoggedIn.value) {
    items.push({ name: 'nav.editor', link: '/editor' });
    items.push({ name: 'nav.profile', link: '/profile' });
  }
  return items;
});
```

**退出登录**:

```typescript
const handleLogout = async () => {
  await logoutUser();          // 调用 API + 清除本地状态
  isUserDropdownOpen.value = false;
  isMenuOpen.value = false;
  router.push('/');            // 重定向到首页
};
```

### 8.4 AuthDropdown

文件: [src/components/AuthDropdown.vue](../src/components/AuthDropdown.vue)

未登录用户的入口组件，提供 "Account" 下拉菜单，包含 Login / Register 两个选项，通过 `emit()` 向上传递事件。

### 8.5 UserProfile

文件: [src/views/UserProfile.vue](../src/views/UserProfile.vue)

**鉴权相关功能**:

- **个人资料编辑**: 修改用户名、bio、头像 URL / 上传头像
- **邮箱验证**: 发送验证邮件 → 邮件链接 → EmailVerification 页面确认
- **密码修改**: 含强度校验 (大小写字母 + 数字 + 8 位以上)
- **外观设置**: 主题偏好（浅色 / 深色 / 跟随系统）

### 8.6 EmailVerification

文件: [src/views/EmailVerification.vue](../src/views/EmailVerification.vue)

从邮件链接跳转（携带 `?token=`），调用 `confirmEmailVerification(token)`，成功后刷新用户信息并 3 秒后跳转到个人中心。

---

## 9. Token 完整生命周期

```
┌─────────────────────────────────────────────────────────────────┐
│                       TOKEN 生命周期                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ① 用户登录                                                      │
│     AuthModal.handleSubmit()                                     │
│     → POST /auth/login { username, password, ipAddress }        │
│     ← SaTokenInfo { accessToken, expiresIn, ... }                │
│     → localStorage.setItem('token', accessToken)                │
│     → fetchUserInfo() // 获取用户详情                            │
│                                                                  │
│  ② 后续 API 请求                                                 │
│     request.interceptors.request                                 │
│     → const token = localStorage.getItem('token')               │
│     → config.headers['Authorization'] = `Bearer ${token}`       │
│     → 发送请求                                                   │
│                                                                  │
│  ③ 应用启动恢复                                                   │
│     useUserStore 初始化                                          │
│     → state.userInfo = JSON.parse(localStorage['userInfo'])     │
│     → App.onMounted → fetchUserInfo() 验证 token                  │
│                                                                  │
│  ④ Token 过期处理                                                │
│     后端返回 401                                                 │
│     → response interceptor 静默处理 (不弹 Toast)                  │
│     → fetchUserInfo() 捕获 401 → clearUser()                    │
│     → localStorage.removeItem('token')                          │
│     → localStorage.removeItem('userInfo')                       │
│                                                                  │
│  ⑤ 用户登出                                                      │
│     NavBar.handleLogout()                                        │
│     → logoutUser()                                               │
│       → POST /auth/logout (通知服务端销毁 token)                  │
│       → clearUser() (清除本地状态)                                │
│       → router.push('/')                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**注意**: 前端当前**未实现 refreshToken 自动刷新机制**，`refreshToken` 字段在登录响应中存在但未在客户端使用。

---

## 10. 用户状态模型

### 10.1 用户状态枚举 (status)

| 值 | 含义             | isLoggedIn | 说明                                           |
| -- | ---------------- | ---------- | ---------------------------------------------- |
| 0  | 禁用 (forbidden) | false      | 账号被禁用，fetchUserInfo 返回后不会写入 store |
| 1  | 正常 (normal)    | true       | 正常登录用户                                   |
| 2  | 游客 (guest)     | false      | 游客身份，视为未登录                           |

关键代码逻辑:

```typescript
// fetchUserInfo() 中的状态判断
if (res.isSuccess && res.data && res.data.status != 2) {
  state.userInfo = res.data;
  localStorage.setItem('userInfo', JSON.stringify(res.data));
}
```

### 10.2 邮箱验证状态

| 状态   | emailVerified | 含义                   |
| ------ | ------------- | ---------------------- |
| 未验证 | false         | 注册后默认状态         |
| 已验证 | true          | 点击邮件验证链接确认后 |

---

## 11. 国际化支持

项目使用 Vue I18n 实现中英文双语支持。鉴权相关的 i18n key 如下：

### 11.1 auth 命名空间

| Key                          | 英文                      | 中文           |
| ---------------------------- | ------------------------- | -------------- |
| `auth.login`               | Login                     | 登录           |
| `auth.signIn`              | Sign In                   | 登录           |
| `auth.signUp`              | Sign Up                   | 注册           |
| `auth.processing`          | Processing...             | 处理中...      |
| `auth.fillAll`             | Please fill in all fields | 请填写所有字段 |
| `auth.passwordsDoNotMatch` | Passwords do not match    | 密码不匹配     |
| `auth.welcomeBackExcl`     | Welcome Back!             | 欢迎回来！     |
| `auth.accountCreated`      | Account Created!          | 账户已创建！   |
| `auth.username`            | Username                  | 用户名         |
| `auth.email`               | Email Address             | 电子邮件地址   |
| `auth.password`            | Password                  | 密码           |
| `auth.confirmPassword`     | Confirm Password          | 确认密码       |
| `auth.forgotPassword`      | Forgot Password?          | 忘记密码？     |

### 11.2 profile 命名空间

| Key                          | 英文                         | 中文             |
| ---------------------------- | ---------------------------- | ---------------- |
| `profile.guest`            | Guest                        | 访客             |
| `profile.editProfile`      | Edit Profile                 | 编辑资料         |
| `profile.verified`         | Verified                     | 已验证           |
| `profile.unverified`       | Unverified                   | 未验证           |
| `profile.sendVerification` | Send Verification Email      | 发送验证邮件     |
| `profile.changePassword`   | Change Password              | 修改密码         |
| `profile.updatePassword`   | Update Password              | 更新密码         |
| `profile.updateSuccess`    | Profile updated successfully | 个人资料更新成功 |

### 11.3 verify 命名空间

| Key                     | 英文                         | 中文                |
| ----------------------- | ---------------------------- | ------------------- |
| `verify.verifying`    | Verifying your email...      | 正在验证您的邮箱... |
| `verify.success`      | Email verified successfully! | 邮箱验证成功！      |
| `verify.failed`       | Verification failed...       | 验证失败...         |
| `verify.invalidToken` | Invalid verification link    | 无效的验证链接      |

---

## 12. 安全特性与边界

### 12.1 已实现

| 特性         | 实现方式                                            |
| ------------ | --------------------------------------------------- |
| Token 传输   | `Authorization: Bearer <token>` 请求头，非 Cookie |
| Cookie 支持  | `withCredentials: true`，支持服务端 Set-Cookie    |
| 客户端持久化 | localStorage 存储 token 和 userInfo                 |
| 401 静默处理 | 不向用户弹窗提示（避免未登录时干扰）                |
| 服务端登出   | logout API 通知后端销毁 token                       |
| 密码强度校验 | 前端校验：大小写字母 + 数字 + 8 位以上              |
| 邮箱验证     | 邮件链接 token → 服务端确认验证                    |
| 语言感知     | 通过`lang` header 传递当前语言偏好                |

### 12.2 已知边界 / 待改进

| 项目          | 当前状态                       | 建议                               |
| ------------- | ------------------------------ | ---------------------------------- |
| Refresh Token | 后端返回但前端未使用           | 实现 token 过期自动刷新            |
| 路由鉴权      | 无路由守卫，页面公开访问       | 对敏感页面添加`beforeEnter` 守卫 |
| Token 校验    | 仅在应用启动时主动校验         | 可增加定时校验或请求前校验         |
| XSS 防护      | 依赖 Vue 模板转义              | 注意 v-html 等直接渲染场景         |
| CSRF          | `withCredentials: true` 开启 | 需后端配合 CSRF Token 校验         |
| 游客状态      | status=2 被视为未登录          | 可增加游客专属体验                 |
| ipAddress     | 前端硬编码`127.0.0.1`        | 应从实际环境获取真实 IP            |

### 12.3 错误处理策略

```
API 错误
  ├── 401 未授权
  │     └── 静默处理，清除本地状态，不弹 Toast
  ├── 业务失败 (isSuccess === false)
  │     └── 返回 errMsg，由调用方处理显示
  ├── 网络错误
  │     └── Toast 显示错误信息
  └── 其他 HTTP 错误
        └── 提取 errMsg/message，Toast 显示
```

---

## 13. 文件清单

| 文件路径                                                             | 职责                | 层级    |
| -------------------------------------------------------------------- | ------------------- | ------- |
| [src/api/request.ts](../src/api/request.ts)                           | Axios 实例、拦截器  | HTTP 层 |
| [src/api/auth.ts](../src/api/auth.ts)                                 | 认证 API + DTO 类型 | API 层  |
| [src/api/user.ts](../src/api/user.ts)                                 | 用户公开信息 API    | API 层  |
| [src/api/upload.ts](../src/api/upload.ts)                             | 文件上传 API        | API 层  |
| [src/store/user.ts](../src/store/user.ts)                             | 用户状态管理        | 状态层  |
| [src/store/app.ts](../src/store/app.ts)                               | 全局加载状态        | 状态层  |
| [src/router/index.ts](../src/router/index.ts)                         | 路由配置 + 加载守卫 | 路由层  |
| [src/main.ts](../src/main.ts)                                         | 应用入口            | 启动层  |
| [src/App.vue](../src/App.vue)                                         | 根组件 + 会话恢复   | 启动层  |
| [src/components/AuthModal.vue](../src/components/AuthModal.vue)       | 登录/注册弹窗       | UI 层   |
| [src/components/AuthDropdown.vue](../src/components/AuthDropdown.vue) | 未登录用户入口      | UI 层   |
| [src/components/NavBar.vue](../src/components/NavBar.vue)             | 导航栏 (状态感知)   | UI 层   |
| [src/views/UserProfile.vue](../src/views/UserProfile.vue)             | 个人中心            | UI 层   |
| [src/views/EmailVerification.vue](../src/views/EmailVerification.vue) | 邮箱验证页面        | UI 层   |
| [src/components/CookieNotice.vue](../src/components/CookieNotice.vue) | Cookie 隐私声明     | UI 层   |
| [src/locales/en.ts](../src/locales/en.ts)                             | 英文国际化文案      | i18n    |
| [src/locales/zh.ts](../src/locales/zh.ts)                             | 中文国际化文案      | i18n    |
| [src/composables/useToast.ts](../src/composables/useToast.ts)         | Toast 通知系统      | 工具层  |
| [src/composables/useTheme.ts](../src/composables/useTheme.ts)         | 主题管理            | 工具层  |
