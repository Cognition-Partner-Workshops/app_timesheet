import React from 'react';
import { Typography, Chip } from '@mui/material';

interface EmptyCellProps {
  value: string | null | undefined;
  emptyLabel?: string;
}

const EmptyCell: React.FC<EmptyCellProps> = ({ value, emptyLabel = '-' }) => {
  if (value) {
    return (
      <Typography variant="body2" color="text.secondary">
        {value}
      </Typography>
    );
  }
  return <Chip label={emptyLabel} size="small" variant="outlined" />;
};

export default EmptyCell;
