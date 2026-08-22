import axios from 'axios';
import i18n from '../i18n'; // Import the i18n instance
import { extractErrorMessage } from '../utils/errorMessage';
import { notifyRequestError } from '../utils/errorHandler';

const service = axios.create({
  baseURL: '', // Proxy will handle /api
  timeout: 10000,
  withCredentials: true, // Crucial for cookie handling
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
service.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Add 'lang' header based on current locale
    // i18n.global.locale.value gives the current locale string (e.g., 'en' or 'zh')
    const currentLocale = i18n.global.locale.value;
    config.headers['lang'] = currentLocale === 'zh' ? 'zh' : 'en';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

const REFRESH_URL = '/api/user-service/auth/refresh';
const LOGIN_URL = '/api/user-service/auth/login';

// 清除本地凭证并通知应用进入未授权状态（打开登录弹窗）
const clearAuthAndNotify = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userInfo');
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

// 构造统一结构的 API 错误：message 由 extractErrorMessage 提取，
// 并保留原始 response/code，供上层按状态码处理（如 store/user.ts 判断 401）
const createApiError = (message: string, original?: any) => {
  const error = new Error(message);
  (error as any).response = original?.response;
  (error as any).code = original?.code;
  return error;
};

// Response interceptor
// 统一报错框架：请求错误一律由拦截器以顶部气泡提示（doc/ERROR_HANDLING_FRAMEWORK.md）
service.interceptors.response.use(
  (response) => {
    const res = response.data;

    // 业务错误（HTTP 200 但 isSuccess === false）：统一气泡提示后 reject，
    // 调用方不再自行展示错误
    if (res && typeof res.isSuccess === 'boolean' && !res.isSuccess) {
      const error = createApiError(res.errMsg || i18n.global.t('errors.unknown'), { response, code: res.errCode });
      notifyRequestError(error);
      return Promise.reject(error);
    }

    return res;
  },
  async (error) => {
    const originalRequest = error.config;
    const errMsg = extractErrorMessage(error);

    // On 401 (Unauthorized): try to refresh token and retry
    if (error.response && error.response.status === 401) {
      // 登录接口的 401 是"用户名或密码错误"，不是会话过期：直接报错，不触发刷新
      if (originalRequest.url?.includes(LOGIN_URL)) {
        const apiError = createApiError(errMsg, error);
        notifyRequestError(apiError);
        return Promise.reject(apiError);
      }

      // If the refresh endpoint itself returns 401, don't retry (avoid infinite loop)
      if (originalRequest.url?.includes(REFRESH_URL)) {
        clearAuthAndNotify();
        const apiError = createApiError(errMsg, error);
        notifyRequestError(apiError);
        return Promise.reject(apiError);
      }

      // A request already retried after a successful refresh must not trigger
      // another refresh — otherwise an endpoint that keeps 401ing loops forever
      if ((originalRequest as any)._retry) {
        clearAuthAndNotify();
        const apiError = createApiError(errMsg, error);
        notifyRequestError(apiError);
        return Promise.reject(apiError);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          (originalRequest as any)._retry = true;
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return service(originalRequest);
        });
      }

      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        isRefreshing = false;
        // 会话过期（本地有凭证）：清理 + 气泡提示 + 打开登录弹窗；
        // 匿名访问（本地无凭证）：静默清理 + 登录弹窗引导，不弹错误气泡
        const hadCredentials = !!(localStorage.getItem('token') || localStorage.getItem('userInfo'));
        clearAuthAndNotify();
        if (hadCredentials) {
          notifyRequestError(createApiError(errMsg, error));
        }
        return Promise.reject(createApiError(errMsg, error));
      }

      try {
        // Dynamically import to avoid circular dependency
        const { refreshAccessToken } = await import('../api/auth');
        const res = await refreshAccessToken(storedRefreshToken);

        if (res.isSuccess && res.data) {
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry all queued requests with the new token
          processQueue(null, accessToken);

          // Retry the original request
          (originalRequest as any)._retry = true;
          originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
          return service(originalRequest);
        } else {
          // Refresh returned non-success
          processQueue(new Error('Refresh failed'), null);
          clearAuthAndNotify();
        }
      } catch (refreshError) {
        // Refresh threw an error
        processQueue(refreshError, null);
        clearAuthAndNotify();
      } finally {
        isRefreshing = false;
      }

      // 刷新失败：气泡提示原始 401 的错误信息（如"Token无效或已过期，请重新登录"）
      const apiError = createApiError(errMsg, error);
      notifyRequestError(apiError);
      return Promise.reject(apiError);
    }

    // Non-401 errors: 统一气泡提示后 reject
    const customError = createApiError(errMsg, error);
    console.error('API Error:', customError);
    notifyRequestError(customError);

    return Promise.reject(customError);
  }
);

export default service;
