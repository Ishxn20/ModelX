import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, Stepper, Step, StepLabel, StepContent, Chip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessMarkdown } from '../../lib/markdownUtils';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Agent, AgentMessage } from '../../lib/types';

const clrText = '#F4F0E8';
const clrMuted = '#B5AFA4';
const clrSoft = '#76716A';
const clrNight = '#0A0B0F';
const clrAmber = '#D4B07A';
const clrLilac = '#C2B5E8';

interface AgentReasoningCardProps {
  agent: Agent;
  messages: AgentMessage[];
  active: boolean;
  onClick?: () => void;
}

const AgentReasoningCard: React.FC<AgentReasoningCardProps> = ({
  agent,
  messages,
  active,
  onClick,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    if (active) return <PlayArrowIcon sx={{ color: agent.color, animation: 'pulse 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite' }} />;
    if (messages.length > 0) return <CheckCircleIcon sx={{ color: '#A8D4C5' }} />;
    return <PendingIcon sx={{ color: clrSoft }} />;
  };

  const getStatusText = () => {
    if (active) return 'Analyzing...';
    if (messages.length > 0) return 'Complete';
    return 'Pending';
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        background: `linear-gradient(135deg, ${agent.color}14 0%, rgba(23,26,34,0.85) 100%)`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${active ? agent.color + '55' : 'rgba(244,240,232,0.08)'}`,
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        boxShadow: '0 1px 0 rgba(244,240,232,0.04) inset, 0 12px 32px rgba(0,0,0,0.28)',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: agent.color + '70',
          boxShadow: `0 1px 0 rgba(244,240,232,0.06) inset, 0 16px 40px rgba(0,0,0,0.36), 0 0 32px ${agent.color}30`,
          background: `linear-gradient(135deg, ${agent.color}1F 0%, rgba(31,35,44,0.85) 100%)`,
        },
        ...(active && {
          boxShadow: `0 1px 0 rgba(244,240,232,0.06) inset, 0 12px 32px rgba(0,0,0,0.32), 0 0 32px ${agent.color}40`,
          animation: 'gentlePulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite',
          '@keyframes gentlePulse': {
            '0%, 100%': {
              boxShadow: `0 1px 0 rgba(244,240,232,0.06) inset, 0 12px 32px rgba(0,0,0,0.32), 0 0 32px ${agent.color}40`,
            },
            '50%': {
              boxShadow: `0 1px 0 rgba(244,240,232,0.08) inset, 0 16px 40px rgba(0,0,0,0.36), 0 0 48px ${agent.color}5A`,
            },
          },
        }),
      }}
    >
      {active && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${agent.color}20, transparent)`,
            animation: 'shimmer 2s infinite',
            '@keyframes shimmer': {
              '0%': { left: '-100%' },
              '100%': { left: '100%' },
            },
          }}
        />
      )}

      <Box sx={{ p: 2.5, pb: messages.length === 0 ? 2.5 : 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${agent.color} 0%, ${agent.color}CC 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: clrNight,
                boxShadow: `0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 16px ${agent.color}55`,
                flexShrink: 0,
              }}
            >
              {agent.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: clrText,
                  mb: 0.25,
                  letterSpacing: '-0.01em',
                }}
              >
                {agent.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon()}
                <Typography
                  variant="caption"
                  sx={{
                    color: active ? agent.color : clrMuted,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {getStatusText()}
                </Typography>
              </Box>
            </Box>
          </Box>

          {messages.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                color: agent.color,
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          )}
        </Box>

        {messages.length > 0 && (
          <Chip
            label={`${messages.length} ${messages.length === 1 ? 'insight' : 'insights'}`}
            size="small"
            sx={{
              background: `${agent.color}1F`,
              color: agent.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
              border: `1px solid ${agent.color}40`,
              letterSpacing: '-0.005em',
            }}
          />
        )}
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            p: 2.5,
            pt: 1,
            borderTop: '1px solid rgba(244,240,232,0.06)',
            background: 'rgba(16,18,24,0.6)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: clrSoft,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              display: 'block',
              mb: 2,
            }}
          >
            Reasoning Process
          </Typography>
          <Stepper orientation="vertical" sx={{ '.MuiStepConnector-line': { borderColor: `${agent.color}30` } }}>
            {messages.map((message, index) => (
              <Step key={message.timestamp} active completed>
                <StepLabel
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: `${agent.color}26`,
                        border: `2px solid ${agent.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: agent.color,
                        boxShadow: `0 0 12px ${agent.color}40`,
                      }}
                    >
                      {index + 1}
                    </Box>
                  )}
                  sx={{
                    '.MuiStepLabel-label': {
                      color: clrMuted,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    },
                  }}
                >
                  {message.message_type || 'Analysis'}
                </StepLabel>
                <StepContent>
                  <Box
                    sx={{
                      color: clrText,
                      mb: 1,
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
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        margin: '0.5rem 0',
                        letterSpacing: '-0.005em',
                      },
                      '& > *': {
                        overflowX: 'auto',
                        overflowY: 'visible',
                      },
                      '& table': {
                        borderCollapse: 'collapse',
                        width: '100%',
                        margin: '0.5rem 0',
                        fontSize: '0.8125rem',
                        display: 'table',
                        minWidth: '100%',
                      },
                      '& th, & td': {
                        border: '1px solid rgba(244,240,232,0.08)',
                        padding: '0.5rem',
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                      },
                      '& th': {
                        backgroundColor: 'rgba(194,181,232,0.10)',
                        color: clrLilac,
                        fontWeight: 600
                      }
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessMarkdown(message.message)}</ReactMarkdown>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.disabled',
                      fontSize: '0.7rem',
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Collapse>
    </Box>
  );
};

export default AgentReasoningCard;
