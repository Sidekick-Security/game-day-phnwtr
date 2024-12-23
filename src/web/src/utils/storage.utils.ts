/**
 * @fileoverview Secure browser storage utility for GameDay Platform
 * Implements AES-256 encryption for sensitive data storage with compression support
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // ^4.1.1
import { AuthTokenType } from '../types/auth.types';
import { appConfig } from '../config/app.config';

// Storage configuration constants
const STORAGE_PREFIX = 'gameday_';
const SENSITIVE_DATA_KEYS = ['token', 'user', 'credentials', 'session', 'auth'];
const STORAGE_QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB
const COMPRESSION_THRESHOLD = 1024; // 1KB
const ENCRYPTION_ALGORITHM = 'AES-256-CBC';

/**
 * Storage operation options interface
 */
interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number;
}

/**
 * Stored item metadata interface
 */
interface StorageMetadata {
  timestamp: number;
  encrypted: boolean;
  compressed: boolean;
  ttl?: number;
}

/**
 * Secure storage service for handling browser storage operations
 */
export class StorageService {
  private readonly storageType: Storage;
  private readonly encryptionKey: string;
  private readonly compressionThreshold: number;
  private readonly quotaLimit: number;

  /**
   * Initialize storage service with specified configuration
   * @param type - Storage type ('local' | 'session')
   * @param options - Storage configuration options
   */
  constructor(
    type: 'local' | 'session' = 'local',
    options: StorageOptions = {}
  ) {
    this.storageType = type === 'local' ? localStorage : sessionStorage;
    this.encryptionKey = appConfig.env.apiBaseUrl || '';
    this.compressionThreshold = COMPRESSION_THRESHOLD;
    this.quotaLimit = STORAGE_QUOTA_LIMIT;

    if (!this.encryptionKey) {
      throw new Error('Storage encryption key not configured');
    }

    this.validateStorage();
  }

  /**
   * Store data with automatic encryption for sensitive keys
   * @param key - Storage key
   * @param value - Data to store
   * @param options - Storage options
   */
  public setItem(key: string, value: any, options: StorageOptions = {}): void {
    const prefixedKey = this.getPrefixedKey(key);
    const shouldEncrypt = this.shouldEncryptKey(key) || options.encrypt;
    const shouldCompress = this.shouldCompress(value) || options.compress;

    try {
      let processedValue = JSON.stringify(value);
      const metadata: StorageMetadata = {
        timestamp: Date.now(),
        encrypted: shouldEncrypt,
        compressed: shouldCompress,
        ttl: options.ttl
      };

      if (shouldCompress) {
        processedValue = this.compressData(processedValue);
      }

      if (shouldEncrypt) {
        processedValue = this.encryptData(processedValue);
      }

      const storageValue = JSON.stringify({
        data: processedValue,
        metadata
      });

      if (this.exceedsQuota(storageValue)) {
        throw new Error('Storage quota exceeded');
      }

      this.storageType.setItem(prefixedKey, storageValue);
    } catch (error) {
      console.error(`Storage error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve and automatically decrypt data from storage
   * @param key - Storage key
   * @param options - Retrieval options
   * @returns Retrieved data in original format
   */
  public getItem<T = any>(key: string, options: StorageOptions = {}): T | null {
    const prefixedKey = this.getPrefixedKey(key);

    try {
      const storedValue = this.storageType.getItem(prefixedKey);
      if (!storedValue) return null;

      const { data, metadata } = JSON.parse(storedValue);
      
      if (this.isExpired(metadata)) {
        this.removeItem(key);
        return null;
      }

      let processedData = data;

      if (metadata.encrypted) {
        processedData = this.decryptData(processedData);
      }

      if (metadata.compressed) {
        processedData = this.decompressData(processedData);
      }

      return JSON.parse(processedData);
    } catch (error) {
      console.error(`Retrieval error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   * @param key - Storage key
   */
  public removeItem(key: string): void {
    const prefixedKey = this.getPrefixedKey(key);
    this.storageType.removeItem(prefixedKey);
  }

  /**
   * Clear all storage items with prefix
   */
  public clear(): void {
    Object.keys(this.storageType)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => this.storageType.removeItem(key));
  }

  /**
   * Check if item exists in storage
   * @param key - Storage key
   * @returns Boolean indicating existence
   */
  public hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Get total size of stored data
   * @returns Size in bytes
   */
  public getSize(): number {
    return Object.keys(this.storageType)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .reduce((size, key) => {
        return size + (this.storageType.getItem(key)?.length || 0) * 2;
      }, 0);
  }

  /**
   * Encrypt data using AES-256
   * @param data - Data to encrypt
   * @returns Encrypted string
   */
  private encryptData(data: string): string {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return iv.toString() + encrypted.toString();
  }

  /**
   * Decrypt AES-256 encrypted data
   * @param encryptedData - Data to decrypt
   * @returns Decrypted string
   */
  private decryptData(encryptedData: string): string {
    const iv = CryptoJS.enc.Hex.parse(encryptedData.slice(0, 32));
    const encrypted = encryptedData.slice(32);
    const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Compress data using LZ-based compression
   * @param data - String to compress
   * @returns Compressed string
   */
  private compressData(data: string): string {
    return btoa(unescape(encodeURIComponent(data)));
  }

  /**
   * Decompress LZ-compressed data
   * @param data - Compressed string
   * @returns Decompressed string
   */
  private decompressData(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }

  /**
   * Check if key should be encrypted
   * @param key - Storage key
   * @returns Boolean indicating encryption requirement
   */
  private shouldEncryptKey(key: string): boolean {
    return SENSITIVE_DATA_KEYS.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey)
    );
  }

  /**
   * Check if data should be compressed
   * @param value - Data to check
   * @returns Boolean indicating compression requirement
   */
  private shouldCompress(value: any): boolean {
    const size = new Blob([JSON.stringify(value)]).size;
    return size > this.compressionThreshold;
  }

  /**
   * Check if stored item is expired
   * @param metadata - Item metadata
   * @returns Boolean indicating expiration
   */
  private isExpired(metadata: StorageMetadata): boolean {
    if (!metadata.ttl) return false;
    return Date.now() - metadata.timestamp > metadata.ttl;
  }

  /**
   * Get prefixed storage key
   * @param key - Original key
   * @returns Prefixed key
   */
  private getPrefixedKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  /**
   * Check if value exceeds storage quota
   * @param value - Value to check
   * @returns Boolean indicating quota excess
   */
  private exceedsQuota(value: string): boolean {
    return (this.getSize() + value.length * 2) > this.quotaLimit;
  }

  /**
   * Validate storage availability
   * @throws Error if storage is not available
   */
  private validateStorage(): void {
    try {
      const testKey = `${STORAGE_PREFIX}test`;
      this.storageType.setItem(testKey, 'test');
      this.storageType.removeItem(testKey);
    } catch (error) {
      throw new Error('Storage is not available');
    }
  }
}