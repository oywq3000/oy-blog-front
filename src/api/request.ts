import axios from 'axios';
import i18n from '../i18n'; // Import the i18n instance
import { useToast } from '../composables/useToast';

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

// Response interceptor
service.interceptors.response.use(
  (response) => {
    const res = response.data;

    // Check for logical errors (e.g. isSuccess === false)
    if (res && typeof res.isSuccess === 'boolean' && !res.isSuccess) {
        // Construct an error with the backend message
        const errMsg = res.errMsg || 'Unknown Error';
        const error = new Error(errMsg);
        // Attach the original response/code if needed
        (error as any).code = res.errCode;
        return Promise.reject(error);
    }

    return res;
  },
  async (error) => {
    const originalRequest = error.config;

    let errMsg = error.message || 'Request Failed';
    if (error.response && error.response.data) {
       // Try to extract errMsg from the backend JSON response
       const data = error.response.data;
       if (data.errMsg) {
           errMsg = data.errMsg;
       } else if (data.message) {
           errMsg = data.message; // Fallback to standard message field
       }
    }

    // On 401 (Unauthorized): try to refresh token and retry
    if (error.response && error.response.status === 401) {
      // If the refresh endpoint itself returns 401, don't retry (avoid infinite loop)
      if (originalRequest.url?.includes(REFRESH_URL)) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(new Error(errMsg));
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return service(originalRequest);
        });
      }

      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        // No refresh token available — clean up and show login
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        const hadToken = !!localStorage.getItem('token') || true; // had token previously
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(new Error(errMsg));
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
          originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
          return service(originalRequest);
        } else {
          // Refresh returned non-success
          processQueue(new Error('Refresh failed'), null);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userInfo');
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      } catch (refreshError) {
        // Refresh threw an error
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      } finally {
        isRefreshing = false;
      }

      return Promise.reject(new Error(errMsg));
    }

    // Non-401 errors: show toast
    const customError = new Error(errMsg);
    (customError as any).response = error.response;
    console.error('API Error:', customError);
    try {
      const { addToast } = useToast();
      addToast(errMsg, 'error', 5000);
    } catch {
      console.warn('Toast system unavailable:', errMsg);
    }

    return Promise.reject(customError);
  }
);

export default service;
