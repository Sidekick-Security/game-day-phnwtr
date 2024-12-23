/**
 * TeamSettings Component
 * Provides comprehensive team management functionality with enhanced security,
 * accessibility, and performance optimizations.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  useTheme
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';

import Table from '../common/Table';
import { IUser } from '../../interfaces/user.interface';
import AuthService from '../../services/auth.service';
import ErrorBoundary from '../common/ErrorBoundary';
import { handleApiError } from '../../utils/error.utils';
import { UserRole } from '../../types/auth.types';

// Constants
const QUERY_KEY = 'teams';
const DEBOUNCE_DELAY = 300;
const PAGE_SIZE = 10;

// Interfaces
interface TeamSettingsProps {
  organizationId: string;
  onTeamUpdate: (teams: Team[]) => void;
  className?: string;
  initialTeams?: Team[];
  maxTeamSize?: number;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  maxSize: number;
  status: TeamStatus;
}

interface TeamMember {
  userId: string;
  role: UserRole;
  joinedAt: Date;
  permissions: string[];
  status: MemberStatus;
}

enum TeamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  REMOVED = 'removed'
}

/**
 * TeamSettings Component
 * Manages team creation, member management, and role assignments
 */
const TeamSettings: React.FC<TeamSettingsProps> = ({
  organizationId,
  onTeamUpdate,
  className,
  initialTeams = [],
  maxTeamSize = 50
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State management
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Data fetching with react-query
  const { data: teams, isLoading, error } = useQuery(
    [QUERY_KEY, organizationId],
    async () => {
      const response = await fetch(`/api/v1/organizations/${organizationId}/teams`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      return response.json();
    },
    {
      initialData: initialTeams,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    }
  );

  // Mutations
  const createTeamMutation = useMutation(
    async (newTeam: Partial<Team>) => {
      const response = await fetch(`/api/v1/organizations/${organizationId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTeam),
      });
      if (!response.ok) {
        throw new Error('Failed to create team');
      }
      return response.json();
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(QUERY_KEY);
        onTeamUpdate([...(teams || []), data]);
      },
      onError: (error) => {
        handleApiError(error);
      },
    }
  );

  // Table columns configuration
  const columns = useMemo(() => [
    {
      id: 'name',
      label: t('team.name'),
      sortable: true,
      width: '25%',
    },
    {
      id: 'memberCount',
      label: t('team.members'),
      sortable: true,
      width: '15%',
      format: (value: number) => value.toString(),
    },
    {
      id: 'createdAt',
      label: t('team.created'),
      sortable: true,
      width: '20%',
      format: (value: Date) => new Date(value).toLocaleDateString(),
    },
    {
      id: 'status',
      label: t('team.status'),
      sortable: true,
      width: '15%',
    },
    {
      id: 'actions',
      label: t('common.actions'),
      sortable: false,
      width: '25%',
      renderCell: (row: Team) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleEditTeam(row)}
            disabled={!AuthService.checkPermission({ role: UserRole.EXERCISE_ADMIN })}
          >
            {t('common.edit')}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleDeleteTeam(row.id)}
            disabled={!AuthService.checkPermission({ role: UserRole.EXERCISE_ADMIN })}
          >
            {t('common.delete')}
          </Button>
        </Box>
      ),
    },
  ], [t]);

  // Handlers
  const handleCreateTeam = useCallback(async (teamData: Partial<Team>) => {
    try {
      await createTeamMutation.mutateAsync(teamData);
      setDialogOpen(false);
    } catch (error) {
      handleApiError(error);
    }
  }, [createTeamMutation]);

  const handleEditTeam = useCallback((team: Team) => {
    setSelectedTeam(team);
    setDialogOpen(true);
  }, []);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    if (!window.confirm(t('team.deleteConfirmation'))) {
      return;
    }

    try {
      await fetch(`/api/v1/organizations/${organizationId}/teams/${teamId}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries(QUERY_KEY);
    } catch (error) {
      handleApiError(error);
    }
  }, [organizationId, queryClient, t]);

  // Render loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error">
        {t('common.errorOccurred')}
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <Box className={className}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            {t('team.management')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setDialogOpen(true)}
            disabled={!AuthService.checkPermission({ role: UserRole.EXERCISE_ADMIN })}
          >
            {t('team.create')}
          </Button>
        </Box>

        <Table
          columns={columns}
          data={teams || []}
          pagination
          onPageChange={(newPage) => setPage(newPage)}
          rowsPerPage={PAGE_SIZE}
          stickyHeader
          aria-label={t('team.tableAriaLabel')}
        />

        <TeamDialog
          open={dialogOpen}
          team={selectedTeam}
          maxTeamSize={maxTeamSize}
          onClose={() => {
            setDialogOpen(false);
            setSelectedTeam(null);
          }}
          onSubmit={handleCreateTeam}
        />
      </Box>
    </ErrorBoundary>
  );
};

// Team Dialog Component
interface TeamDialogProps {
  open: boolean;
  team: Team | null;
  maxTeamSize: number;
  onClose: () => void;
  onSubmit: (team: Partial<Team>) => void;
}

const TeamDialog: React.FC<TeamDialogProps> = ({
  open,
  team,
  maxTeamSize,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '',
    description: '',
    maxSize: maxTeamSize,
    status: TeamStatus.ACTIVE,
  });

  useEffect(() => {
    if (team) {
      setFormData(team);
    }
  }, [team]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      aria-labelledby="team-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="team-dialog-title">
          {team ? t('team.edit') : t('team.create')}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label={t('team.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label={t('team.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              type="number"
              label={t('team.maxSize')}
              value={formData.maxSize}
              onChange={(e) => setFormData({ ...formData, maxSize: parseInt(e.target.value) })}
              inputProps={{ min: 1, max: maxTeamSize }}
              required
              fullWidth
            />
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TeamStatus })}
              fullWidth
              label={t('team.status')}
            >
              {Object.values(TeamStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {t(`team.status.${status}`)}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {team ? t('common.save') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TeamSettings;