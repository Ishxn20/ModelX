import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface StatusBarProps {
  sessionId?: string;
  elapsedTime: number;
  phase: string;
}

const SESSION_DISPLAY_LENGTH = 16;

const StatusBar: React.FC<StatusBarProps> = ({ sessionId, elapsedTime, phase }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar variant="dense">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexGrow: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WifiIcon color="success" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              Connected
            </Typography>
          </Box>

          {sessionId && (
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Session: {sessionId.substring(0, SESSION_DISPLAY_LENGTH)}...
            </Typography>
          )}

          {phase !== 'idle' && (
            <Chip
              label={phase.charAt(0).toUpperCase() + phase.slice(1)}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <AccessTimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {formatTime(elapsedTime)}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default StatusBar;
