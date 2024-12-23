/**
 * InjectControl Component
 * Provides comprehensive inject management and control capabilities during exercise execution
 * with real-time updates and enhanced accessibility features.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, differenceInSeconds } from 'date-fns';
import { useErrorBoundary } from 'react-error-boundary';

import { IExerciseInject } from '../../interfaces/exercise.interface';
import { useExercise } from '../../hooks/useExercise';
import { useWebSocket } from '../../hooks/useWebSocket';
import { InjectStatus } from '../../types/exercise.types';

interface InjectControlProps {
  exerciseId: string;
  currentInject: IExerciseInject;
  onInjectDelivery?: (inject: IExerciseInject) => void;
  onInjectSkip?: (inject: IExerciseInject) => void;
  onInjectComplete?: (inject: IExerciseInject) => void;
}

export const InjectControl: React.FC<InjectControlProps> = ({
  exerciseId,
  currentInject,
  onInjectDelivery,
  onInjectSkip,
  onInjectComplete
}) => {
  // State management
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Custom hooks
  const { exercise, updateInjectStatus } = useExercise(exerciseId);
  const { showBoundary } = useErrorBoundary();
  const { emit, subscribe } = useWebSocket(`exercises/${exerciseId}/injects`);

  // Refs for cleanup
  const timerRef = useRef<NodeJS.Timeout>();
  const announcementRef = useRef<HTMLDivElement>(null);

  /**
   * Calculates and formats remaining time for current inject
   */
  const calculateRemainingTime = useCallback((scheduledTime: Date): string => {
    const diffInSeconds = differenceInSeconds(new Date(scheduledTime), new Date());
    
    if (diffInSeconds <= 0) {
      return 'Overdue';
    }

    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Handles inject delivery with real-time updates
   */
  const handleInjectDelivery = async () => {
    if (isDelivering || currentInject.status === InjectStatus.DELIVERED) {
      return;
    }

    try {
      setIsDelivering(true);
      setDeliveryError(null);

      // Emit WebSocket event for real-time delivery
      await emit('inject.deliver', {
        exerciseId,
        injectId: currentInject.id,
        timestamp: new Date().toISOString()
      });

      // Update inject status
      await updateInjectStatus(currentInject.id, InjectStatus.DELIVERED);

      // Announce delivery for screen readers
      if (announcementRef.current) {
        announcementRef.current.textContent = `Inject ${currentInject.title} delivered successfully`;
      }

      onInjectDelivery?.(currentInject);

    } catch (error: any) {
      setDeliveryError(error.message);
      showBoundary(error);
    } finally {
      setIsDelivering(false);
    }
  };

  /**
   * Handles inject skip with compliance validation
   */
  const handleInjectSkip = async () => {
    try {
      await updateInjectStatus(currentInject.id, InjectStatus.COMPLETED);
      
      // Emit skip event
      await emit('inject.skip', {
        exerciseId,
        injectId: currentInject.id,
        timestamp: new Date().toISOString()
      });

      onInjectSkip?.(currentInject);

    } catch (error: any) {
      showBoundary(error);
    }
  };

  /**
   * Updates timer display
   */
  useEffect(() => {
    const updateTimer = () => {
      if (currentInject.scheduledTime) {
        setRemainingTime(calculateRemainingTime(currentInject.scheduledTime));
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentInject.scheduledTime, calculateRemainingTime]);

  /**
   * Subscribes to WebSocket events
   */
  useEffect(() => {
    const handleInjectUpdate = (data: any) => {
      if (data.injectId === currentInject.id) {
        updateInjectStatus(data.injectId, data.status);
      }
    };

    subscribe('inject.update', handleInjectUpdate);

    return () => {
      // Cleanup subscriptions
    };
  }, [currentInject.id, subscribe, updateInjectStatus]);

  return (
    <div 
      className="inject-control"
      role="region"
      aria-label="Inject Control Panel"
    >
      {/* Accessibility announcement region */}
      <div
        ref={announcementRef}
        className="sr-only"
        role="status"
        aria-live="polite"
      />

      {/* Inject details */}
      <div className="inject-details">
        <h3 className="inject-title" id="current-inject">
          {currentInject.title}
        </h3>
        <p className="inject-description">
          {currentInject.description}
        </p>
      </div>

      {/* Timer display */}
      <div 
        className="inject-timer"
        aria-label="Remaining Time"
      >
        <span className="timer-label">Time Remaining:</span>
        <span className="timer-value" aria-live="polite">
          {remainingTime}
        </span>
      </div>

      {/* Control buttons */}
      <div className="inject-controls" role="toolbar">
        <button
          className="deliver-button"
          onClick={handleInjectDelivery}
          disabled={isDelivering || currentInject.status === InjectStatus.DELIVERED}
          aria-busy={isDelivering}
        >
          {isDelivering ? 'Delivering...' : 'Deliver Inject'}
        </button>

        <button
          className="skip-button"
          onClick={handleInjectSkip}
          disabled={isDelivering}
        >
          Skip Inject
        </button>
      </div>

      {/* Response tracking */}
      {currentInject.responseRequired && (
        <div className="response-tracking">
          <h4>Required Responses:</h4>
          <ul>
            {currentInject.completionCriteria.map((criteria, index) => (
              <li key={index} className="criteria-item">
                {criteria}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error display */}
      {deliveryError && (
        <div 
          className="error-message" 
          role="alert"
          aria-live="assertive"
        >
          {deliveryError}
        </div>
      )}
    </div>
  );
};

export default InjectControl;