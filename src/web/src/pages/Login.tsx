import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Link,
  Alert,
  CircularProgress,
  Divider,
  Box,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { AuthProvider } from '../types/auth.types';

// Constants for form validation and security
const PASSWORD_MIN_LENGTH = 12;
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Styled components with accessibility enhancements
const LoginContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
}));

const LoginForm = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  width: '100%',
  maxWidth: 480,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
  },
}));

// Initial form state
const initialFormState = {
  email: '',
  password: '',
  rememberMe: false,
  provider: AuthProvider.JWT,
};

// Initial error state
const initialErrorState = {
  email: '',
  password: '',
  general: '',
};

const Login: React.FC = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loginWithSSO, isAuthenticated, verifyMFA } = useAuth();
  const { theme, themeMode } = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState(initialErrorState);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Effect to redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = { ...initialErrorState };
    let isValid = true;

    // Email validation
    if (!formData.email) {
      newErrors.email = t('login.errors.emailRequired');
      isValid = false;
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = t('login.errors.emailInvalid');
      isValid = false;
    }

    // Password validation for local auth
    if (formData.provider === AuthProvider.JWT) {
      if (!formData.password) {
        newErrors.password = t('login.errors.passwordRequired');
        isValid = false;
      } else if (formData.password.length < PASSWORD_MIN_LENGTH) {
        newErrors.password = t('login.errors.passwordLength');
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, t]);

  // Handle form input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value,
    }));
    // Clear errors on input change
    setErrors(prev => ({ ...prev, [name]: '', general: '' }));
  }, []);

  // Handle login submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for account lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setErrors(prev => ({
        ...prev,
        general: t('login.errors.accountLocked', {
          minutes: Math.ceil((lockoutUntil - Date.now()) / 60000),
        }),
      }));
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await login({
        email: formData.email,
        password: formData.password,
        provider: formData.provider,
        deviceId: window.navigator.userAgent,
        clientMetadata: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
        },
      });

      if (response.mfaRequired) {
        setMfaRequired(true);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setLoginAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION);
        }
        return newAttempts;
      });

      setErrors(prev => ({
        ...prev,
        general: t('login.errors.invalidCredentials'),
      }));
    } finally {
      setLoading(false);
    }
  }, [formData, lockoutUntil, login, navigate, t, validateForm]);

  // Handle SSO login
  const handleSSOLogin = useCallback(async (provider: AuthProvider) => {
    try {
      setLoading(true);
      await loginWithSSO(provider);
      navigate('/dashboard');
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: t('login.errors.ssoError'),
      }));
    } finally {
      setLoading(false);
    }
  }, [loginWithSSO, navigate, t]);

  // Handle MFA verification
  const handleMFASubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) {
      setErrors(prev => ({ ...prev, general: t('login.errors.mfaRequired') }));
      return;
    }

    try {
      setLoading(true);
      await verifyMFA(mfaCode);
      navigate('/dashboard');
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: t('login.errors.mfaInvalid'),
      }));
    } finally {
      setLoading(false);
    }
  }, [mfaCode, navigate, t, verifyMFA]);

  // Render MFA form if required
  if (mfaRequired) {
    return (
      <LoginContainer>
        <LoginForm component="form" onSubmit={handleMFASubmit}>
          <Typography variant="h4" align="center" gutterBottom>
            {t('login.mfa.title')}
          </Typography>
          <TextField
            fullWidth
            label={t('login.mfa.code')}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            error={!!errors.general}
            disabled={loading}
            inputProps={{
              'aria-label': t('login.mfa.code'),
              autoComplete: 'one-time-code',
            }}
          />
          {errors.general && (
            <Alert severity="error">{errors.general}</Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            aria-label={t('login.mfa.verify')}
          >
            {loading ? <CircularProgress size={24} /> : t('login.mfa.verify')}
          </Button>
        </LoginForm>
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <LoginForm component="form" onSubmit={handleSubmit}>
        <Typography variant="h4" align="center" gutterBottom>
          {t('login.title')}
        </Typography>

        {errors.general && (
          <Alert severity="error">{errors.general}</Alert>
        )}

        <TextField
          fullWidth
          label={t('login.email')}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          error={!!errors.email}
          helperText={errors.email}
          disabled={loading}
          inputProps={{
            'aria-label': t('login.email'),
            autoComplete: 'email',
          }}
        />

        <TextField
          fullWidth
          label={t('login.password')}
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleInputChange}
          error={!!errors.password}
          helperText={errors.password}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t(showPassword ? 'login.hidePassword' : 'login.showPassword')}
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': t('login.password'),
            autoComplete: 'current-password',
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              color="primary"
            />
          }
          label={t('login.rememberMe')}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          aria-label={t('login.submit')}
        >
          {loading ? <CircularProgress size={24} /> : t('login.submit')}
        </Button>

        <Box sx={{ my: 2 }}>
          <Divider>{t('login.or')}</Divider>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => handleSSOLogin(AuthProvider.OAUTH)}
            disabled={loading}
            aria-label={t('login.sso.google')}
          >
            {t('login.sso.google')}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<MicrosoftIcon />}
            onClick={() => handleSSOLogin(AuthProvider.SSO)}
            disabled={loading}
            aria-label={t('login.sso.microsoft')}
          >
            {t('login.sso.microsoft')}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link
            href="/forgot-password"
            variant="body2"
            underline="hover"
            aria-label={t('login.forgotPassword')}
          >
            {t('login.forgotPassword')}
          </Link>
        </Box>
      </LoginForm>
    </LoginContainer>
  );
};

export default Login;