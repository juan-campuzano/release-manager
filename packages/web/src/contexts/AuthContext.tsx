import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createAPIClient } from '../client';

/**
 * User information
 */
export interface User {
  username: string;
  // Add other user properties as needed
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

/**
 * Authentication context value
 */
export interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

/**
 * Local storage key for authentication token
 */
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Props for AuthProvider
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * API client instance (singleton)
 */
const apiClient = createAPIClient();

/**
 * Authentication Provider component
 * 
 * Manages authentication state including:
 * - Login with username/password
 * - Logout and token clearing
 * - Token persistence in localStorage
 * - Automatic redirect on 401 responses
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    user: null,
    isLoading: true,
  });

  /**
   * Handle unauthorized responses (401)
   * Clears token and redirects to login
   */
  const handleUnauthorized = useCallback(() => {
    // Clear token from state
    setAuthState({
      isAuthenticated: false,
      token: null,
      user: null,
      isLoading: false,
    });

    // Clear token from localStorage
    localStorage.removeItem(AUTH_TOKEN_KEY);

    // Clear token from API client
    apiClient.clearAuthToken();

    // Redirect to login page
    window.location.href = '/login';
  }, []);

  /**
   * Initialize authentication state from localStorage
   */
  useEffect(() => {
    // Set up unauthorized callback
    apiClient.setUnauthorizedCallback(handleUnauthorized);

    // Check for stored token
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    
    if (storedToken) {
      // Set token in API client
      apiClient.setAuthToken(storedToken);
      
      // Update state
      setAuthState({
        isAuthenticated: true,
        token: storedToken,
        user: null, // User info would be fetched from API in a real app
        isLoading: false,
      });
    } else {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [handleUnauthorized]);

  /**
   * Login with username and password
   * 
   * @param username - User's username
   * @param password - User's password
   * @throws Error if login fails
   */
  const login = useCallback(async (username: string, password: string): Promise<void> => {
    try {
      // Call login API endpoint
      const response = await apiClient.post<{ token: string; user?: User }>('/api/auth/login', {
        username,
        password,
      });

      const { token, user } = response;

      // Store token in localStorage
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      // Set token in API client
      apiClient.setAuthToken(token);

      // Update authentication state
      setAuthState({
        isAuthenticated: true,
        token,
        user: user || { username },
        isLoading: false,
      });
    } catch (error) {
      // Clear any partial state
      localStorage.removeItem(AUTH_TOKEN_KEY);
      apiClient.clearAuthToken();
      
      setAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false,
      });

      // Re-throw error for component to handle
      throw error;
    }
  }, []);

  /**
   * Logout and clear authentication state
   */
  const logout = useCallback(() => {
    // Clear token from localStorage
    localStorage.removeItem(AUTH_TOKEN_KEY);

    // Clear token from API client
    apiClient.clearAuthToken();

    // Clear authentication state
    setAuthState({
      isAuthenticated: false,
      token: null,
      user: null,
      isLoading: false,
    });

    // Redirect to login page
    window.location.href = '/login';
  }, []);

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * 
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
