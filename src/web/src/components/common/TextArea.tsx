import React, { useCallback, useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { TextareaAutosize } from '@mui/material';
import debounce from 'lodash/debounce'; // ^4.17.21
import { defaultTheme } from '../../assets/styles/theme';
import { validateInput } from '../../utils/validation.utils';

// Interface for TextArea props with comprehensive options
interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  dir?: 'ltr' | 'rtl';
  validate?: (value: string) => boolean;
  ariaLabel?: string;
  testId?: string;
}

// Styled textarea component with Material Design 3.0 and accessibility features
const StyledTextArea = styled(TextareaAutosize)(({ theme, error, disabled }) => ({
  width: '100%',
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body1.fontSize,
  lineHeight: theme.typography.body1.lineHeight,
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${error 
    ? theme.palette.error.main 
    : theme.palette.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.23)' 
      : 'rgba(255, 255, 255, 0.23)'}`,
  backgroundColor: disabled 
    ? theme.palette.action.disabledBackground 
    : theme.palette.background.paper,
  color: disabled 
    ? theme.palette.text.disabled 
    : theme.palette.text.primary,
  resize: 'vertical',
  transition: theme.transitions.create([
    'border-color',
    'box-shadow',
    'background-color'
  ], {
    duration: theme.transitions.duration.shorter
  }),

  '&:hover': {
    borderColor: !disabled && !error && theme.palette.text.primary
  },

  '&:focus': {
    outline: 'none',
    borderColor: error 
      ? theme.palette.error.main 
      : theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${error 
      ? theme.palette.error.main + '40'
      : theme.palette.primary.main + '40'}`
  },

  '&::placeholder': {
    color: theme.palette.text.secondary,
    opacity: disabled ? 0.5 : 1
  },

  // High contrast mode support
  '@media screen and (forced-colors: active)': {
    borderColor: 'CanvasText',
    '&:focus': {
      outline: '2px solid CanvasText'
    }
  },

  // Responsive font sizing
  [theme.breakpoints.down('sm')]: {
    fontSize: theme.typography.body2.fontSize
  }
}));

// Helper text component with error state support
const HelperText = styled('div')(({ theme, error }) => ({
  marginTop: theme.spacing(0.5),
  fontSize: theme.typography.caption.fontSize,
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  minHeight: '1.25em',
  transition: theme.transitions.create('color')
}));

// Character counter component
const CharacterCounter = styled('div')(({ theme, error }) => ({
  marginTop: theme.spacing(0.5),
  fontSize: theme.typography.caption.fontSize,
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  textAlign: 'right'
}));

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  onBlur,
  error = false,
  helperText,
  disabled = false,
  placeholder,
  minRows = 3,
  maxRows = 10,
  maxLength,
  dir = 'ltr',
  validate,
  ariaLabel,
  testId
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounced validation to prevent excessive validation calls
  const debouncedValidation = useCallback(
    debounce((value: string) => {
      if (validate) {
        const isValid = validate(value);
        setInternalError(!isValid);
      }

      // Security validation using utility
      try {
        validateInput(value);
      } catch (err) {
        setInternalError(true);
        setErrorMessage(err instanceof Error ? err.message : 'Invalid input');
      }
    }, 300),
    [validate]
  );

  // Handle value changes with validation
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    
    // Length validation
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    onChange(newValue);
    debouncedValidation(newValue);
  }, [onChange, debouncedValidation, maxLength]);

  // Handle blur events
  const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    setTouched(true);
    debouncedValidation(event.target.value);
    onBlur?.(event);

    // Announce validation errors to screen readers
    if (internalError && textareaRef.current) {
      const announcement = errorMessage || helperText || 'Input validation failed';
      textareaRef.current.setAttribute('aria-invalid', 'true');
      textareaRef.current.setAttribute('aria-errormessage', announcement);
    }
  }, [onBlur, debouncedValidation, internalError, errorMessage, helperText]);

  // Cleanup debounced validation on unmount
  useEffect(() => {
    return () => {
      debouncedValidation.cancel();
    };
  }, [debouncedValidation]);

  const showError = (error || internalError) && touched;
  const displayHelperText = showError ? errorMessage || helperText : helperText;

  return (
    <div>
      <StyledTextArea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        minRows={minRows}
        maxRows={maxRows}
        dir={dir}
        error={showError}
        aria-label={ariaLabel}
        aria-invalid={showError}
        aria-describedby={displayHelperText ? 'helper-text' : undefined}
        data-testid={testId}
        theme={defaultTheme}
      />
      
      {displayHelperText && (
        <HelperText 
          id="helper-text"
          error={showError}
          role="alert"
          aria-live="polite"
        >
          {displayHelperText}
        </HelperText>
      )}

      {maxLength && (
        <CharacterCounter
          error={value.length === maxLength}
          aria-live="polite"
        >
          {value.length}/{maxLength}
        </CharacterCounter>
      )}
    </div>
  );
};

export default TextArea;