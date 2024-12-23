import React, { useCallback, useMemo, useRef, useState } from 'react'; // ^18.2.0
import { 
  Select as MuiSelect, 
  MenuItem, 
  FormControl, 
  FormHelperText,
  useMediaQuery,
  SelectChangeEvent
} from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { defaultTheme } from '../../assets/styles/theme';

// Interface for select options
interface SelectOption {
  value: string | number;
  label: string;
}

// Props interface with comprehensive options
interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  validation?: (value: string | number) => boolean;
  virtualized?: boolean;
  mobileNative?: boolean;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

// Styled select component with theme integration
const StyledSelect = styled(MuiSelect)(({ theme }) => ({
  minWidth: 200,
  '& .MuiSelect-select': {
    minHeight: 20,
    padding: theme.spacing(1.5),
    '&:focus': {
      backgroundColor: 'transparent',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.23)' 
      : 'rgba(255, 255, 255, 0.23)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
  },
  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.error.main,
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
  },
}));

// Custom hook for keyboard navigation
const useSelectKeyboardNavigation = (options: SelectOption[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Handle character search
    if (event.key.length === 1) {
      setSearchQuery(prev => prev + event.key);
      
      // Find matching option
      const matchingOption = options.find(option => 
        option.label.toLowerCase().startsWith(searchQuery.toLowerCase())
      );

      if (matchingOption) {
        // Focus matching option
        const element = document.querySelector(`[data-value="${matchingOption.value}"]`);
        if (element) {
          (element as HTMLElement).focus();
        }
      }

      // Clear search query after delay
      searchTimeout.current = setTimeout(() => {
        setSearchQuery('');
      }, 1000);
    }
  }, [options, searchQuery]);

  return { handleKeyDown };
};

// Main select component
export const Select: React.FC<SelectProps> = React.memo(({
  value,
  onChange,
  options,
  error = false,
  helperText,
  disabled = false,
  required = false,
  label,
  validation,
  virtualized = false,
  mobileNative = true,
  className,
  style,
  testId = 'select-component'
}) => {
  // State for internal validation
  const [internalError, setInternalError] = useState(false);
  const [internalHelperText, setInternalHelperText] = useState(helperText);

  // Media query for responsive design
  const isMobile = useMediaQuery(defaultTheme.breakpoints.down('sm'));

  // Keyboard navigation hook
  const { handleKeyDown } = useSelectKeyboardNavigation(options);

  // Memoized ARIA labels
  const ariaLabels = useMemo(() => ({
    select: label || 'Select option',
    required: required ? 'Required field' : undefined,
    error: error || internalError ? 'Error in selection' : undefined,
  }), [label, required, error, internalError]);

  // Change handler with validation
  const handleChange = useCallback((event: SelectChangeEvent<unknown>) => {
    const newValue = event.target.value;

    // Validation logic
    let isValid = true;
    if (required && !newValue) {
      isValid = false;
      setInternalError(true);
      setInternalHelperText('This field is required');
    } else if (validation && !validation(newValue as string | number)) {
      isValid = false;
      setInternalError(true);
      setInternalHelperText('Invalid selection');
    } else {
      setInternalError(false);
      setInternalHelperText(helperText);
    }

    // Call onChange with new value
    if (isValid) {
      onChange(newValue as string | number);
    }

    // Announce change to screen readers
    const announcement = isValid 
      ? `Selected ${options.find(opt => opt.value === newValue)?.label}`
      : 'Invalid selection';
    
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 1000);
  }, [onChange, options, required, validation, helperText]);

  // Render select items
  const renderSelectItems = useCallback(() => {
    return options.map((option) => (
      <MenuItem
        key={option.value}
        value={option.value}
        data-value={option.value}
        data-testid={`${testId}-option-${option.value}`}
      >
        {option.label}
      </MenuItem>
    ));
  }, [options, testId]);

  return (
    <FormControl 
      error={error || internalError}
      disabled={disabled}
      required={required}
      className={className}
      style={style}
      data-testid={testId}
    >
      <StyledSelect
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        native={isMobile && mobileNative}
        aria-label={ariaLabels.select}
        aria-required={required}
        aria-invalid={error || internalError}
        aria-describedby={`${testId}-helper-text`}
        inputProps={{
          'aria-label': label,
          'data-testid': `${testId}-input`
        }}
      >
        {isMobile && mobileNative ? (
          options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : renderSelectItems()}
      </StyledSelect>
      
      {(helperText || internalHelperText) && (
        <FormHelperText id={`${testId}-helper-text`}>
          {internalHelperText || helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
});

Select.displayName = 'Select';

export type { SelectProps, SelectOption };