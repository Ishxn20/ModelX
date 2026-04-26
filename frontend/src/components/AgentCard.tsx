import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, Tooltip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent, AgentMessage } from '../lib/types';

interface AgentCardProps {
  agent: Agent;
  messages: AgentMessage[];
  active: boolean;
  onClick?: () => void;
}

const TRUNCATE_LENGTH = 200;

const AgentCard: React.FC<AgentCardProps> = ({ agent, messages, active, onClick }) => {
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const [isHovered, setIsHovered] = useState(false);

  const truncateMessage = (message: string, maxLength: number = TRUNCATE_LENGTH): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <Card
      elevation={active ? 8 : 2}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        borderLeft: `4px solid ${agent.color}`,
        transition: 'all 0.3s ease',
        opacity: active ? 1 : 0.7,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        animation: active ? 'pulse 2s infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': {
            boxShadow: `0 0 10px ${agent.color}40`,
          },
          '50%': {
            boxShadow: `0 0 20px ${agent.color}80`,
          },
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Tooltip title={`${agent.name} - ${messages.length} message(s)`} arrow>
            <Typography
              variant="h6"
              sx={{
                color: agent.color,
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              {agent.name}
            </Typography>
          </Tooltip>
          {active && (
            <Chip
              label="Active"
              color="primary"
              size="small"
              sx={{
                animation: 'fadeIn 0.3s ease-in',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {latestMessage ? (
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'hidden',
              color: 'text.secondary',
              '& p': { margin: 0, lineHeight: 1.5, fontSize: '0.875rem' },
              '& ul, & ol': { margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' },
              '& li': { marginBottom: '0.25rem' },
              '& strong': { fontWeight: 600 },
              '& code': {
                backgroundColor: 'grey.100',
                padding: '2px 4px',
                borderRadius: 0.5,
                fontSize: '0.8125rem',
              },
              '& h1, & h2, & h3': {
                fontSize: '0.875rem',
                fontWeight: 600,
                margin: '0.5rem 0',
                color: 'text.primary',
              },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{truncateMessage(latestMessage.message)}</ReactMarkdown>
          </Box>
        ) : (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{
              flexGrow: 1,
              fontStyle: 'italic',
            }}
          >
            Waiting to start...
          </Typography>
        )}

        {messages.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 2,
              display: 'block',
              fontWeight: 500,
            }}
          >
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentCard;
