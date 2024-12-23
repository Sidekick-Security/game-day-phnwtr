/**
 * Custom React hook for managing WebSocket connections in the GameDay Platform
 * Provides real-time communication with enhanced error handling and automatic reconnection
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // ^18.2.0
import WebSocketService, { WebSocketEventType } from '../services/websocket.service';
import { apiConfig } from '../config/api.config';

/**
 * Connection states for detailed status tracking
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * WebSocket hook configuration options
 */
interface WebSocketOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
  secure?: boolean;
}

/**
 * WebSocket hook error interface
 */
interface WebSocketError {
  message: string;
  code?: string;
  timestamp: string;
}

/**
 * WebSocket subscription callback type
 */
type SubscriptionCallback = (data: any) => void | Promise<void>;

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  autoConnect: true,
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  connectionTimeout: 30000,
  secure: true
};

/**
 * Custom hook for WebSocket functionality
 * @param namespace - WebSocket namespace for connection
 * @param options - WebSocket configuration options
 */
export const useWebSocket = (
  namespace: string,
  options: WebSocketOptions = {}
) => {
  // Merge default options with provided options
  const wsOptions = { ...DEFAULT_OPTIONS, ...options };

  // Initialize state and refs
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<WebSocketError | null>(null);
  const wsService = useRef<WebSocketService | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Validates namespace format
   */
  const validateNamespace = useCallback((ns: string): boolean => {
    return /^[a-zA-Z0-9-_/]+$/.test(ns);
  }, []);

  /**
   * Initializes WebSocket service
   */
  const initializeService = useCallback(() => {
    if (!wsService.current) {
      wsService.current = new WebSocketService({
        autoReconnect: wsOptions.autoReconnect,
        reconnectAttempts: wsOptions.reconnectAttempts,
        reconnectDelay: wsOptions.reconnectDelay,
        connectionTimeout: wsOptions.connectionTimeout
      });
    }
  }, [wsOptions]);

  /**
   * Handles connection establishment
   */
  const connect = useCallback(async () => {
    if (!validateNamespace(namespace)) {
      throw new Error('Invalid namespace format');
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      initializeService();

      await wsService.current?.connect(namespace, {
        secure: wsOptions.secure,
        autoReconnect: wsOptions.autoReconnect
      });

      setConnectionState(ConnectionState.CONNECTED);
      setError(null);
      reconnectAttempts.current = 0;
    } catch (err: any) {
      setConnectionState(ConnectionState.ERROR);
      setError({
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
      handleReconnection();
    }
  }, [namespace, wsOptions, validateNamespace, initializeService]);

  /**
   * Handles connection termination
   */
  const disconnect = useCallback(async () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    await wsService.current?.disconnect();
    setConnectionState(ConnectionState.DISCONNECTED);
    reconnectAttempts.current = 0;
  }, []);

  /**
   * Manages automatic reconnection with exponential backoff
   */
  const handleReconnection = useCallback(() => {
    if (!wsOptions.autoReconnect || 
        reconnectAttempts.current >= wsOptions.reconnectAttempts) {
      return;
    }

    setConnectionState(ConnectionState.RECONNECTING);
    reconnectAttempts.current++;

    const delay = wsOptions.reconnectDelay * 
      Math.pow(1.5, reconnectAttempts.current - 1);

    reconnectTimer.current = setTimeout(() => {
      connect().catch(() => handleReconnection());
    }, delay);
  }, [wsOptions, connect]);

  /**
   * Subscribes to WebSocket events
   */
  const subscribe = useCallback((
    event: WebSocketEventType,
    callback: SubscriptionCallback
  ) => {
    if (!wsService.current) {
      throw new Error('WebSocket service not initialized');
    }

    wsService.current.subscribe(event, callback);
  }, []);

  /**
   * Unsubscribes from WebSocket events
   */
  const unsubscribe = useCallback((
    event: WebSocketEventType,
    callback: SubscriptionCallback
  ) => {
    wsService.current?.unsubscribe(event, callback);
  }, []);

  /**
   * Emits events to WebSocket server
   */
  const emit = useCallback(async (
    event: WebSocketEventType,
    data: any
  ): Promise<void> => {
    if (!wsService.current) {
      throw new Error('WebSocket service not initialized');
    }

    try {
      await wsService.current.emit(event, data);
    } catch (err: any) {
      setError({
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }, []);

  /**
   * Manages connection lifecycle
   */
  useEffect(() => {
    if (wsOptions.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, wsOptions.autoConnect]);

  return {
    isConnected: connectionState === ConnectionState.CONNECTED,
    connectionState,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit
  };
};

export default useWebSocket;