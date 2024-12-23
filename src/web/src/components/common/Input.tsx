import React, { useCallback, useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { TextField } from '@mui/material';
import { defaultTheme } from '../../assets/styles/theme';
import { validateInput } from '../../utils/validation.utils';

// Constants for input behavior
const INPUT_DEBOUNCE_MS = 300;
const MAX_ERROR_LENGTH = 100;

// Interface for input component props with comprehensive options
interface InputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

// Enhanced styled TextField with comprehensive theme integration
const StyledInput = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create([
      'border-color',
      'background-color',
      'box-shadow',
    ]),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    },
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      cursor: 'not-allowed',
    },
  },
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5),
    fontSize: theme.typography.body1.fontSize,
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 0.7,
    },
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
    },
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    fontSize: theme.typography.caption.fontSize,
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
}));

/**
 * Enhanced Input component with comprehensive validation, accessibility, and theming features
 * Implements WCAG 2.1 Level AA compliance and Material Design 3.0 principles
 */
export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  onBlur,
  error = false,
  helperText = '',
  label = '',
  type = 'text',
  disabled = false,
  required = false,
  placeholder = '',
  size = 'medium',
  fullWidth = false,
  inputProps = {},
}) => {
  // State management for internal value and validation
  const [internalValue, setInternalValue] = useState<string | number>(value);
  const [internalError, setInternalError] = useState<boolean>(error);
  const [internalHelperText, setInternalHelperText] = useState<string>(helperText);
  
  // Refs for debouncing and focus management
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Effect to sync external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Enhanced change handler with validation and security checks
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    // Clear existing debounce timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Update internal value immediately for responsiveness
    setInternalValue(newValue);

    // Debounce validation and onChange callback
    debounceTimeout.current = setTimeout(() => {
      // Validate input value
      const validationResult = validateInput(newValue, {
        type,
        required,
        maxLength: inputProps.maxLength,
        pattern: inputProps.pattern,
      });

      // Update error state and helper text
      setInternalError(!validationResult.isValid);
      if (!validationResult.isValid && validationResult.errors.length > 0) {
        setInternalHelperText(
          validationResult.errors[0].slice(0, MAX_ERROR_LENGTH)
        );
      } else {
        setInternalHelperText(helperText);
      }

      // Call onChange with validated value
      onChange(newValue);
    }, INPUT_DEBOUNCE_MS);
  }, [onChange, type, required, inputProps, helperText]);

  // Enhanced blur handler with final validation
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    // Perform final validation
    const validationResult = validateInput(internalValue, {
      type,
      required,
      maxLength: inputProps.maxLength,
      pattern: inputProps.pattern,
    });

    // Update error state and helper text
    setInternalError(!validationResult.isValid);
    if (!validationResult.isValid && validationResult.errors.length > 0) {
      setInternalHelperText(
        validationResult.errors[0].slice(0, MAX_ERROR_LENGTH)
      );
    }

    // Call onBlur callback if provided
    if (onBlur) {
      onBlur(event);
    }
  }, [internalValue, onBlur, type, required, inputProps]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <StyledInput
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      error={internalError}
      helperText={internalHelperText}
      label={label}
      type={type}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      inputRef={inputRef}
      InputProps={{
        ...inputProps,
        'aria-invalid': internalError,
        'aria-required': required,
        'aria-describedby': internalHelperText ? `${label}-helper-text` : undefined,
      }}
      FormHelperTextProps={{
        id: `${label}-helper-text`,
        role: internalError ? 'alert' : undefined,
      }}
    />
  );
};

export type { InputProps };