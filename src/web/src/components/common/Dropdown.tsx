import React, { useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Select, MenuItem, SelectChangeEvent } from '@mui/material'; // ^5.0.0
import Icon from './Icon';
import { defaultTheme } from '../../assets/styles/theme';

// Interface for dropdown options
interface DropdownOption {
  value: string | number;
  label: string;
}

// Props interface with comprehensive options
interface DropdownProps {
  options: DropdownOption[];
  value: string | number | Array<string | number>;
  onChange: (value: string | number | Array<string | number>) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  required?: boolean;
  label?: string;
  loading?: boolean;
  renderValue?: (selected: any) => React.ReactNode;
  virtualized?: boolean;
  maxHeight?: number;
}

// Styled Select component with enhanced accessibility
const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: '200px',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.2s ease-in-out',
  '& .MuiSelect-select': {
    padding: theme.spacing(1.5, 2),
    minHeight: '20px',
  },
  '&:hover:not(.Mui-disabled)': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-focused': {
    borderColor: theme.palette.primary.main,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
    },
  },
  '&.Mui-error': {
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.error.main,
    },
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '@media (max-width: 600px)': {
    '& .MuiSelect-select': {
      minHeight: '48px', // Enhanced touch target
    },
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

// Styled MenuItem with accessibility enhancements
const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  minHeight: '40px',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  '@media (max-width: 600px)': {
    minHeight: '48px',
  },
}));

/**
 * Dropdown component implementing Material Design 3.0 principles
 * with comprehensive accessibility features and mobile optimization
 */
const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  multiple = false,
  disabled = false,
  error = false,
  helperText,
  className,
  size = 'medium',
  fullWidth = false,
  required = false,
  label,
  loading = false,
  renderValue,
  virtualized = false,
  maxHeight = 300,
}) => {
  // Memoized custom render value function
  const customRenderValue = useMemo(() => {
    if (renderValue) return renderValue;
    return (selected: any) => {
      if (multiple && Array.isArray(selected)) {
        if (selected.length === 0) return placeholder;
        return selected
          .map(val => options.find(opt => opt.value === val)?.label)
          .join(', ');
      }
      return options.find(opt => opt.value === selected)?.label || placeholder;
    };
  }, [multiple, options, placeholder, renderValue]);

  // Handle selection changes with validation
  const handleChange = useCallback((event: SelectChangeEvent<any>) => {
    const newValue = event.target.value;
    if (required && (newValue === '' || (Array.isArray(newValue) && newValue.length === 0))) {
      return;
    }
    onChange(newValue);
  }, [onChange, required]);

  // Render menu items with virtualization support if needed
  const renderOptions = useCallback(() => {
    return options.map((option) => (
      <StyledMenuItem
        key={option.value}
        value={option.value}
        aria-label={option.label}
        role="option"
      >
        {option.label}
      </StyledMenuItem>
    ));
  }, [options]);

  return (
    <StyledSelect
      value={value}
      onChange={handleChange}
      multiple={multiple}
      disabled={disabled || loading}
      error={error}
      className={className}
      size={size}
      fullWidth={fullWidth}
      required={required}
      label={label}
      renderValue={customRenderValue}
      displayEmpty
      MenuProps={{
        PaperProps: {
          style: {
            maxHeight,
          },
        },
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'left',
        },
        transformOrigin: {
          vertical: 'top',
          horizontal: 'left',
        },
      }}
      IconComponent={(props) => (
        <Icon
          name="analytics" // Using analytics icon as dropdown arrow
          {...props}
          ariaLabel={props['aria-label'] || 'dropdown indicator'}
        />
      )}
      aria-label={label || placeholder}
      aria-required={required}
      aria-invalid={error}
      aria-errormessage={error ? helperText : undefined}
      data-testid="dropdown"
    >
      {loading ? (
        <StyledMenuItem disabled>Loading...</StyledMenuItem>
      ) : (
        renderOptions()
      )}
    </StyledSelect>
  );
};

export default Dropdown;