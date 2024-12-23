/**
 * ExerciseCreator Component
 * A comprehensive form component for creating and configuring tabletop exercises
 * with AI-driven scenario generation and compliance mapping support.
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // ^7.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  Switch,
  Tooltip,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  InputLabel,
  Chip,
  Stack
} from '@mui/material'; // ^5.0.0
import { DateTimePicker } from '@mui/x-date-pickers'; // ^5.0.0
import { ExerciseType } from '../../types/exercise.types';
import { IExercise } from '../../interfaces/exercise.interface';
import ExerciseService from '../../services/exercise.service';

// Styled components for enhanced UI
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
}));

const StyledForm = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

// Props interface
interface ExerciseCreatorProps {
  onExerciseCreated: (exercise: IExercise) => void;
  onCancel: () => void;
  initialData?: Partial<IExercise>;
  organizationId: string;
  availableFrameworks: string[];
}

// Form data interface
interface ExerciseFormData {
  title: string;
  description: string;
  type: ExerciseType;
  isAiEnabled: boolean;
  complianceFrameworks: string[];
  scheduledStart: Date;
  scheduledEnd: Date;
  participants: {
    teamId: string;
    role: string;
  }[];
  difficultyLevel: 'low' | 'medium' | 'high';
  timezone: string;
  expectedDuration: number;
}

/**
 * ExerciseCreator Component
 * Provides a comprehensive interface for creating and configuring exercises
 */
const ExerciseCreator: React.FC<ExerciseCreatorProps> = ({
  onExerciseCreated,
  onCancel,
  initialData,
  organizationId,
  availableFrameworks
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exerciseService = new ExerciseService();

  // Initialize form with react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue
  } = useForm<ExerciseFormData>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || ExerciseType.SECURITY_INCIDENT,
      isAiEnabled: initialData?.isAiEnabled || true,
      complianceFrameworks: initialData?.complianceFrameworks || [],
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 3600000), // Default 1 hour duration
      difficultyLevel: 'medium',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      expectedDuration: 60,
      participants: []
    },
    mode: 'onChange'
  });

  // Watch for AI enablement to show/hide related fields
  const isAiEnabled = watch('isAiEnabled');

  /**
   * Handles form submission with validation and exercise creation
   */
  const onSubmit = useCallback(async (formData: ExerciseFormData) => {
    try {
      setLoading(true);
      setError(null);

      const exerciseData: Partial<IExercise> = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        organizationId,
        isAiEnabled: formData.isAiEnabled,
        complianceFrameworks: formData.complianceFrameworks,
        scheduledStart: formData.scheduledStart,
        scheduledEnd: formData.scheduledEnd,
        participants: formData.participants,
        aiConfig: formData.isAiEnabled ? {
          complexity: formData.difficultyLevel,
          adaptiveScenarios: true,
          complianceAlignment: formData.complianceFrameworks.length > 0
        } : undefined
      };

      const createdExercise = await exerciseService.createExerciseWithAI(
        exerciseData,
        formData.isAiEnabled
      );

      onExerciseCreated(createdExercise);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise');
    } finally {
      setLoading(false);
    }
  }, [organizationId, exerciseService, onExerciseCreated]);

  return (
    <StyledPaper elevation={2}>
      <Typography variant="h5" component="h2" gutterBottom>
        Create New Exercise
      </Typography>

      <StyledForm onSubmit={handleSubmit(onSubmit)} aria-label="Exercise creation form">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Controller
              name="title"
              control={control}
              rules={{ required: 'Title is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Exercise Title"
                  fullWidth
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  disabled={loading}
                  inputProps={{ 'aria-label': 'Exercise title' }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              rules={{ required: 'Description is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  multiline
                  rows={4}
                  fullWidth
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={loading}
                  inputProps={{ 'aria-label': 'Exercise description' }}
                />
              )}
            />
          </Grid>

          {/* Exercise Type and Configuration */}
          <Grid item xs={12} md={6}>
            <Controller
              name="type"
              control={control}
              rules={{ required: 'Exercise type is required' }}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.type}>
                  <InputLabel>Exercise Type</InputLabel>
                  <Select
                    {...field}
                    label="Exercise Type"
                    disabled={loading}
                    inputProps={{ 'aria-label': 'Exercise type' }}
                  >
                    {Object.values(ExerciseType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.type && (
                    <FormHelperText>{errors.type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          {/* AI Configuration */}
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Controller
                name="isAiEnabled"
                control={control}
                render={({ field }) => (
                  <FormControl>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>AI-Driven Scenarios</Typography>
                      <Tooltip title="Enable AI-powered scenario generation">
                        <Switch
                          {...field}
                          checked={field.value}
                          disabled={loading}
                          inputProps={{ 'aria-label': 'Enable AI scenarios' }}
                        />
                      </Tooltip>
                    </Stack>
                  </FormControl>
                )}
              />
            </Stack>
          </Grid>

          {/* Scheduling */}
          <Grid item xs={12} md={6}>
            <Controller
              name="scheduledStart"
              control={control}
              rules={{ required: 'Start time is required' }}
              render={({ field }) => (
                <DateTimePicker
                  label="Start Time"
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.scheduledStart,
                      helperText: errors.scheduledStart?.message
                    }
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="scheduledEnd"
              control={control}
              rules={{ required: 'End time is required' }}
              render={({ field }) => (
                <DateTimePicker
                  label="End Time"
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.scheduledEnd,
                      helperText: errors.scheduledEnd?.message
                    }
                  }}
                />
              )}
            />
          </Grid>

          {/* Compliance Frameworks */}
          <Grid item xs={12}>
            <Controller
              name="complianceFrameworks"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Compliance Frameworks</InputLabel>
                  <Select
                    {...field}
                    multiple
                    label="Compliance Frameworks"
                    disabled={loading}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {availableFrameworks.map((framework) => (
                      <MenuItem key={framework} value={framework}>
                        {framework}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>

          {/* Form Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={onCancel}
                disabled={loading}
                variant="outlined"
                color="secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !isValid}
                variant="contained"
                color="primary"
                startIcon={loading && <CircularProgress size={20} />}
              >
                Create Exercise
              </Button>
            </Box>
          </Grid>
        </Grid>
      </StyledForm>
    </StyledPaper>
  );
};

export default ExerciseCreator;