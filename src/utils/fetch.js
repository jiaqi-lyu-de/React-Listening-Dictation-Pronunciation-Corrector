const API_BASE_URL = 'http://127.0.0.1:8888/';

export const fetchAPI = async (url, method, options = {}) => {
  try {
    const headers = {};
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(API_BASE_URL + url, {
      method: method,
      headers: {
        ...headers,
        ...options.headers,
      },
      body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
      ...Object.fromEntries(Object.entries(options).filter(([key]) => !['body', 'headers'].includes(key))),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: response.statusText 
      }));
      throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Network error - check if server is running at', API_BASE_URL);
      throw new Error(`Failed to connect to server. Make sure the backend is running at ${API_BASE_URL}`);
    }
    console.error('Fetch error:', error);
    throw error;
  }
};

export default {
    fetchAPI,
};