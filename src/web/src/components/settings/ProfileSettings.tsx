import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Paper,
  Grid,
  useTheme as useMuiTheme,
} from '@mui/material';
import debounce from 'lodash/debounce';

import { IUser, IUserProfile } from '../../interfaces/user.interface';
import AuthService from '../../services/auth.service';
import { useTheme } from '../../hooks/useTheme';

// Form validation rules
const FORM_VALIDATION_RULES = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
    maxLength: {
      value: 255,
      message: 'Email must be less than 255 characters',
    },
  },
  firstName: {
    required: 'First name is required',
    minLength: {
      value: 2,
      message: 'First name must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'First name must be less than 50 characters',
    },
  },
  lastName: {
    required: 'Last name is required',
    minLength: {
      value: 2,
      message: 'Last name must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'Last name must be less than 50 characters',
    },
  },
};

// ARIA labels for accessibility
const ARIA_LABELS = {
  profileForm: 'Profile Settings Form',
  emailInput: 'Email Address',
  firstNameInput: 'First Name',
  lastNameInput: 'Last Name',
  themeToggle: 'Theme Preference',
  notificationSettings: 'Notification Preferences',
};

interface ProfileFormData extends Partial<IUser> {
  notifications: {
    email: boolean;
    slack: boolean;
    teams: boolean;
    exerciseReminders: boolean;
    exerciseUpdates: boolean;
  };
}

const ProfileSettings: React.FC = React.memo(() => {
  const muiTheme = useMuiTheme();
  const { theme, themeMode, setThemeMode, isHighContrast, setHighContrast } = useTheme();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>();

  // Load initial profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          reset({
            email: currentUser.email,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            notifications: currentUser.notifications,
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Failed to load profile', 'error');
      }
    };

    loadProfile();
  }, [reset]);

  // Debounced profile update handler
  const debouncedProfileUpdate = useCallback(
    debounce(async (data: ProfileFormData) => {
      try {
        setLoading(true);
        await AuthService.updateProfile({
          ...data,
          preferences: {
            theme: themeMode,
            highContrast: isHighContrast,
          },
        });
        showNotification('Profile updated successfully', 'success');
      } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
      } finally {
        setLoading(false);
      }
    }, 500),
    [themeMode, isHighContrast]
  );

  const handleProfileUpdate = handleSubmit((data) => {
    debouncedProfileUpdate(data);
  });

  const handleThemeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setThemeMode(event.target.checked ? 'dark' : 'light');
    },
    [setThemeMode]
  );

  const handleHighContrastChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setHighContrast(event.target.checked);
    },
    [setHighContrast]
  );

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: theme.spacing(3),
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box
        component="form"
        onSubmit={handleProfileUpdate}
        role="form"
        aria-label={ARIA_LABELS.profileForm}
      >
        <Typography variant="h4" gutterBottom>
          Profile Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Controller
              name="firstName"
              control={control}
              rules={FORM_VALIDATION_RULES.firstName}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="First Name"
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  aria-label={ARIA_LABELS.firstNameInput}
                  disabled={loading}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="lastName"
              control={control}
              rules={FORM_VALIDATION_RULES.lastName}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Last Name"
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  aria-label={ARIA_LABELS.lastNameInput}
                  disabled={loading}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="email"
              control={control}
              rules={FORM_VALIDATION_RULES.email}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  aria-label={ARIA_LABELS.emailInput}
                  disabled={loading}
                />
              )}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          Appearance
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={themeMode === 'dark'}
                onChange={handleThemeChange}
                aria-label={ARIA_LABELS.themeToggle}
              />
            }
            label="Dark Mode"
          />

          <FormControlLabel
            control={
              <Switch
                checked={isHighContrast}
                onChange={handleHighContrastChange}
                aria-label="High Contrast Mode"
              />
            }
            label="High Contrast"
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          Notification Preferences
        </Typography>

        <Grid container spacing={2}>
          {Object.entries({
            email: 'Email Notifications',
            slack: 'Slack Notifications',
            teams: 'Teams Notifications',
            exerciseReminders: 'Exercise Reminders',
            exerciseUpdates: 'Exercise Updates',
          }).map(([key, label]) => (
            <Grid item xs={12} sm={6} key={key}>
              <Controller
                name={`notifications.${key}`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        disabled={loading}
                      />
                    }
                    label={label}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          elevation={6}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
});

ProfileSettings.displayName = 'ProfileSettings';

export default ProfileSettings;