import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes } from '@mui/system';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentMessage } from '../../lib/types';

const clrAmber = '#D4B07A';

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

interface MessageBubbleProps {
  message: AgentMessage;
  agentColor: string;
  agentName: string;
  position?: { x: number; y: number };
  onClose?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  agentColor,
  agentName,
  position,
}) => {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        position: position ? 'absolute' : 'relative',
        left: position?.x || 'auto',
        top: position?.y || 'auto',
        maxWidth: 320,
        padding: 2,
        background: 'linear-gradient(180deg, rgba(31,35,44,0.92) 0%, rgba(23,26,34,0.92) 100%)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${agentColor}40`,
        borderLeft: `4px solid ${agentColor}`,
        borderRadius: 2,
        animation: `${fadeInAnimation} 0.6s cubic-bezier(0.16, 1, 0.3, 1), ${floatAnimation} 6s cubic-bezier(0.45, 0, 0.55, 1) infinite`,
        boxShadow: `0 1px 0 rgba(244,240,232,0.04) inset, 0 12px 32px rgba(0,0,0,0.32), 0 0 24px ${agentColor}22`,
        cursor: 'default',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: `0 1px 0 rgba(244,240,232,0.06) inset, 0 16px 40px rgba(0,0,0,0.36), 0 0 32px ${agentColor}3A`,
          borderColor: `${agentColor}66`,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: agentColor,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {agentName}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          {formatTime(message.timestamp)}
        </Typography>
      </Box>

      <Box
        sx={{
          color: 'text.primary',
          '& p': { margin: '0.5rem 0', lineHeight: 1.6, fontSize: '0.875rem' },
          '& p:first-of-type': { marginTop: 0 },
          '& p:last-of-type': { marginBottom: 0 },
          '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.875rem' },
          '& li': { marginBottom: '0.25rem', lineHeight: 1.6 },
          '& strong': { fontWeight: 600 },
          '& code': {
            backgroundColor: 'rgba(212,176,122,0.16)',
            color: clrAmber,
            padding: '2px 4px',
            borderRadius: 0.5,
            fontSize: '0.8125rem',
            fontFamily: '"JetBrains Mono", monospace',
            border: '1px solid rgba(212,176,122,0.20)',
          },
          '& h1, & h2, & h3': {
            fontSize: '0.9rem',
            fontWeight: 600,
            margin: '0.5rem 0',
            letterSpacing: '-0.005em',
          }
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.message}</ReactMarkdown>
      </Box>

      {message.message_type && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: '1px solid rgba(244,240,232,0.06)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              fontStyle: 'italic',
            }}
          >
            {message.message_type}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MessageBubble;
