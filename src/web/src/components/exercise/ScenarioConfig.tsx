import React, { useState, useCallback, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  FormControlLabel, 
  CircularProgress, 
  Alert 
} from '@mui/material'; // ^5.0.0
import { debounce } from 'lodash'; // ^4.17.21

import { ExerciseType } from '../../types/exercise.types';
import { Select } from '../common/Select';
import { ExerciseService } from '../../services/exercise.service';

// Constants for scenario configuration
const COMPLEXITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low - Basic scenario with minimal variables',
    aiRequirements: { minTokens: 1000, maxTokens: 2000 }
  },
  {
    value: 'medium',
    label: 'Medium - Moderate complexity with multiple decision points',
    aiRequirements: { minTokens: 2000, maxTokens: 4000 }
  },
  {
    value: 'high',
    label: 'High - Complex scenario with interdependent events',
    aiRequirements: { minTokens: 4000, maxTokens: 8000 }
  }
];

const EXERCISE_TYPE_OPTIONS = [
  { value: ExerciseType.SECURITY_INCIDENT, label: 'Security Incident Response', aiCompatible: true },
  { value: ExerciseType.BUSINESS_CONTINUITY, label: 'Business Continuity', aiCompatible: true },
  { value: ExerciseType.COMPLIANCE_VALIDATION, label: 'Compliance Validation', aiCompatible: true },
  { value: ExerciseType.CRISIS_MANAGEMENT, label: 'Crisis Management', aiCompatible: true },
  { value: ExerciseType.TECHNICAL_RECOVERY, label: 'Technical Recovery', aiCompatible: true }
];

const AI_CONFIG_DEFAULTS = {
  temperature: 0.7,
  maxTokens: 4000,
  modelType: 'gpt-4',
  validationThreshold: 0.85
};

// Interface definitions
interface ScenarioConfigProps {
  exerciseId: string;
  initialConfig: IExercise;
  onConfigUpdate: (config: Partial<IExercise>) => void;
  onValidationError: (error: ValidationError) => void;
  onAIStatusChange: (status: AIStatus) => void;
}

interface ValidationError {
  code: string;
  message: string;
  details?: any;
}

interface AIStatus {
  isEnabled: boolean;
  isLoading: boolean;
  error?: string;
}

// Main component
export const ScenarioConfig: React.FC<ScenarioConfigProps> = ({
  exerciseId,
  initialConfig,
  onConfigUpdate,
  onValidationError,
  onAIStatusChange
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState(initialConfig);
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    isEnabled: initialConfig.isAiEnabled,
    isLoading: false
  });

  // Service instance
  const exerciseService = new ExerciseService();

  // Debounced update handler
  const debouncedUpdate = useCallback(
    debounce((updatedConfig: Partial<IExercise>) => {
      exerciseService.updateExerciseSettings(exerciseId, updatedConfig)
        .catch(error => {
          setError('Failed to update exercise settings');
          onValidationError({
            code: 'UPDATE_FAILED',
            message: 'Failed to update exercise settings',
            details: error
          });
        });
    }, 500),
    [exerciseId]
  );

  // Handle exercise type change
  const handleExerciseTypeChange = useCallback(async (value: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const exerciseType = value as ExerciseType;
      const typeOption = EXERCISE_TYPE_OPTIONS.find(opt => opt.value === exerciseType);

      if (!typeOption?.aiCompatible && config.isAiEnabled) {
        setAiStatus(prev => ({ ...prev, isEnabled: false }));
        onAIStatusChange({ isEnabled: false, isLoading: false });
      }

      const updatedConfig = {
        ...config,
        type: exerciseType,
        isAiEnabled: typeOption?.aiCompatible ? config.isAiEnabled : false
      };

      setConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      debouncedUpdate(updatedConfig);

      // Validate AI configuration if enabled
      if (updatedConfig.isAiEnabled) {
        await exerciseService.validateAIConfiguration(exerciseId, exerciseType);
      }
    } catch (error) {
      setError('Failed to update exercise type');
      onValidationError({
        code: 'TYPE_UPDATE_FAILED',
        message: 'Failed to update exercise type',
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  }, [config, exerciseId, onConfigUpdate, onAIStatusChange, onValidationError]);

  // Handle AI toggle
  const handleAiToggle = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = event.target.checked;
    setAiStatus(prev => ({ ...prev, isLoading: true }));

    try {
      if (isEnabled) {
        // Validate AI configuration
        await exerciseService.validateAIConfiguration(exerciseId, config.type);
      }

      const updatedConfig = {
        ...config,
        isAiEnabled: isEnabled,
        aiConfig: isEnabled ? {
          ...AI_CONFIG_DEFAULTS,
          complexity: config.aiConfig?.complexity || 'medium'
        } : undefined
      };

      setConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      debouncedUpdate(updatedConfig);
      
      setAiStatus({
        isEnabled,
        isLoading: false
      });
      onAIStatusChange({ isEnabled, isLoading: false });
    } catch (error) {
      setError('Failed to configure AI settings');
      setAiStatus({
        isEnabled: false,
        isLoading: false,
        error: 'AI configuration failed'
      });
      onValidationError({
        code: 'AI_CONFIG_FAILED',
        message: 'Failed to configure AI settings',
        details: error
      });
    }
  }, [config, exerciseId, onConfigUpdate, onAIStatusChange, onValidationError]);

  // Handle complexity change
  const handleComplexityChange = useCallback(async (value: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const complexityOption = COMPLEXITY_OPTIONS.find(opt => opt.value === value);
      if (!complexityOption) throw new Error('Invalid complexity level');

      const updatedConfig = {
        ...config,
        aiConfig: {
          ...config.aiConfig,
          complexity: value as 'low' | 'medium' | 'high'
        }
      };

      // Get complexity recommendation
      const recommendation = await exerciseService.getComplexityRecommendation(
        exerciseId,
        value as 'low' | 'medium' | 'high'
      );

      setConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      debouncedUpdate(updatedConfig);
    } catch (error) {
      setError('Failed to update complexity level');
      onValidationError({
        code: 'COMPLEXITY_UPDATE_FAILED',
        message: 'Failed to update complexity level',
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  }, [config, exerciseId, onConfigUpdate, onValidationError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Scenario Configuration
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Select
          value={config.type}
          onChange={handleExerciseTypeChange}
          options={EXERCISE_TYPE_OPTIONS}
          label="Exercise Type"
          disabled={isLoading}
          required
          testId="exercise-type-select"
        />

        <FormControlLabel
          control={
            <Switch
              checked={aiStatus.isEnabled}
              onChange={handleAiToggle}
              disabled={isLoading || !EXERCISE_TYPE_OPTIONS.find(opt => opt.value === config.type)?.aiCompatible}
              color="primary"
              inputProps={{
                'aria-label': 'Enable AI-driven scenario generation'
              }}
            />
          }
          label="Enable AI-driven scenario generation"
          sx={{ mt: 2, display: 'block' }}
        />

        {aiStatus.isEnabled && (
          <Select
            value={config.aiConfig?.complexity || 'medium'}
            onChange={handleComplexityChange}
            options={COMPLEXITY_OPTIONS}
            label="Scenario Complexity"
            disabled={isLoading}
            required
            testId="complexity-select"
            helperText="Select the desired complexity level for AI-generated scenarios"
          />
        )}

        {isLoading && (
          <CircularProgress
            size={24}
            sx={{ mt: 2 }}
            aria-label="Loading configuration"
          />
        )}
      </CardContent>
    </Card>
  );
};