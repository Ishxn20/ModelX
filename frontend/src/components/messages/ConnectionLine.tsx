import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  animated?: boolean;
  dashed?: boolean;
}

const dashAnimation = keyframes`
  to {
    stroke-dashoffset: -100;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 2px currentColor);
  }
  50% {
    filter: drop-shadow(0 0 8px currentColor);
  }
`;

const PADDING = 20;
const CURVATURE = 0.2;

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  from,
  to,
  color = '#3b82f6',
  animated = true,
  dashed = false,
}) => {
  const [pathLength, setPathLength] = useState(0);

  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);

  const width = maxX - minX + PADDING * 2;
  const height = maxY - minY + PADDING * 2;

  const x1 = from.x - minX + PADDING;
  const y1 = from.y - minY + PADDING;
  const x2 = to.x - minX + PADDING;
  const y2 = to.y - minY + PADDING;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const controlX = midX + (-dy * CURVATURE);
  const controlY = midY + (dx * CURVATURE);

  const path = `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;

  useEffect(() => {
    setPathLength(distance);
  }, [distance]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: minX - PADDING,
        top: minY - PADDING,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`gradient-${from.x}-${from.y}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="50%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <path
          d={path}
          stroke={color}
          strokeWidth="3"
          fill="none"
          opacity="0.2"
          strokeLinecap="round"
          style={{
            ...(animated && {
              animation: `${pulseGlow} 2s ease-in-out infinite`,
            }),
          }}
        />

        <path
          d={path}
          stroke={`url(#gradient-${from.x}-${from.y})`}
          strokeWidth="2"
          fill="none"
          strokeDasharray={dashed ? '10 5' : undefined}
          strokeDashoffset={animated ? pathLength : 0}
          strokeLinecap="round"
          style={{
            ...(animated && {
              animation: `${dashAnimation} 3s linear infinite`,
            }),
          }}
        />
      </svg>
    </Box>
  );
};

export default ConnectionLine;
