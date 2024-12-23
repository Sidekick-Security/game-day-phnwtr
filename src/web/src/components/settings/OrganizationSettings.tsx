import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  Grid, 
  TextField, 
  Card, 
  CardContent, 
  Alert,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  Typography,
  FormHelperText,
  Divider,
  Box
} from '@mui/material';
import { Button } from '../common/Button';
import { IUser } from '../../interfaces/user.interface';
import AuthService from '../../services/auth.service';
import { apiClient } from '../../utils/api.utils';

// Constants for form validation and configuration
const MIN_ORG_NAME_LENGTH = 3;
const MAX_ORG_NAME_LENGTH = 100;
const COMPLIANCE_FRAMEWORKS = ['SOC2', 'HIPAA', 'GDPR', 'ISO27001'];
const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Other'];
const SECURITY_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
const ACCESSIBILITY_MODES = ['STANDARD', 'HIGH_CONTRAST', 'SCREEN_READER'];

// Interface for organization settings form data
interface OrganizationSettingsForm {
  organizationName: string;
  industry: string;
  complianceFrameworks: string[];
  securityLevel: string;
  accessibilityMode: string;
  enableMFA: boolean;
  enableAuditLogging: boolean;
  customBranding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
  };
}

// Props interface for the component
interface OrganizationSettingsProps {
  organizationId: string;
  onUpdate: (settings: OrganizationSettingsForm) => Promise<void>;
}

/**
 * Organization Settings Component
 * Implements WCAG 2.1 Level AA compliance and comprehensive security features
 */
export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organizationId,
  onUpdate
}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form initialization with react-hook-form
  const { 
    control, 
    handleSubmit, 
    reset, 
    formState: { errors } 
  } = useForm<OrganizationSettingsForm>();

  // Load organization settings
  const loadOrganizationSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/v1/organizations/${organizationId}/settings`);
      reset(response.data);
    } catch (err) {
      setError('Failed to load organization settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, reset]);

  // Load settings on component mount
  useEffect(() => {
    loadOrganizationSettings();
  }, [loadOrganizationSettings]);

  // Form submission handler with security validation
  const onSubmit = async (data: OrganizationSettingsForm) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate user permissions
      const hasPermission = await AuthService.validatePermissions(['MANAGE_ORGANIZATION']);
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update organization settings');
      }

      // Validate security token
      const token = await AuthService.validateToken(localStorage.getItem('auth_token') || '');
      if (!token) {
        throw new Error('Invalid authentication token');
      }

      // Submit updated settings
      await onUpdate(data);
      setSuccess('Organization settings updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update organization settings');
      console.error('Settings update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Organization Settings Form">
      <Grid container spacing={3}>
        {/* Status Messages */}
        {error && (
          <Grid item xs={12}>
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              aria-live="polite"
            >
              {error}
            </Alert>
          </Grid>
        )}
        {success && (
          <Grid item xs={12}>
            <Alert 
              severity="success" 
              onClose={() => setSuccess(null)}
              aria-live="polite"
            >
              {success}
            </Alert>
          </Grid>
        )}

        {/* Organization Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Organization Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="organizationName"
                    control={control}
                    rules={{
                      required: 'Organization name is required',
                      minLength: {
                        value: MIN_ORG_NAME_LENGTH,
                        message: `Name must be at least ${MIN_ORG_NAME_LENGTH} characters`
                      },
                      maxLength: {
                        value: MAX_ORG_NAME_LENGTH,
                        message: `Name cannot exceed ${MAX_ORG_NAME_LENGTH} characters`
                      }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Organization Name"
                        fullWidth
                        error={!!errors.organizationName}
                        helperText={errors.organizationName?.message}
                        disabled={loading}
                        aria-describedby="org-name-helper"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="industry"
                    control={control}
                    rules={{ required: 'Industry is required' }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        fullWidth
                        label="Industry"
                        error={!!errors.industry}
                        disabled={loading}
                        aria-label="Industry Selection"
                      >
                        {INDUSTRIES.map((industry) => (
                          <MenuItem key={industry} value={industry}>
                            {industry}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance and Security */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance & Security
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="complianceFrameworks"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        multiple
                        fullWidth
                        label="Compliance Frameworks"
                        disabled={loading}
                        aria-label="Compliance Frameworks Selection"
                      >
                        {COMPLIANCE_FRAMEWORKS.map((framework) => (
                          <MenuItem key={framework} value={framework}>
                            {framework}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="securityLevel"
                    control={control}
                    rules={{ required: 'Security level is required' }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        fullWidth
                        label="Security Level"
                        disabled={loading}
                        aria-label="Security Level Selection"
                      >
                        {SECURITY_LEVELS.map((level) => (
                          <MenuItem key={level} value={level}>
                            {level}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="enableMFA"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            {...field}
                            checked={field.value}
                            disabled={loading}
                          />
                        }
                        label="Enable Multi-Factor Authentication"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Accessibility Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Accessibility
              </Typography>
              <Controller
                name="accessibilityMode"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    fullWidth
                    label="Accessibility Mode"
                    disabled={loading}
                    aria-label="Accessibility Mode Selection"
                  >
                    {ACCESSIBILITY_MODES.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Form Actions */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              variant="outlined"
              onClick={() => reset()}
              disabled={loading}
              aria-label="Reset Form"
            >
              Reset
            </Button>
            <Button
              variant="contained"
              type="submit"
              loading={loading}
              disabled={loading}
              aria-label="Save Settings"
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
};

export default OrganizationSettings;