import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Modal,
  Fade,
  Backdrop,
} from '@mui/material';
import { keyframes } from '@mui/system';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentMessage, Agent } from '../../lib/types';
import { preprocessMarkdown } from '../../lib/markdownUtils';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const clrText = '#F4F0E8';
const clrMuted = '#B5AFA4';
const clrSoft = '#76716A';
const clrNight = '#0A0B0F';
const clrLilac = '#C2B5E8';
const clrLilacDeep = '#9D8DD0';
const clrMint = '#A8D4C5';
const clrAmber = '#D4B07A';

interface LiveActivityFeedProps {
  messages: AgentMessage[];
  agents: Agent[];
  activeAgents: string[];
}

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 currentColor;
  }
  50% {
    box-shadow: 0 0 0 4px transparent;
  }
`;


const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  messages,
  agents,
  activeAgents,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const getAgent = (agentId: string): Agent | undefined => {
    return agents.find(a => a.id === agentId);
  };

  const isAgentActive = (agentId: string): boolean => {
    return activeAgents.includes(agentId);
  };

  const filteredMessages = messages.filter(message => {
    const agent = getAgent(message.agent);
    const agentName = agent?.name || message.agent;
    const matchesSearch = searchQuery === '' ||
      message.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAgent = selectedAgent === null || message.agent === selectedAgent;

    return matchesSearch && matchesAgent;
  });

  const AGENT_PHASE_LABEL: Record<string, string> = {
    system: 'Idea Intake',
    dataset_agent: 'Dataset Planning',
    kaggle_agent: 'Kaggle Search',
    model_agent: 'Model Selection',
    huggingface_agent: 'HuggingFace Search',
    compatibility_agent: 'Compatibility Check',
    training_agent: 'Training Plan',
    evaluation_agent: 'Evaluation Plan',
    modelx_guide: 'Blueprint Synthesis',
  };

  const messagesByPhase = filteredMessages.reduce((acc, message) => {
    const phase = AGENT_PHASE_LABEL[message.agent] ?? 'Idea Intake';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(message);
    return acc;
  }, {} as Record<string, AgentMessage[]>);

  return (
    <>
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid rgba(244,240,232,0.06)',
          background: 'rgba(16,18,24,0.6)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ p: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: clrSoft }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon sx={{ fontSize: 16, color: clrSoft }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                background: 'rgba(31,35,44,0.85)',
                height: 36,
                fontSize: '0.875rem',
                color: clrText,
                '& fieldset': { borderColor: 'rgba(244,240,232,0.08)' },
                '&:hover fieldset': { borderColor: 'rgba(244,240,232,0.14)' },
              },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <FilterListIcon sx={{ fontSize: 16, color: clrSoft }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: clrSoft, textTransform: 'uppercase', letterSpacing: '0.10em', fontSize: '0.7rem' }}>
              Agents
            </Typography>
          </Box>

          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <Box
              onClick={() => setSelectedAgent(null)}
              sx={{
                width: '100%',
                height: 36,
                px: 1.25,
                py: 0.75,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 1.5,
                background: selectedAgent === null
                  ? 'linear-gradient(135deg, #C2B5E8 0%, #9D8DD0 100%)'
                  : 'rgba(31,35,44,0.85)',
                color: selectedAgent === null ? clrNight : clrMuted,
                fontWeight: selectedAgent === null ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                border: selectedAgent === null ? 'none' : '1px solid rgba(244,240,232,0.06)',
                boxShadow: selectedAgent === null
                  ? '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 16px rgba(157,141,208,0.40)'
                  : 'none',
                '&:hover': {
                  background: selectedAgent === null
                    ? 'linear-gradient(135deg, #D5CBEF 0%, #C2B5E8 100%)'
                    : 'rgba(31,35,44,1)',
                  transform: 'translateX(2px)',
                  borderColor: selectedAgent === null ? 'transparent' : 'rgba(244,240,232,0.10)',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  width: '100%',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                All Agents
              </Typography>
            </Box>
            {agents.map(agent => (
              <Box
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
                sx={{
                  width: '100%',
                  height: 36,
                  px: 1.25,
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 1.5,
                  background: selectedAgent === agent.id
                    ? `linear-gradient(135deg, ${agent.color}E6 0%, ${agent.color}B3 100%)`
                    : 'rgba(31,35,44,0.6)',
                  color: selectedAgent === agent.id ? clrNight : clrMuted,
                  fontWeight: selectedAgent === agent.id ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: selectedAgent === agent.id ? 'none' : `1px solid ${agent.color}30`,
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: selectedAgent === agent.id
                    ? `0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 16px ${agent.color}40`
                    : 'none',
                  '&:hover': {
                    background: selectedAgent === agent.id
                      ? `linear-gradient(135deg, ${agent.color} 0%, ${agent.color}D9 100%)`
                      : `${agent.color}1A`,
                    color: selectedAgent === agent.id ? clrNight : agent.color,
                    transform: 'translateX(2px)',
                    borderColor: selectedAgent === agent.id ? 'transparent' : `${agent.color}55`,
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    width: '100%',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {agent.name}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              background: 'rgba(194,181,232,0.10)',
              border: '1px solid rgba(194,181,232,0.28)',
              boxShadow: '0 0 16px rgba(194,181,232,0.10)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: clrLilac,
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '-0.005em',
              }}
            >
              {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid rgba(244,240,232,0.06)',
            background: 'rgba(16,18,24,0.6)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: clrText, letterSpacing: '-0.01em' }}>
            Live Activity Feed
          </Typography>
          <IconButton
            onClick={() => setFullscreen(true)}
            sx={{
              color: clrSoft,
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': {
                color: clrLilac,
                background: 'rgba(194,181,232,0.10)',
              },
            }}
          >
            <FullscreenIcon />
          </IconButton>
        </Box>

        <Box
          ref={feedRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            position: 'relative',
          }}
        >
        {Object.entries(messagesByPhase).map(([phase, phaseMessages]) => (
          <Box key={phase}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                mt: 2,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(244,240,232,0.10), transparent)',
                }}
              />
              <Chip
                label={phase}
                size="small"
                sx={{
                  background: 'rgba(194,181,232,0.12)',
                  color: clrLilac,
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  letterSpacing: '0.06em',
                  border: '1px solid rgba(194,181,232,0.22)',
                }}
              />
              <Box
                sx={{
                  flex: 1,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(244,240,232,0.10), transparent)',
                }}
              />
            </Box>

            {phaseMessages.map((message, index) => {
              const agent = getAgent(message.agent);
              if (!agent) return null;

              const isActive = isAgentActive(agent.id);

              return (
                <Box
                  key={`${message.agent}-${message.timestamp}-${index}`}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    mb: 1,
                    animation: `${slideIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1)`,
                    '&:hover': {
                      '& .message-card': {
                        background: 'rgba(31,35,44,1)',
                        borderColor: `${agent.color}55`,
                      },
                    },
                  }}
                >
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: agent.color,
                        color: clrNight,
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        border: isActive ? `2px solid ${agent.color}` : '1px solid rgba(244,240,232,0.08)',
                        boxShadow: isActive ? `0 0 20px ${agent.color}55` : 'none',
                        animation: isActive ? `${pulse} 2s cubic-bezier(0.16, 1, 0.3, 1) infinite` : 'none',
                      }}
                    >
                      {agent.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </Avatar>
                    {isActive && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: clrMint,
                          border: '2px solid #171A22',
                          boxShadow: '0 0 12px rgba(168,212,197,0.55)',
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      className="message-card"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'rgba(31,35,44,0.85)',
                        border: '1px solid rgba(244,240,232,0.06)',
                        borderLeft: `3px solid ${agent.color}`,
                        boxShadow: '0 1px 0 rgba(244,240,232,0.04) inset, 0 6px 18px rgba(0,0,0,0.24)',
                        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: agent.color,
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {agent.name}
                        </Typography>
                        {message.message_type && (
                          <Chip
                            label={message.message_type}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              background: `${agent.color}1F`,
                              color: agent.color,
                              fontWeight: 600,
                              border: `1px solid ${agent.color}33`,
                            }}
                          />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 'auto',
                            color: 'text.disabled',
                            fontSize: '0.7rem',
                          }}
                        >
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          color: 'text.primary',
                          '& p': { margin: '0.5rem 0', lineHeight: 1.6, fontSize: '0.875rem' },
                          '& p:first-of-type': { marginTop: 0 },
                          '& p:last-of-type': { marginBottom: 0 },
                          '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
                          '& li': { marginBottom: '0.25rem', lineHeight: 1.6 },
                          '& strong': { fontWeight: 600 },
                          '& em': { fontStyle: 'italic' },
                          '& code': {
                            backgroundColor: 'rgba(212,176,122,0.16)',
                            color: clrAmber,
                            padding: '2px 6px',
                            borderRadius: 1,
                            fontSize: '0.8125rem',
                            fontFamily: '"JetBrains Mono", monospace',
                            border: '1px solid rgba(212,176,122,0.20)',
                          },
                          '& pre': {
                            backgroundColor: clrNight,
                            color: clrText,
                            padding: '1rem',
                            borderRadius: 1,
                            overflow: 'auto',
                            margin: '0.5rem 0',
                            border: '1px solid rgba(244,240,232,0.08)',
                            fontFamily: '"JetBrains Mono", monospace',
                          },
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            fontWeight: 600,
                            margin: '0.75rem 0 0.5rem 0',
                            lineHeight: 1.4
                          },
                          '& h1': { fontSize: '1.25rem' },
                          '& h2': { fontSize: '1.1rem' },
                          '& h3': { fontSize: '1rem' },
                          '& h4, & h5, & h6': { fontSize: '0.875rem' },
                          '& blockquote': {
                            borderLeft: '4px solid',
                            borderColor: agent.color,
                            paddingLeft: '1rem',
                            margin: '0.5rem 0',
                            fontStyle: 'italic',
                            opacity: 0.8
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
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}

        {filteredMessages.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {searchQuery || selectedAgent
                ? 'No messages match your filters'
                : 'Waiting for agents to start planning...'}
            </Typography>
          </Box>
        )}
      </Box>

        {!autoScroll && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <Chip
              label="New messages below"
              size="small"
              onClick={() => {
                setAutoScroll(true);
                if (feedRef.current) {
                  feedRef.current.scrollTop = feedRef.current.scrollHeight;
                }
              }}
              sx={{
                background: 'linear-gradient(135deg, #C2B5E8 0%, #9D8DD0 100%)',
                color: clrNight,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 16px rgba(157,141,208,0.40)',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #D5CBEF 0%, #C2B5E8 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 22px rgba(157,141,208,0.55)',
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>

    <Modal
      open={fullscreen}
      onClose={() => setFullscreen(false)}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 700,
          sx: { backgroundColor: 'rgba(10,11,15,0.72)', backdropFilter: 'blur(8px)' },
        },
      }}
    >
      <Fade in={fullscreen} timeout={600}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#0F1116',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: '1px solid rgba(244,240,232,0.06)',
              background: 'rgba(16,18,24,0.6)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5, color: clrText, letterSpacing: '-0.02em' }}>
                Live Activity Feed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Full document view • {filteredMessages.length} messages
              </Typography>
            </Box>
            <IconButton
              onClick={() => setFullscreen(false)}
              sx={{
                color: clrSoft,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  color: clrLilac,
                  background: 'rgba(194,181,232,0.10)',
                },
              }}
            >
              <FullscreenExitIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              px: 6,
              py: 4,
              maxWidth: 1200,
              mx: 'auto',
              width: '100%',
            }}
          >
            <Box sx={{ mb: 4 }}>
              <TextField
                size="medium"
                fullWidth
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(31,35,44,0.85)',
                    color: clrText,
                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    '& fieldset': { borderColor: 'rgba(244,240,232,0.08)' },
                    '&:hover': {
                      background: 'rgba(31,35,44,1)',
                    },
                    '&:hover fieldset': { borderColor: 'rgba(244,240,232,0.14)' },
                  },
                }}
              />
            </Box>

            {filteredMessages.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 12,
                  px: 4,
                }}
              >
                <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
                  {searchQuery || selectedAgent
                    ? 'No messages match your filters'
                    : 'No messages yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchQuery || selectedAgent
                    ? 'Try adjusting your search or filter settings'
                    : 'Messages will appear here as agents start planning'}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {filteredMessages.map((message, index) => {
                  const agent = getAgent(message.agent);
                  if (!agent) {
                    return null;
                  }

                return (
                  <Box
                    key={`fullscreen-${message.agent}-${message.timestamp}-${index}`}
                    sx={{
                      animation: `${slideIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1)`,
                      p: 3,
                      borderRadius: 2,
                      background: 'rgba(31,35,44,0.85)',
                      border: '1px solid rgba(244,240,232,0.06)',
                      boxShadow: '0 1px 0 rgba(244,240,232,0.04) inset, 0 8px 24px rgba(0,0,0,0.28)',
                      '&:hover': {
                        background: 'rgba(31,35,44,1)',
                        borderColor: `${agent.color}55`,
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: agent.color,
                          color: clrNight,
                          border: `2px solid ${agent.color}55`,
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          boxShadow: `0 0 20px ${agent.color}40`,
                        }}
                      >
                        {agent.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: agent.color, letterSpacing: '-0.005em' }}>
                          {agent.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.timestamp).toLocaleTimeString()} • {message.message_type}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        color: 'text.primary',
                        '& > *': {
                          overflowX: 'auto',
                          overflowY: 'visible',
                        },
                        '& p': {
                          mb: 1.5,
                        },
                        '& ul, & ol': {
                          ml: 2,
                          mb: 1.5,
                        },
                        '& li': {
                          mb: 0.5,
                        },
                        '& code': {
                          background: 'rgba(212,176,122,0.16)',
                          color: clrAmber,
                          padding: '0.2em 0.4em',
                          borderRadius: '4px',
                          fontSize: '0.9em',
                          fontFamily: '"JetBrains Mono", monospace',
                          border: '1px solid rgba(212,176,122,0.20)',
                        },
                        '& pre': {
                          background: clrNight,
                          color: clrText,
                          padding: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          mb: 1.5,
                          border: '1px solid rgba(244,240,232,0.08)',
                          fontFamily: '"JetBrains Mono", monospace',
                        },
                        '& table': {
                          borderCollapse: 'collapse',
                          width: '100%',
                          margin: '1rem 0',
                          fontSize: '0.875rem',
                          display: 'table',
                          minWidth: '100%',
                        },
                        '& th, & td': {
                          border: '1px solid rgba(244,240,232,0.08)',
                          padding: '0.75rem',
                          textAlign: 'left',
                          whiteSpace: 'normal',
                          wordWrap: 'break-word',
                        },
                        '& th': {
                          background: 'rgba(194,181,232,0.10)',
                          fontWeight: 600,
                          color: clrLilac,
                        },
                        '& td': {
                          background: 'rgba(23,26,34,0.6)',
                          color: clrText,
                        },
                        '& tr:hover td': {
                          background: 'rgba(31,35,44,0.85)',
                        },
                        '& blockquote': {
                          borderLeft: `4px solid ${agent.color}`,
                          pl: 2,
                          ml: 0,
                          mb: 1.5,
                          fontStyle: 'italic',
                          color: 'text.secondary',
                        },
                        '& h1, & h2, & h3, & h4': {
                          mt: 2,
                          mb: 1,
                          fontWeight: 600,
                          letterSpacing: '-0.01em',
                          color: agent.color,
                        },
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessMarkdown(message.message)}</ReactMarkdown>
                    </Box>
                  </Box>
                );
              })}
              </Stack>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
    </>
  );
};

export default LiveActivityFeed;
