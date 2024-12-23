/**
 * @fileoverview Service layer for managing participant responses during tabletop exercises.
 * Implements comprehensive response tracking, validation, and compliance mapping with
 * real-time updates and caching support.
 * @version 1.0.0
 */

import { Injectable, Cache } from '@nestjs/common'; // v10.x
import { ObjectId } from 'mongodb'; // v6.0.x
import { IResponse, ResponseStatus, ResponseValidation } from '../interfaces/response.interface';
import { Response, ResponseDocument } from '../models/response.model';
import { IInject, InjectStatus } from '../interfaces/inject.interface';

/**
 * DTO for creating new responses
 */
interface CreateResponseDto {
  exerciseId: string;
  injectId: string;
  participantId: string;
  content: string;
  attachments?: string[];
}

/**
 * DTO for response validation
 */
interface ValidationDto {
  validation: ResponseValidation;
  validatorNotes: string;
  complianceGaps?: string[];
}

/**
 * Service class handling all response-related operations with enhanced compliance
 * tracking and real-time updates.
 */
@Injectable()
export class ResponseService {
  constructor(
    private readonly responseModel: typeof Response,
    private readonly cacheManager: Cache
  ) {}

  /**
   * Creates a new response for an exercise inject with initial compliance mapping
   * @param responseData Data for creating the new response
   * @returns Promise resolving to the created response
   * @throws Error if inject or exercise not found
   */
  async createResponse(responseData: CreateResponseDto): Promise<IResponse> {
    const response = new this.responseModel({
      exerciseId: new ObjectId(responseData.exerciseId),
      injectId: new ObjectId(responseData.injectId),
      participantId: new ObjectId(responseData.participantId),
      content: responseData.content,
      status: ResponseStatus.DRAFT,
      attachments: responseData.attachments || [],
      complianceMapping: [],
      metadata: {
        creationTimestamp: new Date(),
        lastModified: new Date(),
        platform: 'web'
      }
    });

    const savedResponse = await response.save();
    await this.updateResponseCache(savedResponse);
    return savedResponse;
  }

  /**
   * Submits a response for validation with compliance check
   * @param responseId ID of the response to submit
   * @returns Promise resolving to the updated response
   * @throws Error if response not found
   */
  async submitResponse(responseId: string): Promise<IResponse> {
    const response = await this.responseModel.findById(responseId);
    if (!response) {
      throw new Error('Response not found');
    }

    response.status = ResponseStatus.SUBMITTED;
    response.submissionTime = new Date();
    response.metadata = {
      ...response.metadata,
      lastModified: new Date(),
      submissionMetrics: {
        timeToSubmit: response.submissionTime.getTime() - response.createdAt.getTime(),
      }
    };

    const updatedResponse = await response.save();
    await this.updateResponseCache(updatedResponse);
    return updatedResponse;
  }

  /**
   * Validates a submitted response against expected criteria with compliance mapping
   * @param responseId ID of the response to validate
   * @param validationData Validation criteria and compliance gaps
   * @returns Promise resolving to the validated response
   * @throws Error if response not found
   */
  async validateResponse(responseId: string, validationData: ValidationDto): Promise<IResponse> {
    const response = await this.responseModel.findById(responseId);
    if (!response) {
      throw new Error('Response not found');
    }

    response.status = ResponseStatus.VALIDATED;
    response.validation = validationData.validation;
    response.validatorNotes = validationData.validatorNotes;
    response.validationTime = new Date();
    
    if (validationData.complianceGaps) {
      response.complianceMapping = await this.processComplianceGaps(
        response.exerciseId,
        validationData.complianceGaps
      );
    }

    const validatedResponse = await response.save();
    await this.updateResponseCache(validatedResponse);
    return validatedResponse;
  }

  /**
   * Retrieves all responses for a specific exercise with caching
   * @param exerciseId ID of the exercise
   * @returns Promise resolving to array of responses
   */
  @Cache('exercise-responses', { ttl: 300 })
  async getExerciseResponses(exerciseId: string): Promise<IResponse[]> {
    const responses = await this.responseModel.findByExercise(
      new ObjectId(exerciseId),
      {
        status: [ResponseStatus.SUBMITTED, ResponseStatus.VALIDATED],
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          end: new Date()
        }
      }
    );
    return responses;
  }

  /**
   * Retrieves all responses for a specific inject with caching
   * @param injectId ID of the inject
   * @returns Promise resolving to array of responses
   */
  @Cache('inject-responses', { ttl: 300 })
  async getInjectResponses(injectId: string): Promise<IResponse[]> {
    const responses = await this.responseModel.find({
      injectId: new ObjectId(injectId)
    }).sort({ submissionTime: -1 });
    return responses;
  }

  /**
   * Analyzes responses for compliance gaps and generates recommendations
   * @param exerciseId ID of the exercise to analyze
   * @returns Promise resolving to analysis results
   */
  async analyzeResponses(exerciseId: string): Promise<any> {
    return await this.responseModel.analyzeResponses(
      new ObjectId(exerciseId),
      {
        includeMetrics: true,
        gapThreshold: 0.8
      }
    );
  }

  /**
   * Updates the response cache for real-time tracking
   * @param response Response to cache
   */
  private async updateResponseCache(response: ResponseDocument): Promise<void> {
    const cacheKey = `response:${response.id}`;
    await this.cacheManager.set(
      cacheKey,
      response,
      { ttl: 300 }
    );
  }

  /**
   * Processes and maps compliance gaps to framework requirements
   * @param exerciseId Exercise ID for context
   * @param gaps Identified compliance gaps
   * @returns Promise resolving to mapped compliance requirements
   */
  private async processComplianceGaps(
    exerciseId: ObjectId,
    gaps: string[]
  ): Promise<string[]> {
    // Implementation would map gaps to compliance framework requirements
    return gaps.map(gap => `REQ-${gap}`);
  }
}