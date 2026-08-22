# oy-blog 前端统一报错框架文档

> 版本: 1.0
> 更新日期: 2026-08-22
> 适用分支: dev_report_erroor

---

## 目录

1. [设计目标](#1-设计目标)
2. [架构概览](#2-架构概览)
3. [报错呈现：中间顶部小气泡（Toast）](#3-报错呈现中间顶部小气泡toast)
4. [错误分类与统一映射](#4-错误分类与统一映射)
5. [拦截器错误处理流程](#5-拦截器错误处理流程)
6. [401 特殊处理](#6-401-特殊处理)
7. [调用方规则](#7-调用方规则)
8. [本地表单校验 vs 请求错误](#8-本地表单校验-vs-请求错误)
9. [国际化错误文案](#9-国际化错误文案)
10. [防重复弹泡](#10-防重复弹泡)
11. [测试清单](#11-测试清单)
12. [文件清单](#12-文件清单)
13. [本次修复的反模式清单](#13-本次修复的反模式清单)
14. [本轮修复记录（层级/校验/标红）](#14-本轮修复记录层级校验标红)

---

## 1. 设计目标

**所有请求错误统一以"中间顶部弹出小气泡（Toast）"呈现，业务代码不自行展示错误。**

- 唯一出口：请求错误只在 axios 响应拦截器中转成气泡提示一次，组件层不得重复展示（内联报错条 / `alert()` / 自行 addToast error）。
- 唯一提取：错误信息提取收敛到一个纯函数 `extractErrorMessage`，全项目不存在第二套 `err.response?.data?.errmsg` 之类的散装提取。
- 唯一文案兜底：网络错误、超时、未知错误等无后端文案的错误走 i18n `errors.*` 兜底，随语言切换。

## 2. 架构概览

```
┌──────────────────────────────────────────────────────────┐
│                      UI 组件层                            │
│  只处理本地表单校验（内联报错条）+ 成功提示（toast）        │
│  请求失败时：catch 只收尾状态（loading 复位等），不展示错误  │
├──────────────────────────────────────────────────────────┤
│                 API 函数层 (src/api/*.ts)                 │
│  纯请求封装，返回 Result 信封，不做错误展示                │
├──────────────────────────────────────────────────────────┤
│              请求层 (src/api/request.ts)                  │
│  axios 响应拦截器：                                       │
│  · 业务错误 (isSuccess=false) → toast + reject            │
│  · HTTP 错误 (4xx/5xx)     → toast + reject               │
│  · 401                    → 刷新/重试/清理（见 §6）        │
│  · 网络错误/超时           → toast + reject               │
├──────────────────────────────────────────────────────────┤
│           错误处理工具 (src/utils/errorHandler.ts)         │
│  notifyRequestError：统一 toast 出口 + 2s 防重复弹泡       │
│           错误提取工具 (src/utils/errorMessage.ts)         │
│  extractErrorMessage：从任意错误形状提取可读信息           │
├──────────────────────────────────────────────────────────┤
│          Toast 组件 (src/components/Toast.vue)            │
│  固定定位 顶部居中，全局唯一实例（App.vue 挂载）           │
│  由 composable useToast 的模块级单例状态驱动               │
└──────────────────────────────────────────────────────────┘
```

## 3. 报错呈现：中间顶部小气泡（Toast）

- 组件：[src/components/Toast.vue](../src/components/Toast.vue)，全局挂载于 [src/App.vue](../src/App.vue)，`position: fixed; top: 20px; left: 50%` 居中定位。
- **层级保证（两条缺一不可）**：① Toast 内部 `Teleport to="body"`，脱离 `.app-content` 的 `z-index:1` 层叠上下文；② 容器 z-index 取 `TOAST_Z_INDEX = 100000`（[src/utils/zIndex.ts](../src/utils/zIndex.ts)），**高于所有模态层**（AuthModalShell 遮罩为 `z-index: 9999`）。保证无论登录/注册弹窗是否打开，报错气泡永远可见。
- 状态：`useToast` 使用**模块级单例 ref**，因此拦截器（非组件上下文）与任意组件拿到的都是同一个 toast 列表。
- 类型：`success | error | info | warning`，请求错误统一用 `error`，时长 5s；成功提示用 `success`，默认 3s。
- 交互：点击气泡可立即关闭；多条气泡纵向堆叠。

## 4. 错误分类与统一映射

`extractErrorMessage(error)` 按优先级从错误对象中提取可读信息：

| 优先级 | 错误形状                                                          | 映射结果                                                               |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1      | 字符串                                                            | 原样返回                                                               |
| 2      | `error.response.data` 为 JSON                                   | `errMsg` → `message` → `error`（Spring Boot 默认错误体）依次取 |
| 3      | `error.response.data` 为纯文本                                  | 原样返回                                                               |
| 4      | `Error.message === 'Network Error'`                             | i18n`errors.network`                                                 |
| 5      | `Error.code === 'ECONNABORTED'` 或 message 含 timeout           | i18n`errors.timeout`                                                 |
| 6      | `Request failed with status code N`（无响应体，如网关 502/504） | i18n`errors.http`（带 status 参数）                                  |
| 7      | 其他`Error.message`                                             | 原样返回（后端中文文案 / 自定义错误）                                  |
| 8      | 无法识别                                                          | i18n`errors.unknown`                                                 |

后端返回的 `errMsg` 已按请求头 `lang` 国际化（见 request 拦截器），前端直接展示，不再翻译。

## 5. 拦截器错误处理流程

```
响应到达
 ├─ 200 且 isSuccess === true ────────────────→ 返回 Result 信封（不弹泡）
 ├─ 200 且 isSuccess === false（业务错误）────→ toast(errMsg) + reject
 └─ HTTP 错误
     ├─ 401 ────────────────→ §6 专属流程
     ├─ 网络错误 / 超时 ─────→ toast(errors.*) + reject
     └─ 其他 4xx / 5xx ──────→ toast(errMsg) + reject
```

所有 reject 出来的错误统一为 `Error` 实例，且附带 `error.response`（原始 axios 响应）与 `error.code`，供上层按需做状态码判断（如 `store/user.ts` 判断 401 静默清用户）。

## 6. 401 特殊处理

401 的含义因场景而异，拦截器按 URL 与本地凭证分派：

| 场景       | 判定                               | 行为                                                                                                           |
| ---------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 登录失败   | 请求 URL 含`/auth/login`         | **不触发刷新**，toast 后端文案（如"用户名或密码错误"），reject，不清凭证                                 |
| 刷新失败   | 请求 URL 含`/auth/refresh`       | 清凭证 + 派发`auth:unauthorized` + toast，reject                                                             |
| 重试再失败 | 请求已带`_retry` 标记            | 清凭证 + 派发事件 + toast，reject（防无限刷新循环）                                                            |
| 会话过期   | 本地有 token/refreshToken/userInfo | 尝试刷新 → 成功则重试；失败则清凭证 + 派发事件 + toast（如"Token无效或已过期，请重新登录"）                   |
| 匿名访问   | 本地无任何凭证                     | **不弹泡**，静默清凭证 + 派发 `auth:unauthorized`（NavBar 打开登录弹窗引导登录，属于引导流程而非报错） |

`auth:unauthorized` 事件由 NavBar 监听，用于打开登录弹窗。

## 7. 调用方规则

### 可以做的（✅）

1. `catch` 中收尾组件状态：`finally { isLoading.value = false }`。
2. `catch` 中静默忽略（拦截器已弹泡）：`api.xxx().catch(() => {})`。
3. 成功时弹成功气泡：`addToast(t('...'), 'success')`。
4. 保留 `console.error` 作为开发调试日志（不影响用户）。
5. 专用状态页（如邮箱验证页）可在 catch 中切换到"失败"页面状态（错误文案仍由气泡打印，页面只显示通用失败文案）。

### 禁止做的（❌）

1. **禁止**在组件里对请求错误做二次展示：内联报错条、`alert()`、`addToast(errMsg, 'error')`。
2. **禁止**自行拼装错误提取链：`err.response?.data?.errmsg || err.message`（历史 bug：后端字段是 `errMsg` 驼峰，小写 `errmsg` 永远取不到，回退到泛化文案）。
3. **禁止**使用原生 `alert()` 做任何用户提示（请求错误、成功提示、登录引导均改用气泡）。
4. **禁止**检查 `res.isSuccess === false` 的分支——拦截器对 `isSuccess: false` 一律 reject，该分支是死代码，删除。

## 8. 本地表单校验 vs 请求错误

| 类型                     | 呈现方式                                                                | 示例                                           |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------- |
| 本地表单校验（未发请求） | 表单内联错误（三个弹窗的 `error` ref / UserProfile `passwordErrors`） | "请填写所有字段"、"密码不匹配"、"请输入验证码" |
| 请求错误（已发请求）     | 顶部气泡 toast                                                          | 登录失败、验证码错误、网络超时                 |

本地校验的即时反馈就近展示在表单中，请求错误统一浮现在顶部气泡，两者职责不重叠。

### 提交前本地校验（拦截不发请求）

- 邮箱格式 / 验证码格式等**可在前端判定的异常，必须在提交前拦截**，不发起后端请求。
- 纯函数位于 [src/utils/formValidation.ts](../src/utils/formValidation.ts)：
  - `isValidEmail` — 邮箱格式（`local@domain.tld`）
  - `isValidEmailCode` — 6 位纯数字验证码
- 三个弹窗（LoginModal / RegisterModal / ResetPasswordModal）在登录 / 注册 / 重置 / 发送验证码提交前依次校验，失败即内联报错并标红对应字段。

### 字段级标红（has-error）

- 校验 / 提交失败时，**对应的输入框**加 `has-error` 类变红（[useFieldErrors](../src/composables/useFieldErrors.ts) composable：fieldErrors 映射字段名 → 布尔）。
- 本地校验：只标红出问题的字段（缺哪个标哪个、邮箱格式错标邮箱、密码不匹配标两个密码框）。
- 请求失败：后端不区分具体字段，按当前表单**整组标红**（`markAll()`——每模态的字段集即其整组），错误文案仍由气泡打印。
- **标红状态不保留**：关闭弹窗 `resetState()` / 切换弹窗时清空 `fieldErrors`，重新打开不残留。

## 9. 国际化错误文案

`errors.*` 兜底文案位于 `src/locales/zh.ts` 与 `src/locales/en.ts`：

```ts
errors: {
  network: '网络连接失败，请检查网络后重试',
  timeout: '请求超时，请稍后重试',
  http: '请求失败（HTTP {status}）',
  unknown: '发生未知错误，请稍后重试',
}
```

后端可提供的具体错误文案（`errMsg`）优先展示，`errors.*` 仅作兜底。

## 10. 防重复弹泡

多个并发请求同时失败（如同一页面的评论 + 正文 + 目录并行 401）会触发多条气泡。`notifyRequestError` 内置 **2 秒窗口去重**：相同文案在 2 秒内只弹一次。

## 11. 测试清单

| 测试文件                                                                                       | 覆盖内容                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [src/__tests__/error-message.test.ts](../src/__tests__/error-message.test.ts)             | `extractErrorMessage` 各错误形状映射、`notifyRequestError` 弹泡与去重 |
| [src/__tests__/request-error-toast.test.ts](../src/__tests__/request-error-toast.test.ts) | 拦截器业务错误/500/登录 401/匿名 401/会话过期 401/成功不弹泡              |
| [src/__tests__/request-refresh.test.ts](../src/__tests__/request-refresh.test.ts)         | 401 → 刷新 → 重试链路（防无限循环）                                     |
| [src/__tests__/toast-layer.test.ts](../src/__tests__/toast-layer.test.ts)               | Toast teleport 到 body、z-index 高于模态层                            |
| [src/__tests__/form-validation.test.ts](../src/__tests__/form-validation.test.ts)       | `isValidEmail` / `isValidEmailCode` 纯函数                            |
| [src/__tests__/auth-modal-validation.test.ts](../src/__tests__/auth-modal-validation.test.ts) | 提交前拦截不发请求、字段级标红、关闭重开清除标红                   |

## 12. 文件清单

| 文件                              | 职责                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `src/api/request.ts`            | axios 实例、请求/响应拦截器、401 刷新重试状态机、统一 toast 出口 |
| `src/utils/errorMessage.ts`     | `extractErrorMessage` 错误信息提取纯函数                       |
| `src/utils/errorHandler.ts`     | `notifyRequestError` 统一弹泡 + 去重                           |
| `src/components/Toast.vue`      | 顶部居中气泡 UI（Teleport 到 body，TOAST_Z_INDEX 层级）          |
| `src/composables/useToast.ts`   | 模块级单例 toast 状态                                            |
| `src/utils/formValidation.ts` | `isValidEmail` / `isValidEmailCode` 提交前校验纯函数           |
| `src/utils/zIndex.ts`         | 全局层级常量（`TOAST_Z_INDEX = 100000`）                        |
| `src/locales/zh.ts` / `en.ts` | `errors.*` 兜底文案、`auth.invalidEmail/invalidCode` 校验文案  |

## 13. 本次修复的反模式清单

| 反模式                                                   | 位置（修复前）                                 | 修复                              |
| -------------------------------------------------------- | ---------------------------------------------- | --------------------------------- |
| 原生`alert()` 展示请求错误                             | UserProfile、ArticleEditor（共 8 处）          | 删除，交由拦截器气泡              |
| `alert()` 做登录引导                                   | ArticleDetail（投票/回复/评论/点赞/收藏 5 处） | 改为`addToast(msg, 'warning')`  |
| `err.response?.data?.errmsg` 小写字段取不到            | AuthModal（旧，已拆分）                       | 删除，交由`extractErrorMessage` |
| 拦截器弹泡 + 组件内联报错条双展示                        | AuthModal（旧，已拆分；登录/注册/重置/验证码） | 组件只保留本地校验内联错误        |
| 拦截器弹泡 + 组件再次 addToast error 双气泡              | ArticleEditor 保存草稿                         | 删除组件侧错误气泡                |
| 登录 401 误触发刷新流程                                  | request.ts（无登录 URL 豁免）                  | 登录 URL 401 直接报错不刷新       |
| 会话过期无任何提示                                       | request.ts（401 各分支静默）                   | 过期会话 toast 后端文案           |
| 业务错误 (isSuccess=false) 静默 reject、由调用方散装展示 | request.ts + 各调用点                          | 拦截器统一 toast                  |

## 14. 本轮修复记录（层级/校验/标红）

| 问题                                    | 根因                                                                                    | 修复                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 弹窗打开时报错气泡被遮住                | Toast 在 `.app-content`（z-index:1 层叠上下文）内，模态层 teleport 到 body 且同为 9999  | Toast 也 Teleport 到 body + `TOAST_Z_INDEX=100000` 高于模态层（[Toast.vue](../src/components/Toast.vue)、[zIndex.ts](../src/utils/zIndex.ts)） |
| 邮箱格式等异常仍发请求给后端            | 提交前无本地格式校验                                                                    | 新增 [formValidation.ts](../src/utils/formValidation.ts)，三个弹窗提交前拦截（登录/注册/重置/发送验证码） |
| 提交报错不知道哪个输入框错了            | 所有输入框绑定同一个 `!!error`，一动全红                                                  | `fieldErrors` 按字段标红：本地校验只标出错字段，请求失败按表单整组标红；关闭/切换模式清空不保留  |

