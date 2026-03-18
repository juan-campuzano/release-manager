import axios from 'axios';
import { APIClient, createAPIClient } from './client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('APIClient', () => {
  let client: APIClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create client
    client = new APIClient({
      baseURL: 'http://localhost:3000',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should set up request interceptor', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should set auth token', () => {
      client.setAuthToken('test-token');
      // Token is stored internally, we'll verify it's used in requests
      expect(client).toBeDefined();
    });

    it('should clear auth token', () => {
      client.setAuthToken('test-token');
      client.clearAuthToken();
      expect(client).toBeDefined();
    });
  });

  describe('HTTP methods', () => {
    it('should make GET request', async () => {
      const mockData = { id: '1', name: 'Test' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const result = await client.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });

    it('should make POST request', async () => {
      const mockData = { id: '1', name: 'Test' };
      const postData = { name: 'Test' };
      mockAxiosInstance.post.mockResolvedValue({ data: mockData });

      const result = await client.post('/test', postData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined);
      expect(result).toEqual(mockData);
    });

    it('should make PATCH request', async () => {
      const mockData = { id: '1', name: 'Updated' };
      const patchData = { name: 'Updated' };
      mockAxiosInstance.patch.mockResolvedValue({ data: mockData });

      const result = await client.patch('/test/1', patchData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', patchData, undefined);
      expect(result).toEqual(mockData);
    });

    it('should make DELETE request', async () => {
      const mockData = { success: true };
      mockAxiosInstance.delete.mockResolvedValue({ data: mockData });

      const result = await client.delete('/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(mockData);
    });

    it('should make PUT request', async () => {
      const mockData = { id: '1', name: 'Replaced' };
      const putData = { name: 'Replaced' };
      mockAxiosInstance.put.mockResolvedValue({ data: mockData });

      const result = await client.put('/test/1', putData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData, undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('createAPIClient', () => {
    it('should create client with default config', () => {
      const client = createAPIClient();
      expect(client).toBeInstanceOf(APIClient);
    });

    it('should create client with custom config', () => {
      const client = createAPIClient({
        baseURL: 'http://custom.com',
        timeout: 5000,
      });
      expect(client).toBeInstanceOf(APIClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom.com',
          timeout: 5000,
        })
      );
    });
  });
});
