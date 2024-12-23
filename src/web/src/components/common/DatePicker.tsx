/**
 * @fileoverview Enterprise-grade DatePicker component with Material Design 3.0 implementation
 * @version 1.0.0
 * 
 * Provides a comprehensive date selection experience with enhanced features:
 * - Timezone awareness
 * - Business rules validation
 * - Accessibility compliance (WCAG 2.1 Level AA)
 * - Internationalization support
 * - Performance optimizations
 */

import React, { useCallback, useState, useEffect } from 'react';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // ^6.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { formatDateTime, parseDateTime } from '../../utils/date.utils';
import Input from './Input';

// Constants for date handling
const DEFAULT_FORMAT = 'YYYY-MM-DD';
const MIN_DATE_OFFSET = 0; // Today
const MAX_DATE_OFFSET = 365; // One year ahead

// Interface for business hours configuration
interface BusinessHours {
  start: number; // 0-23
  end: number; // 0-23
  excludeWeekends?: boolean;
}

// Interface for analytics tracking
interface DatePickerAnalytics {
  trackSelection?: boolean;
  trackValidation?: boolean;
  category?: string;
}

// Enhanced props interface with comprehensive options
interface DatePickerProps {
  id: string;
  name: string;
  label: string;
  value: Date | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  format?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
  timezone?: string;
  onChange: (date: Date | null) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onValidate?: (isValid: boolean, message?: string) => void;
  highContrast?: boolean;
  reduceMotion?: boolean;
  businessHours?: BusinessHours;
  holidays?: Date[];
  analytics?: DatePickerAnalytics;
}

// Styled component with enterprise theming and accessibility features
const StyledDatePicker = styled(MuiDatePicker)(({ theme, error, highContrast }) => ({
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: highContrast ? 'none' : theme.transitions.create([
      'border-color',
      'background-color',
      'box-shadow',
    ]),
  },
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5),
    color: error ? theme.palette.error.main : theme.palette.text.primary,
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 0.7,
    },
  },
  '& .MuiIconButton-root': {
    color: error ? theme.palette.error.main : theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  ...(highContrast && {
    '& .MuiInputBase-root': {
      border: `2px solid ${error ? theme.palette.error.main : theme.palette.primary.main}`,
    },
  }),
}));

/**
 * Enterprise-grade DatePicker component with comprehensive features
 */
const DatePicker: React.FC<DatePickerProps> = ({
  id,
  name,
  label,
  value,
  placeholder,
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  format = DEFAULT_FORMAT,
  minDate = new Date(),
  maxDate = new Date(Date.now() + MAX_DATE_OFFSET * 24 * 60 * 60 * 1000),
  timezone = 'UTC',
  onChange,
  onBlur,
  onValidate,
  highContrast = false,
  reduceMotion = false,
  businessHours,
  holidays = [],
  analytics,
}) => {
  // Internal state for validation and formatting
  const [internalValue, setInternalValue] = useState<Date | null>(value);
  const [internalError, setInternalError] = useState<boolean>(error);
  const [internalHelperText, setInternalHelperText] = useState<string>(helperText);

  // Validate date against business rules
  const validateDate = useCallback((date: Date | null): boolean => {
    if (!date) return !required;

    // Check min/max date constraints
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;

    // Check business hours if configured
    if (businessHours) {
      const hours = date.getHours();
      if (hours < businessHours.start || hours > businessHours.end) return false;
      if (businessHours.excludeWeekends && [0, 6].includes(date.getDay())) return false;
    }

    // Check holidays
    if (holidays.some(holiday => 
      holiday.getFullYear() === date.getFullYear() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate()
    )) return false;

    return true;
  }, [required, minDate, maxDate, businessHours, holidays]);

  // Handle date change with validation and analytics
  const handleDateChange = useCallback((newDate: Date | null) => {
    let isValid = validateDate(newDate);
    let message = '';

    if (!isValid) {
      message = 'Selected date is not valid for this exercise';
      setInternalError(true);
      setInternalHelperText(message);
    } else {
      setInternalError(false);
      setInternalHelperText(helperText);
    }

    // Update internal state
    setInternalValue(newDate);

    // Trigger callbacks
    if (onValidate) onValidate(isValid, message);
    onChange(newDate);

    // Track analytics if configured
    if (analytics?.trackSelection) {
      // Analytics implementation would go here
      console.debug('Date selection tracked:', {
        category: analytics.category || 'DatePicker',
        action: 'select',
        value: newDate ? formatDateTime(newDate, format, timezone) : null,
      });
    }
  }, [validateDate, onChange, onValidate, helperText, analytics, format, timezone]);

  // Handle blur events
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) onBlur(event);

    // Validate on blur
    const dateValue = event.target.value ? parseDateTime(event.target.value, format) : null;
    const isValid = validateDate(dateValue);

    if (analytics?.trackValidation) {
      // Analytics implementation would go here
      console.debug('Date validation tracked:', {
        category: analytics.category || 'DatePicker',
        action: 'validate',
        value: isValid,
      });
    }
  }, [onBlur, validateDate, analytics, format]);

  // Sync with external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <StyledDatePicker
      value={internalValue}
      onChange={handleDateChange}
      renderInput={(params) => (
        <Input
          {...params}
          id={id}
          name={name}
          label={label}
          required={required}
          disabled={disabled}
          error={internalError}
          helperText={internalHelperText}
          placeholder={placeholder}
          onBlur={handleBlur}
          inputProps={{
            'aria-label': label,
            'aria-required': required,
            'aria-invalid': internalError,
            'data-testid': `datepicker-${id}`,
          }}
        />
      )}
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      format={format}
      reduceAnimations={reduceMotion}
      error={internalError}
      highContrast={highContrast}
    />
  );
};

export default DatePicker;