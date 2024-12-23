import React from 'react'; // ^18.2.0
import { Box, Typography, Container } from '@mui/material'; // ^5.0.0
import { useTheme, styled } from '@mui/material/styles'; // ^5.0.0

// Interface for Footer component props
interface FooterProps {
  className?: string;
  showLegalLinks?: boolean;
  customContent?: React.ReactNode;
}

// Styled component for the footer root container
const FooterRoot = styled(Box)(({ theme }) => ({
  position: 'relative',
  bottom: 0,
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  zIndex: theme.zIndex.appBar - 1,
  transition: theme.transitions.create(['background-color', 'border-top-color'], {
    duration: theme.transitions.duration.standard,
  }),
  padding: theme.spacing(3, 0),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 0),
  },
  '@media print': {
    display: 'none',
  },
  '@media (forced-colors: active)': {
    borderTop: '1px solid CanvasText',
  },
  [theme.direction === 'rtl' ? 'paddingLeft' : 'paddingRight']: theme.spacing(2),
  [theme.direction === 'rtl' ? 'paddingRight' : 'paddingLeft']: theme.spacing(2),
}));

// Styled component for the footer content container
const FooterContent = styled(Container)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    textAlign: 'center',
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    transition: theme.transitions.create('color'),
    '&:hover': {
      color: theme.palette.primary.dark,
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
  },
}));

// Memoized Footer component
const Footer = React.memo<FooterProps>(({
  className,
  showLegalLinks = true,
  customContent,
}) => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  // Keyboard navigation handler
  const handleKeyPress = (event: React.KeyboardEvent<HTMLAnchorElement>, href: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = href;
    }
  };

  return (
    <FooterRoot
      component="footer"
      className={className}
      role="contentinfo"
      aria-label="Site footer"
    >
      <FooterContent maxWidth="lg">
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            component="p"
          >
            © {currentYear} GameDay Platform. All rights reserved.
          </Typography>
        </Box>

        {showLegalLinks && (
          <Box
            sx={{
              display: 'flex',
              gap: theme.spacing(3),
              flexWrap: 'wrap',
              justifyContent: 'center',
              [theme.breakpoints.down('sm')]: {
                gap: theme.spacing(2),
              },
            }}
          >
            <Typography
              variant="body2"
              component="a"
              href="/privacy"
              onClick={(e) => e.currentTarget.blur()}
              onKeyPress={(e) => handleKeyPress(e, '/privacy')}
              tabIndex={0}
              role="link"
              aria-label="Privacy Policy"
            >
              Privacy Policy
            </Typography>
            <Typography
              variant="body2"
              component="a"
              href="/terms"
              onClick={(e) => e.currentTarget.blur()}
              onKeyPress={(e) => handleKeyPress(e, '/terms')}
              tabIndex={0}
              role="link"
              aria-label="Terms of Service"
            >
              Terms of Service
            </Typography>
            <Typography
              variant="body2"
              component="a"
              href="/accessibility"
              onClick={(e) => e.currentTarget.blur()}
              onKeyPress={(e) => handleKeyPress(e, '/accessibility')}
              tabIndex={0}
              role="link"
              aria-label="Accessibility Statement"
            >
              Accessibility
            </Typography>
          </Box>
        )}

        {customContent && (
          <Box sx={{ marginLeft: 'auto' }}>
            {customContent}
          </Box>
        )}
      </FooterContent>
    </FooterRoot>
  );
});

// Display name for debugging
Footer.displayName = 'Footer';

export default Footer;