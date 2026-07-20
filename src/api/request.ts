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
  (error) => {
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

    // Create a new error with the extracted message to ensure callers get the right text
    const customError = new Error(errMsg);
    (customError as any).response = error.response; // Keep the response for debugging

    // Only log and show toast if it's NOT a 401 (Unauthorized) which is expected when not logged in
    if (error.response && error.response.status !== 401) {
        console.error('API Error:', customError);
        // Safely attempt to show toast notification
        // The useToast composable uses module-level reactive state, so it works
        // outside of component context
        try {
          const { addToast } = useToast();
          addToast(errMsg, 'error', 5000);
        } catch {
          // Fallback: toast system not yet initialized
          console.warn('Toast system unavailable:', errMsg);
        }
    }

    return Promise.reject(customError);
  }
);

export default service;
