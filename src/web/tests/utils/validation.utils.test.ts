import { describe, it, expect } from '@jest/globals';
import { 
  validateEmail, 
  validatePassword, 
  validateExerciseConfig, 
  validateLoginCredentials 
} from '../../src/utils/validation.utils';
import { ExerciseType } from '../../src/types/exercise.types';

describe('Email Validation', () => {
  // Valid email tests
  it('should validate correct email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.user@company.com',
      'valid+email@organization.com',
      'firstname.lastname@company.com',
      'user123@organization.com'
    ];

    validEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // Invalid email tests
  it('should reject invalid email formats', () => {
    const invalidEmails = [
      '',
      'invalid.email',
      '@nodomain.com',
      'spaces in@email.com',
      'missing@.com',
      'double@@domain.com',
      'toolong'.repeat(50) + '@domain.com'
    ];

    invalidEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // Security-focused tests
  it('should detect and block disposable email domains', () => {
    const disposableEmails = [
      'test@tempmail.com',
      'user@disposable.com'
    ];

    disposableEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email domain not allowed');
    });
  });

  // Organization domain validation
  it('should validate organization domain restrictions', () => {
    const result = validateEmail('user@company.com');
    expect(result.isValid).toBe(true);
    expect(result.details?.domain).toBe('company.com');
  });
});

describe('Password Validation', () => {
  // Valid password tests
  it('should validate strong passwords', () => {
    const validPasswords = [
      'ValidP@ssw0rd123',
      'Str0ng!Password',
      'C0mpl3x#P@ssphrase',
      'Ultra$ecure2024!'
    ];

    validPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details?.strengthScore).toBeGreaterThanOrEqual(3);
    });
  });

  // Invalid password tests
  it('should reject weak passwords', () => {
    const invalidPasswords = [
      'short',
      'nouppercasepass1!',
      'NOLOWERCASE123!',
      'NoSpecialChar123',
      'No1numbers!'
    ];

    invalidPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // Password history validation
  it('should prevent password reuse', () => {
    const password = 'ValidP@ssw0rd123';
    const result = validatePassword(password, {
      checkHistory: true,
      previousPasswords: ['ValidP@ssw0rd123']
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password has been used previously');
  });

  // Complexity requirements
  it('should enforce password complexity requirements', () => {
    const result = validatePassword('SimplePassword123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });
});

describe('Exercise Configuration Validation', () => {
  // Valid exercise config test
  it('should validate correct exercise configurations', () => {
    const validConfig = {
      type: ExerciseType.SECURITY_INCIDENT,
      title: 'Ransomware Response Exercise',
      description: 'Test organizational response to ransomware attack',
      participants: [
        { id: 'user1', role: 'facilitator' },
        { id: 'user2', role: 'participant' }
      ],
      schedule: {
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        duration: 60
      }
    };

    const result = validateExerciseConfig(validConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Invalid exercise type test
  it('should reject invalid exercise types', () => {
    const invalidConfig = {
      type: 'INVALID_TYPE' as ExerciseType,
      title: 'Test Exercise',
      description: 'Test description',
      participants: [{ id: 'user1', role: 'participant' }],
      schedule: {
        startTime: new Date(),
        duration: 60
      }
    };

    const result = validateExerciseConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid exercise type');
  });

  // Participant validation
  it('should validate participant requirements', () => {
    const configWithoutParticipants = {
      type: ExerciseType.SECURITY_INCIDENT,
      title: 'Test Exercise',
      description: 'Test description',
      participants: [],
      schedule: {
        startTime: new Date(Date.now() + 86400000),
        duration: 60
      }
    };

    const result = validateExerciseConfig(configWithoutParticipants);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid number of participants (2-50 required)');
  });

  // Schedule validation
  it('should validate exercise schedule constraints', () => {
    const pastScheduleConfig = {
      type: ExerciseType.SECURITY_INCIDENT,
      title: 'Test Exercise',
      description: 'Test description',
      participants: [
        { id: 'user1', role: 'facilitator' },
        { id: 'user2', role: 'participant' }
      ],
      schedule: {
        startTime: new Date(Date.now() - 86400000), // Yesterday
        duration: 60
      }
    };

    const result = validateExerciseConfig(pastScheduleConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Start time must be in the future');
  });
});

describe('Login Credentials Validation', () => {
  // Valid credentials test
  it('should validate correct login credentials', () => {
    const validCredentials = {
      email: 'user@company.com',
      password: 'ValidP@ssw0rd123',
      provider: 'oauth',
      rememberMe: true
    };

    const result = validateLoginCredentials(validCredentials);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details?.requiresMFA).toBe(true);
  });

  // Invalid credentials test
  it('should reject invalid login credentials', () => {
    const invalidCredentials = {
      email: 'invalid.email',
      password: 'weak',
      provider: 'oauth',
      rememberMe: false
    };

    const result = validateLoginCredentials(invalidCredentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // Combined validation test
  it('should perform comprehensive credential validation', () => {
    const credentials = {
      email: 'test@disposable.com',
      password: 'ValidP@ssw0rd123',
      provider: 'oauth',
      rememberMe: true
    };

    const result = validateLoginCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email domain not allowed');
  });
});