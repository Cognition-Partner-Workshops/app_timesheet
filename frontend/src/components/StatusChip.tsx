import React from 'react';
import { Chip } from '@mui/material';

const statusColorMap: Record<string, 'success' | 'default' | 'warning'> = {
  active: 'success',
  completed: 'default',
  'on-hold': 'warning',
};

interface StatusChipProps {
  status: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => (
  <Chip label={status} size="small" color={statusColorMap[status] || 'default'} />
);

export default StatusChip;
