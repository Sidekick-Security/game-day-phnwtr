import React, { useState, useCallback, useMemo } from 'react';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers'; // ^6.0.0
import { TextField } from '@mui/material'; // ^5.0.0
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { styled } from '@mui/material/styles';
import { defaultTheme } from '../../assets/styles/theme';
import { formatDateTime } from '../../utils/date.utils';

// Constants for time formats and ARIA labels
const TIME_FORMAT_24H = 'HH:mm';
const TIME_FORMAT_12H = 'hh:mm A';
const MINUTES_IN_DAY = 1440;

// Interface for component props
interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  minTime?: Date;
  maxTime?: Date;
  use24HourFormat?: boolean;
  locale?: string;
  className?: string;
  placeholder?: string;
  clearable?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Styled wrapper for consistent spacing and theme application
const TimePickerWrapper = styled('div')(({ theme }) => ({
  '& .MuiTextField-root': {
    margin: theme.spacing(1),
    width: '100%',
  },
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.23)' 
      : 'rgba(255, 255, 255, 0.23)',
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
  },
  '& .Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.error.main,
  },
  '& .MuiFormHelperText-root': {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
}));

/**
 * TimePickerComponent - A fully accessible time picker component
 * implementing Material Design 3.0 principles
 */
const TimePickerComponent: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label = 'Select Time',
  disabled = false,
  required = false,
  error = false,
  helperText = '',
  minTime,
  maxTime,
  use24HourFormat = false,
  locale = 'en',
  className,
  placeholder,
  clearable = true,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  // State for internal time value and validation
  const [internalValue, setInternalValue] = useState<Date | null>(value);
  const [isValid, setIsValid] = useState<boolean>(true);

  // Memoized time format based on 12/24 hour preference
  const timeFormat = useMemo(() => 
    use24HourFormat ? TIME_FORMAT_24H : TIME_FORMAT_12H,
  [use24HourFormat]);

  /**
   * Validates if the selected time is within allowed range
   */
  const validateTimeRange = useCallback((time: Date | null): boolean => {
    if (!time || !minTime && !maxTime) return true;

    const timeValue = time.getHours() * 60 + time.getMinutes();
    const minValue = minTime ? minTime.getHours() * 60 + minTime.getMinutes() : 0;
    const maxValue = maxTime ? maxTime.getHours() * 60 + maxTime.getMinutes() : MINUTES_IN_DAY;

    return timeValue >= minValue && timeValue <= maxValue;
  }, [minTime, maxTime]);

  /**
   * Handles time change with validation
   */
  const handleTimeChange = useCallback((newValue: Date | null) => {
    const isTimeValid = validateTimeRange(newValue);
    setIsValid(isTimeValid);
    setInternalValue(newValue);

    if (isTimeValid) {
      onChange(newValue);
    }
  }, [onChange, validateTimeRange]);

  /**
   * Formats time for display according to locale and format
   */
  const formatTimeLabel = useCallback((time: Date | null): string => {
    if (!time) return '';
    return formatDateTime(time, timeFormat);
  }, [timeFormat]);

  // Error message based on validation state
  const errorMessage = useMemo(() => {
    if (error) return helperText;
    if (!isValid) return 'Selected time is outside allowed range';
    return '';
  }, [error, helperText, isValid]);

  return (
    <TimePickerWrapper className={className}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
        <TimePicker
          value={internalValue}
          onChange={handleTimeChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              required={required}
              error={error || !isValid}
              helperText={errorMessage}
              disabled={disabled}
              placeholder={placeholder}
              inputProps={{
                ...params.inputProps,
                'aria-label': ariaLabel || label,
                'aria-describedby': ariaDescribedBy,
                'aria-required': required,
                'aria-invalid': error || !isValid,
              }}
            />
          )}
          ampm={!use24HourFormat}
          disabled={disabled}
          minTime={minTime}
          maxTime={maxTime}
          clearable={clearable}
          minutesStep={1}
          views={['hours', 'minutes']}
          InputAdornmentProps={{
            'aria-label': 'Toggle time picker',
          }}
          PopperProps={{
            placement: 'bottom-start',
            modifiers: [{
              name: 'flip',
              enabled: true,
            }],
          }}
          toolbarFormat={timeFormat}
          mask={use24HourFormat ? '__:__' : '__:__ _M'}
          acceptRegex={use24HourFormat ? /^\d{0,2}:\d{0,2}$/ : /^\d{0,2}:\d{0,2} [AaPp][Mm]$/}
        />
      </LocalizationProvider>
    </TimePickerWrapper>
  );
};

export default TimePickerComponent;