import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Configuration for the API client
 */
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Retry configuration for failed requests
 */
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

/**
 * Extended Axios request config with retry tracking
 */
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  retryDelay: 1000, // Base delay in milliseconds
  retryCondition: (error: AxiosError) => {
    // Retry on network errors
    if (!error.response) {
      return true;
    }
    
    // Retry on specific status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.response.status);
  }
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate exponential backoff delay
 * Formula: baseDelay * (2 ^ attempt)
 */
const calculateBackoff = (attempt: number, baseDelay: number): number => {
  return baseDelay * Math.pow(2, attempt - 1);
};

/**
 * API Client class with authentication, retry logic, and error handling
 */
export class APIClient {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private maxRetries: number;
  private baseRetryDelay: number;
  private onUnauthorized?: () => void;

  constructor(config: APIClientConfig) {
    this.maxRetries = config.maxRetries;
    this.baseRetryDelay = config.retryDelay;

    // Create Axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Set up request interceptor for authentication
    this.setupRequestInterceptor();

    // Set up response interceptor for retry logic and error handling
    this.setupResponseInterceptor();
  }

  /**
   * Set up request interceptor to inject authentication token
   */
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add authentication token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set up response interceptor for retry logic and 401 handling
   */
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as ExtendedAxiosRequestConfig;

        // Handle 401 Unauthorized - clear token and trigger callback
        if (error.response?.status === 401) {
          this.clearAuthToken();
          if (this.onUnauthorized) {
            this.onUnauthorized();
          }
          return Promise.reject(error);
        }

        // Initialize retry count if not present
        if (!config._retryCount) {
          config._retryCount = 0;
        }

        // Check if we should retry
        const shouldRetry = DEFAULT_RETRY_CONFIG.retryCondition(error);
        if (shouldRetry && config._retryCount < this.maxRetries) {
          config._retryCount++;
          
          // Calculate exponential backoff delay
          const delay = calculateBackoff(config._retryCount, this.baseRetryDelay);
          
          // Wait before retrying
          await sleep(delay);
          
          // Retry the request
          return this.axiosInstance(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Set the authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear the authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Set callback for unauthorized responses
   */
  setUnauthorizedCallback(callback: () => void): void {
    this.onUnauthorized = callback;
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }
}

/**
 * Create a default API client instance
 */
export const createAPIClient = (config: Partial<APIClientConfig> = {}): APIClient => {
  const defaultConfig: APIClientConfig = {
    baseURL: config.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second base delay
  };

  return new APIClient({ ...defaultConfig, ...config });
};
