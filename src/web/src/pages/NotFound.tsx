import React, { useCallback } from 'react';
import { Box, Typography, Container, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';

import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { MAIN_ROUTES } from '../constants/routes.constants';

// Styled container for centering 404 content with responsive design
const NotFoundContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(100vh - 200px)', // Account for header and footer
  textAlign: 'center',
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  '@media (max-width: 600px)': {
    padding: theme.spacing(2),
    margin: theme.spacing(1),
  },
}));

// Styled typography component for error message with responsive text
const ErrorMessage = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.error.main,
  fontSize: {
    xs: '1.5rem',
    sm: '2rem',
    md: '2.5rem',
  },
  fontWeight: theme.typography.fontWeights?.medium || 500,
}));

/**
 * NotFound component that displays a user-friendly 404 error page
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const NotFound: React.FC = React.memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation back to dashboard
  const handleNavigateHome = useCallback((
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    navigate(MAIN_ROUTES.DASHBOARD);
  }, [navigate]);

  return (
    <Layout role="main" aria-label="404 Not Found Page">
      <NotFoundContainer maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing(3),
          }}
        >
          <ErrorMessage
            variant="h1"
            component="h1"
            aria-live="polite"
          >
            404: Page Not Found
          </ErrorMessage>

          <Typography
            variant="h6"
            component="p"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: '600px' }}
          >
            The page you're looking for at {location.pathname} doesn't exist or has been moved.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleNavigateHome}
            aria-label="Return to Dashboard"
            size="large"
            startIcon={<span aria-hidden="true">←</span>}
            sx={{
              minWidth: '200px',
              '&:focus-visible': {
                outline: `3px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
              },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </NotFoundContainer>
    </Layout>
  );
});

NotFound.displayName = 'NotFound';

export default NotFound;