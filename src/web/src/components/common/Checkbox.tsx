import React, { useCallback, useState, useRef } from 'react';
import { Checkbox as MuiCheckbox, FormControlLabel, FormHelperText } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { defaultTheme } from '../../assets/styles/theme';

// Interface for component props with full accessibility support
interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string | React.ReactNode;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error';
  className?: string;
  style?: React.CSSProperties;
  error?: boolean;
  required?: boolean;
  helperText?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Styled checkbox component with enterprise theme integration
const StyledCheckbox = styled(MuiCheckbox, {
  shouldForwardProp: (prop) => 
    !['error', 'focused'].includes(prop as string),
})(({ theme, error, size }) => ({
  padding: theme.spacing(size === 'small' ? 1 : size === 'large' ? 2 : 1.5),
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  
  '&.Mui-checked': {
    color: error 
      ? theme.palette.error.main 
      : theme.palette.primary.main,
  },

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '&.Mui-focusVisible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },

  '&.Mui-disabled': {
    color: theme.palette.action.disabled,
  },

  // Animation settings with reduced motion support
  transition: theme.transitions.create(['color', 'background-color'], {
    duration: theme.transitions.duration.shortest,
  }),

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

// Styled form control label for consistent spacing and alignment
const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  marginLeft: 0,
  marginRight: theme.spacing(2),
  userSelect: 'none',
}));

// Styled helper text component
const StyledHelperText = styled(FormHelperText)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  marginTop: theme.spacing(0.5),
}));

/**
 * Enterprise-grade Checkbox component with full accessibility support
 * and Material Design 3.0 compliance
 */
export const Checkbox: React.FC<CheckboxProps> = React.memo(({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  label,
  name,
  size = 'medium',
  color = 'primary',
  className,
  style,
  error = false,
  required = false,
  helperText,
  inputProps,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const theme = useTheme();
  const [isChecked, setIsChecked] = useState(defaultChecked ?? false);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const helperTextId = `${name}-helper-text`;

  // Handle checkbox state changes with validation and accessibility
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const newChecked = event.target.checked;

    // Update internal state if uncontrolled
    if (checked === undefined) {
      setIsChecked(newChecked);
    }

    // Call onChange handler if provided
    if (onChange) {
      onChange(newChecked, event);
    }

    // Announce state change to screen readers
    const announcement = `Checkbox ${newChecked ? 'checked' : 'unchecked'}${
      required ? ', required' : ''
    }`;
    
    if (checkboxRef.current) {
      checkboxRef.current.setAttribute('aria-checked', String(newChecked));
    }
  }, [checked, onChange, required]);

  // Compute ARIA attributes for accessibility
  const computedAriaLabel = ariaLabel || (typeof label === 'string' ? label : undefined);
  const computedAriaDescribedBy = [
    ariaDescribedBy,
    helperText ? helperTextId : undefined,
  ].filter(Boolean).join(' ');

  return (
    <div className={className} style={style}>
      <StyledFormControlLabel
        control={
          <StyledCheckbox
            checked={checked ?? isChecked}
            onChange={handleChange}
            disabled={disabled}
            size={size}
            color={color}
            error={error}
            inputRef={checkboxRef}
            inputProps={{
              'aria-label': computedAriaLabel,
              'aria-describedby': computedAriaDescribedBy,
              'aria-required': required,
              name,
              ...inputProps,
            }}
            {...props}
          />
        }
        label={
          <>
            {label}
            {required && (
              <span
                aria-hidden="true"
                style={{
                  color: error ? theme.palette.error.main : theme.palette.text.secondary,
                  marginLeft: theme.spacing(0.5),
                }}
              >
                *
              </span>
            )}
          </>
        }
      />
      {helperText && (
        <StyledHelperText
          id={helperTextId}
          error={error}
        >
          {helperText}
        </StyledHelperText>
      )}
    </div>
  );
});

// Display name for debugging
Checkbox.displayName = 'Checkbox';

export type { CheckboxProps };