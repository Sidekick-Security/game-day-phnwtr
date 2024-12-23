import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { 
  apiClient, 
  createApiRequest, 
  handleApiError,
  type ApiError,
  type RequestMetadata 
} from '../../src/utils/api.utils';

import { 
  API_VERSION,
  API_ENDPOINTS 
} from '../../src/constants/api.constants';

// Test constants
const TEST_ENDPOINT = '/api/v1/test';
const TEST_TIMEOUT = 5000;
const TEST_AUTH_TOKEN = 'mock-jwt-token';
const TEST_CORRELATION_ID = 'test-correlation-id';

// Mock axios for isolated testing
let mockAxios: MockAdapter;

beforeEach(() => {
  mockAxios = new MockAdapter(axios);
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  mockAxios.restore();
});

describe('apiClient Configuration', () => {
  test('should initialize with correct default configuration', () => {
    expect(apiClient.defaults.baseURL).toBeDefined();
    expect(apiClient.defaults.timeout).toBeDefined();
    expect(apiClient.defaults.headers['Accept']).toBe('application/json');
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    expect(apiClient.defaults.headers['X-API-Version']).toBe(API_VERSION);
  });

  test('should inject authentication token in request headers when available', async () => {
    localStorage.setItem('auth_token', TEST_AUTH_TOKEN);
    
    mockAxios.onGet(TEST_ENDPOINT).reply(200);
    await apiClient.get(TEST_ENDPOINT);

    const request = mockAxios.history.get[0];
    expect(request.headers?.Authorization).toBe(`Bearer ${TEST_AUTH_TOKEN}`);
  });

  test('should include correlation ID and request ID in headers', async () => {
    mockAxios.onGet(TEST_ENDPOINT).reply(200);
    await apiClient.get(TEST_ENDPOINT);

    const request = mockAxios.history.get[0];
    expect(request.headers?.['X-Correlation-ID']).toBeDefined();
    expect(request.headers?.['X-Request-ID']).toBeDefined();
  });

  test('should apply security headers to requests', async () => {
    mockAxios.onGet(TEST_ENDPOINT).reply(200);
    await apiClient.get(TEST_ENDPOINT);

    const request = mockAxios.history.get[0];
    expect(request.headers?.['Content-Security-Policy']).toBeDefined();
    expect(request.headers?.['X-Content-Type-Options']).toBe('nosniff');
    expect(request.headers?.['X-Frame-Options']).toBe('DENY');
  });

  test('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() => apiClient.get(TEST_ENDPOINT));
    mockAxios.onGet(TEST_ENDPOINT).reply(200);

    await expect(Promise.all(requests)).rejects.toThrow(/Too many requests/);
  });
});

describe('createApiRequest', () => {
  test('should successfully make GET request', async () => {
    const testData = { id: 1, name: 'Test' };
    mockAxios.onGet(TEST_ENDPOINT).reply(200, testData);

    const response = await createApiRequest({
      url: TEST_ENDPOINT,
      method: 'GET'
    });

    expect(response).toEqual(testData);
  });

  test('should handle POST request with data', async () => {
    const requestData = { name: 'Test Exercise' };
    const responseData = { id: 1, ...requestData };
    
    mockAxios.onPost(TEST_ENDPOINT).reply(201, responseData);

    const response = await createApiRequest({
      url: TEST_ENDPOINT,
      method: 'POST',
      data: requestData
    });

    expect(response).toEqual(responseData);
  });

  test('should handle request timeout', async () => {
    mockAxios.onGet(TEST_ENDPOINT).timeout();

    await expect(createApiRequest({
      url: TEST_ENDPOINT,
      method: 'GET',
      timeout: TEST_TIMEOUT
    })).rejects.toThrow(/timeout/i);
  });

  test('should implement circuit breaker for failed requests', async () => {
    mockAxios.onGet(TEST_ENDPOINT).reply(500);

    const requests = Array(6).fill(null).map(() => 
      createApiRequest({
        url: TEST_ENDPOINT,
        method: 'GET'
      })
    );

    await Promise.all(requests.map(p => p.catch(() => {})));
    
    const finalRequest = createApiRequest({
      url: TEST_ENDPOINT,
      method: 'GET'
    });

    await expect(finalRequest).rejects.toThrow(/circuit breaker is open/i);
  });

  test('should handle file upload requests', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');

    mockAxios.onPost(TEST_ENDPOINT).reply(201);

    await expect(createApiRequest({
      url: TEST_ENDPOINT,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })).resolves.not.toThrow();
  });
});

describe('handleApiError', () => {
  test('should handle network errors', () => {
    const networkError = new Error('Network Error');
    const handledError = handleApiError(networkError) as ApiError;

    expect(handledError.code).toBe('NETWORK_ERROR');
    expect(handledError.status).toBe(500);
    expect(handledError.correlationId).toBeDefined();
    expect(handledError.timestamp).toBeDefined();
  });

  test('should handle authentication errors', async () => {
    mockAxios.onGet(TEST_ENDPOINT).reply(401, {
      message: 'Unauthorized access',
      code: 'UNAUTHORIZED'
    });

    try {
      await apiClient.get(TEST_ENDPOINT);
    } catch (error) {
      const handledError = handleApiError(error) as ApiError;
      expect(handledError.status).toBe(401);
      expect(handledError.code).toBe('UNAUTHORIZED');
      expect(handledError.message).toBe('Unauthorized access');
    }
  });

  test('should handle validation errors', async () => {
    const validationError = {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: {
        field: 'name',
        error: 'Required'
      }
    };

    mockAxios.onPost(TEST_ENDPOINT).reply(400, validationError);

    try {
      await apiClient.post(TEST_ENDPOINT, {});
    } catch (error) {
      const handledError = handleApiError(error) as ApiError;
      expect(handledError.status).toBe(400);
      expect(handledError.code).toBe('VALIDATION_ERROR');
      expect(handledError.details).toBeDefined();
    }
  });

  test('should handle rate limiting errors', async () => {
    mockAxios.onGet(TEST_ENDPOINT).reply(429, {
      message: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED'
    });

    try {
      await apiClient.get(TEST_ENDPOINT);
    } catch (error) {
      const handledError = handleApiError(error) as ApiError;
      expect(handledError.status).toBe(429);
      expect(handledError.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });

  test('should handle server errors with retry', async () => {
    let attempts = 0;
    mockAxios.onGet(TEST_ENDPOINT).reply(() => {
      attempts++;
      return attempts < 3 ? [500, { message: 'Server Error' }] : [200, { success: true }];
    });

    const response = await createApiRequest({
      url: TEST_ENDPOINT,
      method: 'GET'
    });

    expect(attempts).toBe(3);
    expect(response).toEqual({ success: true });
  });
});

describe('API Endpoints Integration', () => {
  test('should handle exercise endpoints correctly', async () => {
    mockAxios.onPost(API_ENDPOINTS.EXERCISE.CREATE).reply(201);
    
    await expect(createApiRequest({
      url: API_ENDPOINTS.EXERCISE.CREATE,
      method: 'POST',
      data: {
        name: 'Test Exercise',
        type: 'Security Incident'
      }
    })).resolves.not.toThrow();
  });

  test('should handle scenario endpoints correctly', async () => {
    mockAxios.onPost(API_ENDPOINTS.SCENARIO.GENERATE).reply(201);
    
    await expect(createApiRequest({
      url: API_ENDPOINTS.SCENARIO.GENERATE,
      method: 'POST',
      data: {
        type: 'Ransomware',
        complexity: 'Medium'
      }
    })).resolves.not.toThrow();
  });
});