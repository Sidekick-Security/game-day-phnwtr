import React from 'react'; // ^18.2.0
import { Radio, FormControlLabel } from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { colors } from '../../assets/styles/variables';

// Interface for component props with comprehensive type safety
interface RadioButtonProps {
  id: string;
  name: string;
  value: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Styled radio component with theme integration and state-based styling
const StyledRadio = styled(Radio)(({ theme }) => ({
  // Default state
  '&.MuiRadio-root': {
    color: colors.grey[400],
    padding: theme.spacing(1),
    transition: theme.transitions.create(['color', 'background-color', 'box-shadow'], {
      duration: theme.transitions.duration.shortest,
    }),
  },

  // Hover state
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? `rgba(${colors.primary[200]}, 0.08)`
      : `rgba(${colors.primary[500]}, 0.04)`,
    '@media (hover: none)': {
      backgroundColor: 'transparent',
    },
  },

  // Checked state
  '&.Mui-checked': {
    color: colors.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? `rgba(${colors.primary[200]}, 0.12)`
        : `rgba(${colors.primary[500]}, 0.08)`,
      '@media (hover: none)': {
        backgroundColor: 'transparent',
      },
    },
  },

  // Disabled state
  '&.Mui-disabled': {
    color: theme.palette.mode === 'dark'
      ? colors.grey[600]
      : colors.grey[300],
  },

  // Focus state for keyboard navigation
  '&.Mui-focusVisible': {
    outline: `2px solid ${colors.primary[500]}`,
    outlineOffset: 2,
  },

  // Size variants
  '&.MuiRadio-sizeSmall': {
    padding: theme.spacing(0.75),
    '& .MuiSvgIcon-root': {
      fontSize: 20,
    },
  },

  '&.MuiRadio-sizeMedium': {
    padding: theme.spacing(1),
    '& .MuiSvgIcon-root': {
      fontSize: 24,
    },
  },
}));

// Styled label component for consistent typography and spacing
const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  marginLeft: 0,
  marginRight: theme.spacing(2),
  '& .MuiFormControlLabel-label': {
    fontSize: theme.typography.body1.fontSize,
    color: theme.palette.text.primary,
  },
  '&.Mui-disabled .MuiFormControlLabel-label': {
    color: theme.palette.text.disabled,
  },
}));

/**
 * RadioButton component implementing Material Design 3.0 principles with WCAG 2.1 Level AA compliance
 * 
 * @param {RadioButtonProps} props - Component props
 * @returns {React.ReactElement} Rendered RadioButton component
 */
const RadioButton: React.FC<RadioButtonProps> = ({
  id,
  name,
  value,
  label,
  checked = false,
  disabled = false,
  size = 'medium',
  onChange,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  // Handler for radio button state changes
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(event);
    }
  };

  return (
    <StyledFormControlLabel
      className={className}
      style={style}
      disabled={disabled}
      label={label}
      control={
        <StyledRadio
          id={id}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          size={size}
          onChange={handleChange}
          inputProps={{
            'aria-label': ariaLabel || label,
            'aria-describedby': ariaDescribedBy,
          }}
          // Additional props for enhanced accessibility
          role="radio"
          aria-checked={checked}
          tabIndex={disabled ? -1 : 0}
        />
      }
    />
  );
};

export default RadioButton;