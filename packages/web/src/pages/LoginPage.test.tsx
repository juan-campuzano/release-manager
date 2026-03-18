import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';
import { createAPIClient } from '../client';

// Mock the API client module
jest.mock('../client', () => {
  const mockAPIClient = {
    post: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
    setUnauthorizedCallback: jest.fn(),
  };
  
  return {
    createAPIClient: jest.fn(() => mockAPIClient),
    __mockAPIClient: mockAPIClient,
  };
});

// Get the mock API client instance
const { __mockAPIClient: mockAPIClient } = jest.requireMock('../client');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockNavigate.mockClear();
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('should render login form with username and password fields', () => {
    renderLoginPage();

    expect(screen.getByText('Release Manager')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should display validation errors for empty fields', async () => {
    renderLoginPage();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('should handle successful login and redirect to dashboard', async () => {
    const mockResponse = {
      token: 'test-token-123',
      user: { username: 'testuser' },
    };

    mockAPIClient.post.mockResolvedValueOnce(mockResponse);

    renderLoginPage();

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAPIClient.post).toHaveBeenCalledWith('/api/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display error message on login failure', async () => {
    const mockError = new Error('Invalid credentials');

    mockAPIClient.post.mockRejectedValueOnce(mockError);

    renderLoginPage();

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should disable form inputs and button during submission', async () => {
    // Mock a delayed response
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });
    
    mockAPIClient.post.mockReturnValueOnce(loginPromise);

    renderLoginPage();

    const usernameInput = screen.getByLabelText('Username') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check that elements are disabled during submission
    await waitFor(() => {
      expect(usernameInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    // Resolve the login promise
    resolveLogin!({ token: 'test', user: { username: 'test' } });

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should have proper accessibility attributes', () => {
    renderLoginPage();

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    expect(usernameInput).toHaveAttribute('id', 'username');
    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('autocomplete', 'username');

    expect(passwordInput).toHaveAttribute('id', 'password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    expect(submitButton).toHaveAttribute('type', 'submit');
    expect(submitButton).toHaveAttribute('aria-label', 'Sign in');
  });
});
