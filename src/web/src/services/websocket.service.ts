/**
 * WebSocket Service for GameDay Platform
 * Manages real-time communication with enhanced error handling, reconnection logic,
 * and connection lifecycle management.
 * @version 1.0.0
 */

import { io, Socket } from 'socket.io-client'; // ^4.7.0
import { apiConfig } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * WebSocket event types for type-safe event handling
 */
export enum WebSocketEventType {
  // Exercise Events
  EXERCISE_START = 'exercise.start',
  EXERCISE_STOP = 'exercise.stop',
  INJECT_DELIVER = 'inject.deliver',
  RESPONSE_SUBMIT = 'response.submit',
  EXERCISE_UPDATE = 'exercise.update',
  PARTICIPANT_STATUS = 'participant.status',

  // Analytics Events
  ANALYTICS_UPDATE = 'analytics.update',
  ANALYTICS_METRICS = 'analytics.metrics',
  ANALYTICS_PERFORMANCE = 'analytics.performance',

  // Connection Events
  CONNECTION_ERROR = 'connection.error',
  CONNECTION_TIMEOUT = 'connection.timeout',
  CONNECTION_RECONNECTING = 'connection.reconnecting'
}

/**
 * WebSocket connection options interface
 */
interface WebSocketOptions {
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
  secure?: boolean;
}

/**
 * Event callback type definition
 */
type EventCallback = (data: any) => void | Promise<void>;

/**
 * WebSocket service class for managing real-time connections
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private connectionTimeout: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;

  constructor(options: WebSocketOptions = {}) {
    this.maxReconnectAttempts = options.reconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.connectionTimeout = options.connectionTimeout || 5000;
  }

  /**
   * Establishes WebSocket connection with namespace
   * @param namespace - WebSocket namespace
   * @param options - Connection options
   */
  public async connect(namespace: string, options: WebSocketOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${apiConfig.baseURL}/${namespace}`;
        
        this.socket = io(wsUrl, {
          transports: ['websocket'],
          secure: options.secure ?? true,
          reconnection: options.autoReconnect ?? true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: this.connectionTimeout
        });

        // Connection event handlers
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          this.handleDisconnect();
        });

        this.socket.on('error', (error) => {
          this.handleError(error);
          reject(error);
        });

        // Set connection timeout
        const timeoutId = setTimeout(() => {
          if (!this.isConnected) {
            this.socket?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.connectionTimeout);

        this.socket.on('connect', () => clearTimeout(timeoutId));

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnects WebSocket connection and performs cleanup
   */
  public async disconnect(): Promise<void> {
    if (this.socket) {
      this.clearReconnectTimer();
      this.eventListeners.clear();
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Subscribes to WebSocket events with type-safe callbacks
   * @param event - WebSocket event type
   * @param callback - Event callback function
   */
  public subscribe(event: WebSocketEventType, callback: EventCallback): void {
    if (!this.socket) {
      throw new Error('Socket connection not established');
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    listeners.add(callback);

    this.socket.on(event, async (data: any) => {
      try {
        await callback(data);
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * Unsubscribes from WebSocket events
   * @param event - WebSocket event type
   * @param callback - Event callback function
   */
  public unsubscribe(event: WebSocketEventType, callback: EventCallback): void {
    if (!this.socket) {
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
        this.socket.off(event);
      }
    }
  }

  /**
   * Emits events to WebSocket server with payload validation
   * @param event - WebSocket event type
   * @param data - Event payload
   */
  public async emit(event: WebSocketEventType, data: any): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket!.emit(event, data, (response: any) => {
          if (response?.error) {
            reject(response.error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Checks if socket is currently connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected && !!this.socket?.connected;
  }

  /**
   * Handles WebSocket errors
   * @param error - Error object
   */
  private handleError(error: any): void {
    console.error('WebSocket error:', error);
    this.emit(WebSocketEventType.CONNECTION_ERROR, {
      message: error.message,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }

  /**
   * Handles WebSocket disconnection
   */
  private handleDisconnect(): void {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      this.emit(WebSocketEventType.CONNECTION_RECONNECTING, {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        delay
      }).catch(console.error);

      this.reconnectTimer = setTimeout(() => {
        this.socket?.connect();
      }, delay);
    }
  }

  /**
   * Clears reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export default WebSocketService;