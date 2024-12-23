/**
 * @fileoverview Controller handling HTTP endpoints for managing participant responses
 * during tabletop exercises with enhanced security, validation, and monitoring capabilities.
 * @version 1.0.0
 */

import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  UsePipes,
  UseInterceptors,
  HttpStatus
} from '@nestjs/common'; // v10.x
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiSecurity 
} from '@nestjs/swagger'; // v7.x
import { CacheInterceptor } from '@nestjs/cache-manager'; // v2.x
import { RateLimitGuard } from '@nestjs/throttler'; // v4.x
import { ResponseService } from '../services/response.service';
import { IResponse, ResponseStatus } from '../interfaces/response.interface';
import { validationMiddleware } from '../middleware/validation.middleware';
import { GameDayError, ErrorSeverity } from '../../shared/middleware/error-handler.middleware';
import { ErrorCode } from '../../shared/constants/error-codes';
import Logger from '../../shared/utils/logger.util';
import { v4 as uuidv4 } from 'uuid'; // v9.x

/**
 * DTO for creating new responses
 */
class CreateResponseDto {
  readonly exerciseId: string;
  readonly injectId: string;
  readonly content: string;
  readonly attachments?: string[];
}

/**
 * DTO for validating responses
 */
class ValidateResponseDto {
  readonly validation: ResponseStatus;
  readonly validatorNotes: string;
  readonly complianceGaps?: string[];
}

/**
 * Enhanced controller for managing exercise responses with comprehensive
 * security, validation, and monitoring capabilities.
 */
@Controller('responses')
@ApiTags('responses')
@UseGuards(RateLimitGuard)
@UseInterceptors(CacheInterceptor)
export class ResponseController {
  private readonly logger: Logger;

  constructor(
    private readonly responseService: ResponseService
  ) {
    this.logger = Logger.getInstance({
      serviceName: 'response-controller',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Creates a new response with enhanced validation and security
   */
  @Post()
  @UseGuards(RateLimitGuard)
  @UsePipes(validationMiddleware(CreateResponseDto))
  @ApiOperation({ summary: 'Create new response' })
  @ApiSecurity('bearer')
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Response created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async createResponse(@Body() responseData: CreateResponseDto): Promise<IResponse> {
    const correlationId = uuidv4();
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Creating new response', {
        exerciseId: responseData.exerciseId,
        injectId: responseData.injectId,
        correlationId
      });

      const response = await this.responseService.createResponse(responseData);

      this.logger.info('Response created successfully', {
        responseId: response.id,
        correlationId
      });

      return response;
    } catch (error) {
      throw new GameDayError(
        'Failed to create response',
        ErrorCode.VALIDATION_ERROR,
        'VALIDATION',
        ErrorSeverity.LOW,
        { originalError: error.message, correlationId }
      );
    }
  }

  /**
   * Submits a response for validation with compliance check
   */
  @Put(':id/submit')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Submit response for validation' })
  @ApiSecurity('bearer')
  @ApiResponse({ status: HttpStatus.OK, description: 'Response submitted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Response not found' })
  async submitResponse(@Param('id') responseId: string): Promise<IResponse> {
    const correlationId = uuidv4();
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Submitting response', { responseId, correlationId });

      const response = await this.responseService.submitResponse(responseId);

      this.logger.info('Response submitted successfully', {
        responseId: response.id,
        correlationId
      });

      return response;
    } catch (error) {
      throw new GameDayError(
        'Failed to submit response',
        ErrorCode.RESOURCE_NOT_FOUND,
        'NOT_FOUND',
        ErrorSeverity.LOW,
        { responseId, correlationId }
      );
    }
  }

  /**
   * Validates a submitted response with compliance mapping
   */
  @Put(':id/validate')
  @UseGuards(RateLimitGuard)
  @UsePipes(validationMiddleware(ValidateResponseDto))
  @ApiOperation({ summary: 'Validate submitted response' })
  @ApiSecurity('bearer')
  @ApiResponse({ status: HttpStatus.OK, description: 'Response validated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Response not found' })
  async validateResponse(
    @Param('id') responseId: string,
    @Body() validationData: ValidateResponseDto
  ): Promise<IResponse> {
    const correlationId = uuidv4();
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Validating response', {
        responseId,
        validation: validationData.validation,
        correlationId
      });

      const response = await this.responseService.validateResponse(
        responseId,
        validationData
      );

      this.logger.info('Response validated successfully', {
        responseId: response.id,
        correlationId
      });

      return response;
    } catch (error) {
      throw new GameDayError(
        'Failed to validate response',
        ErrorCode.RESOURCE_NOT_FOUND,
        'NOT_FOUND',
        ErrorSeverity.LOW,
        { responseId, correlationId }
      );
    }
  }

  /**
   * Retrieves all responses for a specific exercise with caching
   */
  @Get('exercise/:id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get exercise responses' })
  @ApiSecurity('bearer')
  @ApiResponse({ status: HttpStatus.OK, description: 'Responses retrieved successfully' })
  async getExerciseResponses(@Param('id') exerciseId: string): Promise<IResponse[]> {
    const correlationId = uuidv4();
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Retrieving exercise responses', {
        exerciseId,
        correlationId
      });

      const responses = await this.responseService.getExerciseResponses(exerciseId);

      this.logger.info('Exercise responses retrieved successfully', {
        exerciseId,
        responseCount: responses.length,
        correlationId
      });

      return responses;
    } catch (error) {
      throw new GameDayError(
        'Failed to retrieve exercise responses',
        ErrorCode.RESOURCE_NOT_FOUND,
        'NOT_FOUND',
        ErrorSeverity.LOW,
        { exerciseId, correlationId }
      );
    }
  }

  /**
   * Retrieves all responses for a specific inject with caching
   */
  @Get('inject/:id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get inject responses' })
  @ApiSecurity('bearer')
  @ApiResponse({ status: HttpStatus.OK, description: 'Responses retrieved successfully' })
  async getInjectResponses(@Param('id') injectId: string): Promise<IResponse[]> {
    const correlationId = uuidv4();
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Retrieving inject responses', {
        injectId,
        correlationId
      });

      const responses = await this.responseService.getInjectResponses(injectId);

      this.logger.info('Inject responses retrieved successfully', {
        injectId,
        responseCount: responses.length,
        correlationId
      });

      return responses;
    } catch (error) {
      throw new GameDayError(
        'Failed to retrieve inject responses',
        ErrorCode.RESOURCE_NOT_FOUND,
        'NOT_FOUND',
        ErrorSeverity.LOW,
        { injectId, correlationId }
      );
    }
  }
}