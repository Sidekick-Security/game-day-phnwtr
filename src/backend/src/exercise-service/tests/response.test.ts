/**
 * @fileoverview Comprehensive test suite for the response service validating response
 * creation, submission, validation, retrieval, and compliance analysis functionality.
 * @version 1.0.0
 */

import { MongoMemoryServer } from 'mongodb-memory-server'; // v8.x
import { faker } from '@faker-js/faker'; // v8.x
import { ObjectId } from 'mongodb'; // v6.0.x
import { ResponseService } from '../services/response.service';
import { IResponse, ResponseStatus, ResponseValidation } from '../interfaces/response.interface';
import { Response } from '../models/response.model';

describe('ResponseService', () => {
  let mongoServer: MongoMemoryServer;
  let responseService: ResponseService;
  let mockExerciseId: string;
  let mockInjectId: string;
  let mockParticipantId: string;

  beforeAll(async () => {
    // Setup in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    
    // Initialize service with mocked dependencies
    responseService = new ResponseService(
      Response,
      {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn()
      }
    );

    // Generate mock IDs
    mockExerciseId = new ObjectId().toString();
    mockInjectId = new ObjectId().toString();
    mockParticipantId = new ObjectId().toString();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe('Response Creation', () => {
    it('should create a new response with valid data', async () => {
      const responseData = {
        exerciseId: mockExerciseId,
        injectId: mockInjectId,
        participantId: mockParticipantId,
        content: faker.lorem.paragraph(),
        attachments: [faker.internet.url()]
      };

      const response = await responseService.createResponse(responseData);

      expect(response).toBeDefined();
      expect(response.status).toBe(ResponseStatus.DRAFT);
      expect(response.content).toBe(responseData.content);
      expect(response.attachments).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        exerciseId: mockExerciseId,
        // Missing required fields
      };

      await expect(responseService.createResponse(invalidData as any))
        .rejects
        .toThrow();
    });
  });

  describe('Response Submission', () => {
    let testResponseId: string;

    beforeEach(async () => {
      const response = await responseService.createResponse({
        exerciseId: mockExerciseId,
        injectId: mockInjectId,
        participantId: mockParticipantId,
        content: faker.lorem.paragraph()
      });
      testResponseId = response.id;
    });

    it('should submit a draft response', async () => {
      const submittedResponse = await responseService.submitResponse(testResponseId);

      expect(submittedResponse.status).toBe(ResponseStatus.SUBMITTED);
      expect(submittedResponse.submissionTime).toBeDefined();
      expect(submittedResponse.metadata.submissionMetrics).toBeDefined();
    });

    it('should reject submission of non-existent response', async () => {
      const fakeId = new ObjectId().toString();
      await expect(responseService.submitResponse(fakeId))
        .rejects
        .toThrow('Response not found');
    });
  });

  describe('Response Validation', () => {
    let testResponseId: string;

    beforeEach(async () => {
      const response = await responseService.createResponse({
        exerciseId: mockExerciseId,
        injectId: mockInjectId,
        participantId: mockParticipantId,
        content: faker.lorem.paragraph()
      });
      testResponseId = response.id;
      await responseService.submitResponse(testResponseId);
    });

    it('should validate a submitted response', async () => {
      const validationData = {
        validation: ResponseValidation.MEETS_EXPECTATIONS,
        validatorNotes: faker.lorem.sentence(),
        complianceGaps: ['GAP-001', 'GAP-002']
      };

      const validatedResponse = await responseService.validateResponse(
        testResponseId,
        validationData
      );

      expect(validatedResponse.status).toBe(ResponseStatus.VALIDATED);
      expect(validatedResponse.validation).toBe(ResponseValidation.MEETS_EXPECTATIONS);
      expect(validatedResponse.complianceMapping).toBeDefined();
      expect(validatedResponse.validationTime).toBeDefined();
    });

    it('should handle validation with compliance gaps', async () => {
      const validationData = {
        validation: ResponseValidation.PARTIALLY_MEETS,
        validatorNotes: faker.lorem.sentence(),
        complianceGaps: ['GAP-003']
      };

      const validatedResponse = await responseService.validateResponse(
        testResponseId,
        validationData
      );

      expect(validatedResponse.complianceMapping).toHaveLength(1);
      expect(validatedResponse.complianceMapping[0]).toMatch(/^REQ-/);
    });
  });

  describe('Response Retrieval', () => {
    beforeEach(async () => {
      // Create multiple test responses
      const createResponses = Array(5).fill(null).map(() => 
        responseService.createResponse({
          exerciseId: mockExerciseId,
          injectId: mockInjectId,
          participantId: mockParticipantId,
          content: faker.lorem.paragraph()
        })
      );
      await Promise.all(createResponses);
    });

    it('should retrieve all exercise responses', async () => {
      const responses = await responseService.getExerciseResponses(mockExerciseId);

      expect(responses).toBeInstanceOf(Array);
      expect(responses.length).toBeGreaterThan(0);
      responses.forEach(response => {
        expect(response.exerciseId.toString()).toBe(mockExerciseId);
      });
    });

    it('should retrieve inject-specific responses', async () => {
      const responses = await responseService.getInjectResponses(mockInjectId);

      expect(responses).toBeInstanceOf(Array);
      expect(responses.length).toBeGreaterThan(0);
      responses.forEach(response => {
        expect(response.injectId.toString()).toBe(mockInjectId);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent response creation', async () => {
      const concurrentCreations = 10;
      const startTime = Date.now();
      
      const createPromises = Array(concurrentCreations).fill(null).map(() => 
        responseService.createResponse({
          exerciseId: mockExerciseId,
          injectId: mockInjectId,
          participantId: mockParticipantId,
          content: faker.lorem.paragraph()
        })
      );

      const responses = await Promise.all(createPromises);
      const executionTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentCreations);
      expect(executionTime).toBeLessThan(5000); // 5 second threshold
    });

    it('should efficiently retrieve large response sets', async () => {
      // Create 100 test responses
      const createPromises = Array(100).fill(null).map(() => 
        responseService.createResponse({
          exerciseId: mockExerciseId,
          injectId: mockInjectId,
          participantId: mockParticipantId,
          content: faker.lorem.paragraph()
        })
      );
      await Promise.all(createPromises);

      const startTime = Date.now();
      const responses = await responseService.getExerciseResponses(mockExerciseId);
      const executionTime = Date.now() - startTime;

      expect(responses.length).toBeGreaterThanOrEqual(100);
      expect(executionTime).toBeLessThan(1000); // 1 second threshold
    });
  });

  describe('Compliance Analysis', () => {
    beforeEach(async () => {
      // Create and validate multiple responses with varying compliance gaps
      const responses = await Promise.all(Array(10).fill(null).map(async () => {
        const response = await responseService.createResponse({
          exerciseId: mockExerciseId,
          injectId: mockInjectId,
          participantId: mockParticipantId,
          content: faker.lorem.paragraph()
        });
        
        await responseService.submitResponse(response.id);
        
        return responseService.validateResponse(response.id, {
          validation: faker.helpers.arrayElement([
            ResponseValidation.MEETS_EXPECTATIONS,
            ResponseValidation.PARTIALLY_MEETS
          ]),
          validatorNotes: faker.lorem.sentence(),
          complianceGaps: faker.helpers.arrayElements(['GAP-001', 'GAP-002', 'GAP-003'], 2)
        });
      }));
    });

    it('should analyze response compliance patterns', async () => {
      const analysis = await responseService.analyzeResponses(mockExerciseId);

      expect(analysis).toBeDefined();
      expect(analysis.complianceCoverage).toBeGreaterThan(0);
      expect(analysis.metrics).toBeDefined();
      expect(analysis.metrics.validationRate).toBeGreaterThan(0);
    });
  });
});