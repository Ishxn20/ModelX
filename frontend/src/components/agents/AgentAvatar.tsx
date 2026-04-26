import React from 'react';
import { Box, Avatar, Typography, Tooltip } from '@mui/material';
import { keyframes } from '@mui/system';
import CircleIcon from '@mui/icons-material/Circle';

interface AgentAvatarProps {
  name: string;
  color: string;
  status: 'idle' | 'thinking' | 'speaking' | 'done';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onClick?: () => void;
}

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
`;

const rotateGradient = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const clrThinking = '#f59e0b';
const clrSpeaking = '#10b981';
const clrDone = '#3b82f6';
const clrBgInner = '#141420';
const clrStatusBg = 'rgba(20, 20, 32, 0.9)';

const sizeMap = {
  small: { avatar: 48, container: 56, fontSize: '0.875rem' },
  medium: { avatar: 72, container: 84, fontSize: '1rem' },
  large: { avatar: 96, container: 112, fontSize: '1.25rem' },
};

const AgentAvatar: React.FC<AgentAvatarProps> = ({
  name,
  color,
  status,
  size = 'medium',
  showLabel = true,
  onClick,
}) => {
  const getInitials = (n: string): string =>
    n.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

  const dimensions = sizeMap[size];
  const isActive = status === 'thinking' || status === 'speaking';

  const getStatusIcon = () => {
    const iconSize = size === 'small' ? 8 : size === 'medium' ? 10 : 12;
    switch (status) {
      case 'thinking':
        return <CircleIcon sx={{ fontSize: iconSize, color: clrThinking, animation: `${pulseAnimation} 1.5s infinite` }} />;
      case 'speaking':
        return <CircleIcon sx={{ fontSize: iconSize, color: clrSpeaking, animation: `${pulseAnimation} 1s infinite` }} />;
      case 'done':
        return <CircleIcon sx={{ fontSize: iconSize, color: clrDone }} />;
      default:
        return <CircleIcon sx={{ fontSize: iconSize, color: 'rgba(255,255,255,0.3)' }} />;
    }
  };

  const indicatorSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;

  return (
    <Tooltip title={`${name} - ${status}`} arrow>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
        }}
        onClick={onClick}
      >
        <Box
          sx={{
            position: 'relative',
            width: dimensions.container,
            height: dimensions.container,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isActive && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                padding: '3px',
                background: `linear-gradient(135deg, ${color}, ${color}99, ${color}66)`,
                animation: `${rotateGradient} 3s linear infinite`,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '3px',
                  borderRadius: '50%',
                  background: clrBgInner,
                },
              }}
            />
          )}

          {!isActive && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${color}40`,
              }}
            />
          )}

          <Avatar
            sx={{
              width: dimensions.avatar,
              height: dimensions.avatar,
              bgcolor: color,
              fontSize: dimensions.fontSize,
              fontWeight: 600,
              zIndex: 1,
              boxShadow: isActive ? `0 0 30px ${color}60` : 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: onClick ? 'scale(1.05)' : 'none',
              },
            }}
          >
            {getInitials(name)}
          </Avatar>

          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: '50%',
              bgcolor: clrStatusBg,
              border: '2px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {getStatusIcon()}
          </Box>
        </Box>

        {showLabel && (
          <Typography
            variant="caption"
            sx={{
              textAlign: 'center',
              color: isActive ? 'text.primary' : 'text.secondary',
              fontWeight: isActive ? 600 : 400,
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease',
            }}
          >
            {name}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default AgentAvatar;
