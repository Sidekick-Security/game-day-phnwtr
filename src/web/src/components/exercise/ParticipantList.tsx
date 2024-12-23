import React, { useMemo, useCallback } from 'react';
import { Badge } from '@mui/material'; // ^5.0.0
import { formatDistanceToNow } from 'date-fns'; // ^2.30.0
import Table from '../common/Table';
import { IExerciseParticipant } from '../../interfaces/exercise.interface';
import { ParticipantRole, ParticipantStatus } from '../../types/exercise.types';

// Constants for participant status styling and behavior
const STATUS_COLORS = {
  [ParticipantStatus.ACTIVE]: 'success',
  [ParticipantStatus.INACTIVE]: 'warning',
  [ParticipantStatus.INVITED]: 'info',
  [ParticipantStatus.ACCEPTED]: 'info',
  [ParticipantStatus.DECLINED]: 'error',
} as const;

const PARTICIPANT_COLUMNS = [
  {
    id: 'name',
    label: 'Name',
    sortable: true,
    width: '25%',
    renderCell: (participant: IExerciseParticipant) => (
      `${participant.userId}`
    ),
  },
  {
    id: 'role',
    label: 'Role',
    sortable: true,
    width: '25%',
    renderCell: (participant: IExerciseParticipant) => (
      <span role="cell" aria-label={`Role: ${participant.role}`}>
        {participant.role}
      </span>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    width: '25%',
    renderCell: (participant: IExerciseParticipant) => (
      <Badge
        color={STATUS_COLORS[participant.status]}
        variant="dot"
        sx={{ '& .MuiBadge-badge': { right: -8, top: '50%' } }}
      >
        <span role="status" aria-label={`Status: ${participant.status}`}>
          {participant.status}
        </span>
      </Badge>
    ),
  },
  {
    id: 'lastActive',
    label: 'Last Active',
    sortable: true,
    width: '25%',
    renderCell: (participant: IExerciseParticipant) => {
      if (!participant.lastActive) return 'Never';
      return (
        <span role="cell" aria-label={`Last active: ${formatLastActive(participant.lastActive)}`}>
          {formatLastActive(participant.lastActive)}
        </span>
      );
    },
  },
];

interface ParticipantListProps {
  participants: IExerciseParticipant[];
  loading?: boolean;
  onParticipantClick?: (participant: IExerciseParticipant) => void;
  showPagination?: boolean;
  maxHeight?: string;
  pageSize?: number;
  sortable?: boolean;
  locale?: string;
  enableRealTimeUpdates?: boolean;
}

/**
 * Formats the last active time in a human-readable format
 * @param lastActive - The timestamp of last activity
 * @returns Formatted time string
 */
const formatLastActive = (lastActive: Date): string => {
  try {
    return formatDistanceToNow(new Date(lastActive), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting last active time:', error);
    return 'Unknown';
  }
};

/**
 * ParticipantList component displays a list of exercise participants with real-time updates
 * and status tracking capabilities.
 */
const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  loading = false,
  onParticipantClick,
  showPagination = true,
  maxHeight = '400px',
  pageSize = 10,
  sortable = true,
  locale = 'en',
  enableRealTimeUpdates = true,
}) => {
  // Memoize the table data to prevent unnecessary re-renders
  const tableData = useMemo(() => {
    return participants.map(participant => ({
      ...participant,
      id: participant.id, // Ensure unique key for each row
    }));
  }, [participants]);

  // Handle row click events
  const handleRowClick = useCallback((row: IExerciseParticipant) => {
    onParticipantClick?.(row);
  }, [onParticipantClick]);

  return (
    <Table
      columns={PARTICIPANT_COLUMNS}
      data={tableData}
      loading={loading}
      pagination={showPagination}
      maxHeight={maxHeight}
      onRowClick={handleRowClick}
      rowsPerPageOptions={[5, 10, 25, 50]}
      defaultSort="lastActive"
      defaultOrder="desc"
      stickyHeader
      ariaLabel="Exercise participants list"
      ariaDescribedBy="exercise-participants-table"
    />
  );
};

// Add display name for debugging
ParticipantList.displayName = 'ParticipantList';

export default ParticipantList;