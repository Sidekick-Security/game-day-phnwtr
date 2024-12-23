/**
 * Encryption Utility Module
 * Provides cryptographic functions for secure data handling with enhanced security controls
 * @version 1.0.0
 * @package @gameday/shared
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt'; // v5.1.0
import { IConfig } from '../interfaces/config.interface';

// Constants for encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const HMAC_ALGORITHM = 'sha256';

/**
 * Custom error class for encryption-related errors
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Validates input parameters for encryption operations
 * @param params - Object containing parameters to validate
 * @throws {EncryptionError} If validation fails
 */
const validateParams = (params: Record<string, any>): void => {
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      throw new EncryptionError(`Invalid parameter: ${key} cannot be null/undefined/empty`);
    }
  }
};

/**
 * Encrypts data using AES-256-GCM with authentication tag
 * @param data - Data to encrypt
 * @param key - Encryption key
 * @returns Promise resolving to encrypted data with IV and auth tag
 * @throws {EncryptionError} If encryption fails
 */
export const encrypt = async (
  data: string,
  key: string
): Promise<{ encryptedData: string; iv: string; tag: string }> => {
  try {
    // Validate input parameters
    validateParams({ data, key });

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Validate key length for AES-256
    const keyBuffer = Buffer.from(key);
    if (keyBuffer.length !== 32) {
      throw new EncryptionError('Invalid key length for AES-256');
    }

    // Create cipher and encrypt
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data, 'utf8')),
      cipher.final()
    ]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Implement constant-time encoding
    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Encryption failed'
    );
  }
};

/**
 * Decrypts AES-256-GCM encrypted data with authentication
 * @param encryptedData - Data to decrypt
 * @param key - Decryption key
 * @param iv - Initialization vector
 * @param tag - Authentication tag
 * @returns Promise resolving to decrypted data
 * @throws {EncryptionError} If decryption or authentication fails
 */
export const decrypt = async (
  encryptedData: string,
  key: string,
  iv: string,
  tag: string
): Promise<string> => {
  try {
    // Validate input parameters
    validateParams({ encryptedData, key, iv, tag });

    // Convert parameters from base64
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    const keyBuffer = Buffer.from(key);
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    // Validate IV and tag length
    if (ivBuffer.length !== IV_LENGTH) {
      throw new EncryptionError('Invalid IV length');
    }
    if (tagBuffer.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError('Invalid authentication tag length');
    }

    // Create decipher
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Decryption failed'
    );
  }
};

/**
 * Hashes password using bcrypt with salt
 * @param password - Password to hash
 * @returns Promise resolving to hashed password
 * @throws {EncryptionError} If password validation or hashing fails
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    // Validate password
    validateParams({ password });
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new EncryptionError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Verify hash format
    if (!hashedPassword.startsWith('$2b$')) {
      throw new EncryptionError('Invalid bcrypt hash format');
    }

    return hashedPassword;
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Password hashing failed'
    );
  }
};

/**
 * Compares password with hashed password using constant-time comparison
 * @param password - Plain text password
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to boolean indicating if passwords match
 * @throws {EncryptionError} If comparison fails
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    // Validate input parameters
    validateParams({ password, hashedPassword });

    // Verify hash format
    if (!hashedPassword.startsWith('$2b$')) {
      throw new EncryptionError('Invalid bcrypt hash format');
    }

    // Compare passwords using constant-time comparison
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Password comparison failed'
    );
  }
};

/**
 * Generates HMAC signature for data
 * @param data - Data to sign
 * @param key - Signing key
 * @returns HMAC signature
 * @throws {EncryptionError} If signature generation fails
 */
export const generateSignature = (data: string, key: string): string => {
  try {
    // Validate input parameters
    validateParams({ data, key });

    // Create HMAC and generate signature
    const hmac = createHmac(HMAC_ALGORITHM, key);
    hmac.update(data);
    const signature = hmac.digest('hex');

    // Validate signature length
    if (signature.length !== 64) { // SHA-256 produces 32 bytes = 64 hex chars
      throw new EncryptionError('Invalid signature length');
    }

    return signature;
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Signature generation failed'
    );
  }
};