/**
 * ExerciseCreation Page Component
 * Implements comprehensive exercise creation interface with AI-driven scenario generation,
 * compliance mapping, and enhanced accessibility features.
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { debounce } from 'lodash';

// Internal imports
import Layout from '../components/layout/Layout';
import ExerciseCreator from '../components/exercise/ExerciseCreator';
import ExerciseService from '../services/exercise.service';
import useNotification from '../hooks/useNotification';
import { IExercise } from '../interfaces/exercise.interface';
import { EXERCISE_ROUTES } from '../constants/routes.constants';

// Styled components
const StyledContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const StyledHeader = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  color: theme.palette.text.primary,
}));

// Interface for validation state
interface ValidationState {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * ExerciseCreation page component
 * Provides interface for creating new tabletop exercises with AI support
 */
const ExerciseCreation: React.FC = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationState>({
    isValid: true,
    errors: {},
  });

  // Hooks
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const exerciseService = new ExerciseService();

  /**
   * Handles successful exercise creation with navigation
   */
  const handleExerciseCreated = useCallback(async (exercise: IExercise) => {
    try {
      setLoading(true);
      setError(null);

      // Validate exercise configuration
      const validationResult = await exerciseService.validateCompliance(
        exercise.id,
        exercise.complianceFrameworks
      );

      if (!validationResult.isValid) {
        throw new Error('Exercise validation failed');
      }

      // Show success notification
      showNotification({
        type: 'success',
        message: 'Exercise created successfully',
        autoHideDuration: 5000,
      });

      // Navigate to exercise control page
      navigate(`${EXERCISE_ROUTES.CONTROL.replace(':id', exercise.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise');
      showNotification({
        type: 'error',
        message: 'Failed to create exercise',
        autoHideDuration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, showNotification, exerciseService]);

  /**
   * Handles exercise validation with debouncing
   */
  const handleValidation = useCallback(
    debounce(async (config: Partial<IExercise>) => {
      try {
        const validationResult = await exerciseService.validateCompliance(
          config.id!,
          config.complianceFrameworks || []
        );

        setValidation({
          isValid: validationResult.isValid,
          errors: validationResult.errors || {},
        });
      } catch (err) {
        console.error('Validation error:', err);
      }
    }, 300),
    []
  );

  /**
   * Handles cancellation and navigation
   */
  const handleCancel = useCallback(() => {
    navigate(EXERCISE_ROUTES.LIST);
  }, [navigate]);

  return (
    <Layout>
      <StyledContainer maxWidth="lg">
        <StyledHeader variant="h4" component="h1">
          Create New Exercise
        </StyledHeader>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Paper 
            sx={{ 
              p: 3, 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400 
            }}
          >
            <CircularProgress 
              size={40}
              aria-label="Creating exercise..."
            />
          </Paper>
        ) : (
          <ExerciseCreator
            onExerciseCreated={handleExerciseCreated}
            onCancel={handleCancel}
            organizationId="current-org-id" // Should come from auth context
            availableFrameworks={[
              'SOC 2',
              'ISO 27001',
              'NIST CSF',
              'HIPAA',
              'PCI DSS'
            ]}
          />
        )}
      </StyledContainer>
    </Layout>
  );
};

export default ExerciseCreation;