import * as React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { PLACEHOLDERS } from '@/utils/placeholders';

interface PlaceholderChipsProps {
  onSelect: (placeholder: string) => void;
}

export default function PlaceholderChips({ onSelect }: PlaceholderChipsProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Click a placeholder to copy it to your clipboard (or insert it if supported):
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {PLACEHOLDERS.map((p) => (
          <Chip
            key={p.key}
            label={p.key}
            size="small"
            onClick={() => onSelect(p.key)}
            title={p.label}
            variant="outlined"
            color="primary"
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
}
