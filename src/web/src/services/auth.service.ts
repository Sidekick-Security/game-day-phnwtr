/**
 * Authentication Service for GameDay Platform
 * Implements comprehensive authentication, token management, and session validation
 * with enhanced security features and monitoring.
 * @version 1.0.0
 */

import jwtDecode from 'jwt-decode'; // ^4.0.0
import rateLimit from 'axios-rate-limit'; // ^1.3.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { IAuthRequest, IAuthResponse } from '../interfaces/auth.interface';
import { AuthProvider } from '../types/auth.types';
import { authConfig } from '../config/auth.config';
import { apiClient } from '../utils/api.utils';

// Constants for token storage and timing
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const DEVICE_ID_KEY = 'device_id';
const SESSION_TIMEOUT = authConfig.session.inactivityTimeout * 1000;
const MAX_LOGIN_ATTEMPTS = authConfig.rateLimit.maxAttempts;
const RATE_LIMIT_WINDOW = authConfig.rateLimit.windowMs;

/**
 * Enhanced Authentication Service Class
 * Implements comprehensive authentication flows with security features
 */
export class AuthService {
  private refreshTokenTimeout?: NodeJS.Timeout;
  private currentUser: any = null;
  private deviceId: string;
  private rateLimiter: any;
  private sessionInactivityTimer?: NodeJS.Timeout;
  private loginAttempts: number = 0;
  private lastLoginAttempt: number = 0;

  constructor() {
    // Initialize rate limiter for login attempts
    this.rateLimiter = rateLimit(apiClient, {
      maxRequests: MAX_LOGIN_ATTEMPTS,
      perMilliseconds: RATE_LIMIT_WINDOW,
    });

    // Generate or retrieve device fingerprint
    this.deviceId = localStorage.getItem(DEVICE_ID_KEY) || this.generateDeviceId();
    
    // Initialize session monitoring
    this.initializeSessionMonitoring();
    
    // Load existing auth state
    this.loadAuthState();
  }

  /**
   * Authenticate user with comprehensive security checks
   * @param request Authentication request payload
   * @returns Promise resolving to authentication response
   */
  public async login(request: IAuthRequest): Promise<IAuthResponse> {
    try {
      // Check rate limiting
      if (!this.checkLoginRateLimit()) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Enhance request with security metadata
      const enhancedRequest = {
        ...request,
        deviceId: this.deviceId,
        clientMetadata: this.getClientMetadata(),
      };

      // Make authentication request
      const response = await this.rateLimiter.post(
        '/auth/login',
        enhancedRequest
      );

      // Validate response
      if (!response.data || !response.data.accessToken) {
        throw new Error('Invalid authentication response');
      }

      // Handle MFA if required
      if (response.data.mfaRequired && !request.mfaToken) {
        return this.handleMFAChallenge(response.data);
      }

      // Store authentication state
      this.setAuthState(response.data);

      // Setup token refresh and session monitoring
      this.startRefreshTokenTimer(response.data.expiresIn);
      this.startSessionMonitoring();

      return response.data;
    } catch (error: any) {
      this.handleLoginFailure();
      throw error;
    }
  }

  /**
   * Terminate user session with comprehensive cleanup
   */
  public async logout(): Promise<void> {
    try {
      // Notify server of logout
      if (this.isAuthenticated()) {
        await apiClient.post('/auth/logout', {
          deviceId: this.deviceId,
        });
      }

      // Clear all auth state
      this.clearAuthState();
      
      // Reset security measures
      this.loginAttempts = 0;
      this.lastLoginAttempt = 0;
      
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Ensure cleanup happens even if server request fails
      this.clearAuthState();
    }
  }

  /**
   * Refresh authentication tokens with enhanced validation
   */
  public async refreshToken(): Promise<IAuthResponse> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Validate device fingerprint
      if (!this.validateDeviceFingerprint()) {
        throw new Error('Invalid device fingerprint');
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
        deviceId: this.deviceId,
      });

      // Validate response and token claims
      if (!this.validateTokenClaims(response.data.accessToken)) {
        throw new Error('Invalid token claims');
      }

      // Update auth state
      this.setAuthState(response.data);
      
      // Reset timers
      this.startRefreshTokenTimer(response.data.expiresIn);
      this.resetSessionTimer();

      return response.data;
    } catch (error) {
      this.handleTokenRefreshFailure();
      throw error;
    }
  }

  /**
   * Validate authentication token with comprehensive checks
   */
  public validateToken(token: string): boolean {
    try {
      if (!token) return false;

      const decoded: any = jwtDecode(token);
      
      // Check token expiration
      if (decoded.exp * 1000 < Date.now()) {
        return false;
      }

      // Validate issuer and audience
      if (decoded.iss !== authConfig.jwt.issuer || 
          decoded.aud !== authConfig.jwt.audience) {
        return false;
      }

      // Validate device binding
      if (decoded.deviceId && decoded.deviceId !== this.deviceId) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate current session state with security checks
   */
  public async validateSession(): Promise<boolean> {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!token || !this.validateToken(token)) {
        return false;
      }

      // Verify device fingerprint
      if (!this.validateDeviceFingerprint()) {
        return false;
      }

      // Check session activity
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity && Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT) {
        await this.logout();
        return false;
      }

      // Update activity timestamp
      this.updateLastActivity();
      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private setAuthState(authResponse: IAuthResponse): void {
    localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
    localStorage.setItem('last_activity', Date.now().toString());
    this.currentUser = authResponse.user;
  }

  private clearAuthState(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('last_activity');
    this.stopRefreshTokenTimer();
    this.stopSessionMonitoring();
    this.currentUser = null;
  }

  private generateDeviceId(): string {
    const deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  private validateDeviceFingerprint(): boolean {
    const storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    return storedDeviceId === this.deviceId;
  }

  private startSessionMonitoring(): void {
    this.sessionInactivityTimer = setInterval(() => {
      this.validateSession();
    }, 60000); // Check every minute
  }

  private stopSessionMonitoring(): void {
    if (this.sessionInactivityTimer) {
      clearInterval(this.sessionInactivityTimer);
    }
  }

  private updateLastActivity(): void {
    localStorage.setItem('last_activity', Date.now().toString());
  }

  private startRefreshTokenTimer(expiresIn: number): void {
    this.stopRefreshTokenTimer();
    // Refresh token 1 minute before expiry
    const timeout = (expiresIn - 60) * 1000;
    this.refreshTokenTimeout = setTimeout(() => {
      this.refreshToken();
    }, timeout);
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  private checkLoginRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastLoginAttempt < RATE_LIMIT_WINDOW) {
      if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        return false;
      }
    } else {
      this.loginAttempts = 0;
    }
    this.loginAttempts++;
    this.lastLoginAttempt = now;
    return true;
  }

  private validateTokenClaims(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      return (
        decoded.iss === authConfig.jwt.issuer &&
        decoded.aud === authConfig.jwt.audience &&
        decoded.deviceId === this.deviceId
      );
    } catch {
      return false;
    }
  }

  private getClientMetadata(): Record<string, unknown> {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };
  }

  private handleLoginFailure(): void {
    this.loginAttempts++;
    this.lastLoginAttempt = Date.now();
  }

  private handleTokenRefreshFailure(): void {
    this.clearAuthState();
  }

  private async handleMFAChallenge(response: any): Promise<IAuthResponse> {
    // Store MFA challenge data
    localStorage.setItem('mfa_challenge', response.challengeId);
    return response;
  }

  private loadAuthState(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && this.validateToken(token)) {
      this.currentUser = jwtDecode(token);
      this.startSessionMonitoring();
    }
  }

  private initializeSessionMonitoring(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === TOKEN_KEY && !event.newValue) {
        this.clearAuthState();
      }
    });
  }
}

export default new AuthService();