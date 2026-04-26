import React from 'react';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';

interface GlassCardProps extends BoxProps {
  glow?: boolean;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  glow = false,
  glowColor = '#3b82f6',
  intensity = 'medium',
  sx,
  ...props
}) => {
  const intensityMap = {
    low: {
      bg: 'rgba(255, 255, 255, 0.03)',
      blur: 'blur(10px)',
      border: 'rgba(255, 255, 255, 0.05)',
    },
    medium: {
      bg: 'rgba(255, 255, 255, 0.05)',
      blur: 'blur(20px)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
    high: {
      bg: 'rgba(255, 255, 255, 0.08)',
      blur: 'blur(30px)',
      border: 'rgba(255, 255, 255, 0.15)',
    },
  };

  const settings = intensityMap[intensity];

  return (
    <Box
      sx={{
        background: settings.bg,
        backdropFilter: settings.blur,
        WebkitBackdropFilter: settings.blur,
        border: `1px solid ${settings.border}`,
        borderRadius: 3,
        padding: 2,
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(glow && {
          boxShadow: `0 0 30px ${glowColor}40, 0 0 60px ${glowColor}20`,
          '&:hover': {
            boxShadow: `0 0 40px ${glowColor}60, 0 0 80px ${glowColor}30`,
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default GlassCard;

