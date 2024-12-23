/**
 * Exercise Service
 * Provides comprehensive frontend service for exercise lifecycle management
 * with AI-driven scenario generation, real-time monitoring, and compliance validation.
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import { debounce } from 'lodash'; // ^4.17.21
import { Observable, Subject } from 'rxjs'; // ^7.8.1

import {
  IExercise,
  IExerciseInject,
  IExerciseParticipant,
  IExerciseResponse,
  IExerciseMetrics,
  IComplianceValidation
} from '../interfaces/exercise.interface';

import {
  apiClient,
  createApiRequest,
  handleApiError,
  ApiError
} from '../utils/api.utils';

import { API_ENDPOINTS } from '../constants/api.constants';
import { ExerciseType, ExerciseStatus } from '../types/exercise.types';

/**
 * Cache configuration for exercise data
 */
interface ExerciseCache {
  data: Map<string, IExercise>;
  ttl: number;
  timestamp: number;
}

/**
 * Enhanced service class for managing exercise operations
 */
@injectable()
export class ExerciseService {
  private readonly baseUrl: string;
  private readonly exerciseCache: ExerciseCache;
  private readonly metricsSubject: Subject<IExerciseMetrics>;
  private readonly wsConnections: Map<string, WebSocket>;

  constructor() {
    this.baseUrl = API_ENDPOINTS.EXERCISE.BASE;
    this.exerciseCache = {
      data: new Map(),
      ttl: 300000, // 5 minutes
      timestamp: Date.now()
    };
    this.metricsSubject = new Subject<IExerciseMetrics>();
    this.wsConnections = new Map();
  }

  /**
   * Creates a new exercise with optional AI-driven scenario generation
   * @param exerciseData Initial exercise configuration
   * @param useAI Flag to enable AI scenario generation
   * @returns Created exercise instance
   */
  public async createExerciseWithAI(
    exerciseData: Partial<IExercise>,
    useAI: boolean = false
  ): Promise<IExercise> {
    try {
      // Validate required fields
      if (!exerciseData.title || !exerciseData.type) {
        throw new Error('Missing required exercise fields');
      }

      const payload = {
        ...exerciseData,
        status: ExerciseStatus.DRAFT,
        isAiEnabled: useAI,
        aiConfig: useAI ? {
          complexity: exerciseData.aiConfig?.complexity || 'medium',
          adaptiveScenarios: true,
          complianceAlignment: true
        } : undefined
      };

      const response = await createApiRequest<IExercise>({
        url: `${this.baseUrl}/create`,
        method: 'POST',
        data: payload
      });

      // Cache the created exercise
      this.updateCache(response);

      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Establishes real-time monitoring for exercise metrics
   * @param exerciseId Exercise identifier
   * @returns Observable stream of exercise metrics
   */
  public monitorExerciseMetrics(exerciseId: string): Observable<IExerciseMetrics> {
    // Close existing connection if any
    this.closeWebSocketConnection(exerciseId);

    // Establish new WebSocket connection
    const wsUrl = `${process.env.VITE_WS_URL}/exercises/${exerciseId}/metrics`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const metrics: IExerciseMetrics = JSON.parse(event.data);
      this.metricsSubject.next(metrics);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.metricsSubject.error(error);
    };

    this.wsConnections.set(exerciseId, ws);
    return this.metricsSubject.asObservable();
  }

  /**
   * Validates exercise against specified compliance frameworks
   * @param exerciseId Exercise identifier
   * @param frameworks Array of compliance framework identifiers
   * @returns Validation results
   */
  public async validateCompliance(
    exerciseId: string,
    frameworks: string[]
  ): Promise<IComplianceValidation> {
    try {
      const response = await createApiRequest<IComplianceValidation>({
        url: `${this.baseUrl}/${exerciseId}/validate`,
        method: 'POST',
        data: { frameworks }
      });

      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Updates exercise status with debounced real-time sync
   * @param exerciseId Exercise identifier
   * @param status New exercise status
   */
  public updateExerciseStatus = debounce(
    async (exerciseId: string, status: ExerciseStatus): Promise<void> => {
      try {
        await createApiRequest({
          url: `${this.baseUrl}/${exerciseId}/status`,
          method: 'PUT',
          data: { status }
        });

        // Update cache
        const cachedExercise = this.exerciseCache.data.get(exerciseId);
        if (cachedExercise) {
          cachedExercise.status = status;
          this.updateCache(cachedExercise);
        }
      } catch (error) {
        throw handleApiError(error);
      }
    },
    1000
  );

  /**
   * Retrieves exercise details with caching
   * @param exerciseId Exercise identifier
   * @returns Exercise instance
   */
  public async getExercise(exerciseId: string): Promise<IExercise> {
    // Check cache first
    const cachedExercise = this.exerciseCache.data.get(exerciseId);
    if (cachedExercise && Date.now() - this.exerciseCache.timestamp < this.exerciseCache.ttl) {
      return cachedExercise;
    }

    try {
      const response = await createApiRequest<IExercise>({
        url: `${this.baseUrl}/${exerciseId}`,
        method: 'GET'
      });

      this.updateCache(response);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cleans up resources when service is destroyed
   */
  public dispose(): void {
    this.wsConnections.forEach((ws) => ws.close());
    this.wsConnections.clear();
    this.metricsSubject.complete();
  }

  /**
   * Updates the exercise cache
   * @param exercise Exercise data to cache
   */
  private updateCache(exercise: IExercise): void {
    this.exerciseCache.data.set(exercise.id, exercise);
    this.exerciseCache.timestamp = Date.now();
  }

  /**
   * Closes existing WebSocket connection for an exercise
   * @param exerciseId Exercise identifier
   */
  private closeWebSocketConnection(exerciseId: string): void {
    const existingConnection = this.wsConnections.get(exerciseId);
    if (existingConnection) {
      existingConnection.close();
      this.wsConnections.delete(exerciseId);
    }
  }
}