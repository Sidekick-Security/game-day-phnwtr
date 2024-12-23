/**
 * Exercise List Component
 * Displays a grid of exercise cards with filtering, sorting, and pagination capabilities.
 * Implements Material Design 3.0 principles and comprehensive accessibility features.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import {
  Grid,
  Typography,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material'; // ^5.0.0

import { ExerciseCard } from './ExerciseCard';
import { useExercise } from '../../hooks/useExercise';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { ExerciseType, ExerciseStatus } from '../../types/exercise.types';
import { IExercise } from '../../interfaces/exercise.interface';

// Constants
const ITEMS_PER_PAGE = 12;
const GRID_SPACING = 3;
const SKELETON_COUNT = 6;

// Styled components
const StyledGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(3),
  '@media (max-width: 600px)': {
    padding: theme.spacing(2),
  },
}));

const FilterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  flexWrap: 'wrap',
  alignItems: 'center',
  '@media (max-width: 600px)': {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: theme.spacing(GRID_SPACING),
  padding: theme.spacing(2),
}));

// Sort options
type SortCriteria = 'lastUpdated' | 'title' | 'type' | 'progress';

// Props interface
interface ExerciseListProps {
  exercises: IExercise[];
  loading: boolean;
  error: Error | null;
  onExerciseClick: (id: string) => void;
  onContinueExercise: (id: string) => void;
  pageSize?: number;
  filterType?: ExerciseType | null;
  sortBy?: SortCriteria;
  onError?: (error: Error) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Exercise List Component
 * Displays a grid of exercise cards with filtering, sorting, and real-time updates
 */
export const ExerciseList: React.FC<ExerciseListProps> = React.memo(({
  exercises,
  loading,
  error,
  onExerciseClick,
  onContinueExercise,
  pageSize = ITEMS_PER_PAGE,
  filterType: initialFilterType = null,
  sortBy: initialSortBy = 'lastUpdated',
  onError,
  className,
  ariaLabel
}) => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<ExerciseType | null>(initialFilterType);
  const [sortBy, setSortBy] = useState<SortCriteria>(initialSortBy);

  // Memoized filtered and sorted exercises
  const filteredAndSortedExercises = useMemo(() => {
    let result = [...exercises];

    // Apply filter
    if (filterType) {
      result = result.filter(exercise => exercise.type === filterType);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'progress':
          return (b.metrics?.completionRate || 0) - (a.metrics?.completionRate || 0);
        case 'lastUpdated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [exercises, filterType, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedExercises.length / pageSize);
  const currentExercises = filteredAndSortedExercises.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Event handlers
  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // Announce page change to screen readers
    const announcement = `Page ${page} of ${totalPages}`;
    const ariaLive = document.getElementById('aria-live-region');
    if (ariaLive) ariaLive.textContent = announcement;
  }, [totalPages]);

  const handleFilterChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as ExerciseType | null;
    setFilterType(value);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  const handleSortChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    setSortBy(event.target.value as SortCriteria);
  }, []);

  // Error handling
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Loading state
  if (loading) {
    return (
      <LoadingContainer>
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={200}
            animation="wave"
            sx={{ borderRadius: 1 }}
          />
        ))}
      </LoadingContainer>
    );
  }

  return (
    <ErrorBoundary>
      <div className={className} role="region" aria-label={ariaLabel || "Exercise List"}>
        {/* Hidden live region for accessibility announcements */}
        <div id="aria-live-region" className="sr-only" aria-live="polite" />

        <FilterContainer>
          <FormControl variant="outlined" size={isMobile ? "small" : "medium"}>
            <InputLabel id="exercise-type-filter-label">Filter by Type</InputLabel>
            <Select
              labelId="exercise-type-filter-label"
              value={filterType || ''}
              onChange={handleFilterChange}
              label="Filter by Type"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Types</MenuItem>
              {Object.values(ExerciseType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size={isMobile ? "small" : "medium"}>
            <InputLabel id="exercise-sort-label">Sort by</InputLabel>
            <Select
              labelId="exercise-sort-label"
              value={sortBy}
              onChange={handleSortChange}
              label="Sort by"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="lastUpdated">Last Updated</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="type">Type</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
            </Select>
          </FormControl>
        </FilterContainer>

        <StyledGrid container spacing={GRID_SPACING}>
          {currentExercises.map((exercise) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={exercise.id}>
              <ExerciseCard
                id={exercise.id}
                title={exercise.title}
                type={exercise.type}
                status={exercise.status}
                progress={exercise.metrics?.completionRate || 0}
                participantCount={exercise.participants?.length || 0}
                onClick={() => onExerciseClick(exercise.id)}
                onContinue={() => onContinueExercise(exercise.id)}
                ariaLabel={`Exercise: ${exercise.title}`}
              />
            </Grid>
          ))}
        </StyledGrid>

        {totalPages > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              padding: theme.spacing(3, 0),
            }}
          >
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size={isMobile ? "small" : "medium"}
              showFirstButton
              showLastButton
              aria-label="Exercise list pagination"
            />
          </Box>
        )}
      </div>
    </ErrorBoundary>
  );
});

ExerciseList.displayName = 'ExerciseList';

export type { ExerciseListProps };