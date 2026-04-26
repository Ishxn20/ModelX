import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Agent, MLBlueprint, Phase, ProjectData } from '../lib/types';
import { useSimulation } from '../hooks/useSimulation';
import PhaseIndicator from './PhaseIndicator';
import MLBlueprintPanel from './MLBlueprintPanel';
import LiveActivityFeed from './debate/LiveActivityFeed';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PsychologyIcon from '@mui/icons-material/Psychology';

interface DebateViewerProps {
  sessionId: string;
  projectData: ProjectData;
  onReset: () => void;
  onBlueprintReady?: (blueprint: MLBlueprint) => void;
}

const allAgents: Agent[] = [
  { id: 'system', name: 'System', color: '#76716A' },
  { id: 'dataset_agent', name: 'Dataset Agent', color: '#E5B5A0' },
  { id: 'kaggle_agent', name: 'Kaggle Agent', color: '#C2B5E8' },
  { id: 'model_agent', name: 'Model Agent', color: '#A2B4C4' },
  { id: 'huggingface_agent', name: 'HuggingFace Agent', color: '#D4B07A' },
  { id: 'compatibility_agent', name: 'Compatibility Agent', color: '#E0A8B8' },
  { id: 'training_agent', name: 'Training Agent', color: '#A8D4C5' },
  { id: 'evaluation_agent', name: 'Evaluation Agent', color: '#E89B85' },
  { id: 'modelx_guide', name: 'ModelX Guide', color: '#9D8DD0' },
];

const displayAgents = allAgents.filter((agent) => agent.id !== 'system');

const phaseAgentMap: Partial<Record<Phase, string[]>> = {
  idea: ['system'],
  dataset: ['dataset_agent'],
  kaggle: ['kaggle_agent'],
  model: ['model_agent'],
  huggingface: ['huggingface_agent'],
  compatibility: ['compatibility_agent'],
  training: ['training_agent'],
  evaluation: ['evaluation_agent'],
  blueprint: ['modelx_guide'],
};

const DebateViewer: React.FC<DebateViewerProps> = ({ sessionId, projectData, onReset, onBlueprintReady }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const useSSE = import.meta.env.VITE_USE_SSE === 'true';
  const {
    phase,
    messages,
    blueprint,
    isRunning,
    elapsedTime,
    connectionStatus,
    error,
    startSimulation,
    reconnect,
  } = useSimulation({ sessionId, useSSE });
  const [activeTab, setActiveTab] = useState<'activity' | 'blueprint'>('activity');

  useEffect(() => {
    startSimulation();
  }, [startSimulation]);

  useEffect(() => {
    if (blueprint) {
      setActiveTab('blueprint');
      onBlueprintReady?.(blueprint);
    }
  }, [blueprint, onBlueprintReady]);

  const getActiveAgents = (): string[] => phaseAgentMap[phase] || [];

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'idea':
        return 'Reading Idea';
      case 'dataset':
        return 'Dataset Planning';
      case 'kaggle':
        return 'Kaggle Search';
      case 'model':
        return 'Model Selection';
      case 'huggingface':
        return 'HuggingFace Search';
      case 'compatibility':
        return 'Compatibility Check';
      case 'training':
        return 'Training Plan';
      case 'evaluation':
        return 'Evaluation Plan';
      case 'blueprint':
        return 'Blueprint Synthesis';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Initializing';
    }
  };

  const title = projectData.project_title || 'Untitled ML Idea';

  return (
    <Box sx={{ animation: 'floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.25,
          mb: 2.5,
          background: isDark
            ? 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(246,245,241,0.92) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isDark ? '1px solid rgba(244, 240, 232, 0.08)' : '1px solid rgba(24, 22, 15, 0.08)',
          borderRadius: 2.5,
          boxShadow: isDark
            ? '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 12px 32px rgba(0, 0, 0, 0.32)'
            : '0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 32px rgba(0, 0, 0, 0.06)',
          overflow: 'visible',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '0 0 auto', flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AutoAwesomeIcon sx={{ color: '#C2B5E8', fontSize: '1.25rem', filter: 'drop-shadow(0 0 8px rgba(194, 181, 232, 0.4))' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' }, color: 'text.primary', letterSpacing: '-0.02em' }}>
                {title}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <Chip label={getPhaseLabel()} color="primary" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }} />
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: '0.9rem !important' }} />}
                label={formatElapsedTime(elapsedTime)}
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
              {connectionStatus === 'error' && reconnect && (
                <Chip
                  icon={<ErrorOutlineIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label="Error"
                  color="error"
                  size="small"
                  variant="outlined"
                  onClick={reconnect}
                  sx={{ cursor: 'pointer', fontSize: '0.7rem', height: 24 }}
                />
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', md: 'center' },
              gap: 1,
              minWidth: 0,
              overflowX: 'auto',
              overflowY: 'visible',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 0.5,
            }}
          >
            <Chip
              label="ModelX Agents"
              size="small"
              sx={{
                background: 'rgba(194, 181, 232, 0.12)',
                color: '#C2B5E8',
                fontWeight: 600,
                fontSize: '0.7rem',
                letterSpacing: '0.02em',
                height: 24,
                flexShrink: 0,
                border: '1px solid rgba(194, 181, 232, 0.22)',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                overflowX: 'auto',
                overflowY: 'visible',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                flex: 1,
                justifyContent: { xs: 'flex-start', md: 'center' },
                py: 1,
              }}
            >
              {displayAgents.map((agent) => {
                const hasMessages = messages.some((message) => message.agent === agent.id);
                const isActive = getActiveAgents().includes(agent.id);
                const isComplete = hasMessages && !isActive;
                const status = isActive ? 'active' : isComplete ? 'complete' : 'pending';
                const messageCount = messages.filter((message) => message.agent === agent.id).length;

                return (
                  <Tooltip
                    key={agent.id}
                    title={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {agent.name}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                          {status === 'active' && 'Currently planning'}
                          {status === 'complete' && `Complete (${messageCount} updates)`}
                          {status === 'pending' && 'Waiting'}
                        </Typography>
                      </Box>
                    }
                    arrow
                  >
                    <Box sx={{ position: 'relative', flexShrink: 0, overflow: 'visible', pb: 1 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: agent.color,
                          color: '#0A0B0F',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          opacity: status === 'pending' ? 0.4 : 1,
                          border: isActive ? `2px solid ${agent.color}` : `1px solid ${agent.color}55`,
                          transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: isActive ? `0 0 16px ${agent.color}90, 0 0 0 3px ${agent.color}30` : 'none',
                        }}
                      >
                        {agent.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}
                      </Avatar>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -4,
                          right: -4,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: isActive ? '#A8D4C5' : isComplete ? '#C2B5E8' : isDark ? '#3A3F4B' : '#D8D2C8',
                          border: isDark ? '2px solid #171A22' : '2px solid #FFFFFF',
                          zIndex: 10,
                          boxShadow: isActive ? '0 0 8px rgba(168, 212, 197, 0.6)' : 'none',
                        }}
                      />
                      {messageCount > 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            minWidth: 16,
                            height: 16,
                            borderRadius: '8px',
                            background: agent.color,
                            color: '#0A0B0F',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 0.5,
                            boxShadow: `0 2px 8px ${agent.color}55`,
                          }}
                        >
                          {messageCount}
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ flex: '0 0 auto' }}>
            <Button variant="outlined" onClick={onReset} disabled={isRunning} size="small" sx={{ fontWeight: 700, minWidth: 112 }}>
              New Plan
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert
          severity="error"
          action={
            reconnect && (
              <Button color="inherit" size="small" onClick={reconnect}>
                Reconnect
              </Button>
            )
          }
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <PhaseIndicator currentPhase={phase} />

      {isRunning && !blueprint && <LinearProgress sx={{ mb: 2, height: 4, borderRadius: 2 }} />}

      {blueprint && (
        <Box sx={{ mb: 2, borderBottom: isDark ? '1px solid rgba(244, 240, 232, 0.06)' : '1px solid rgba(24, 22, 15, 0.08)' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #C2B5E8 0%, #E5B5A0 100%)',
                height: 2,
                borderRadius: 2,
              },
            }}
          >
            <Tab
              value="activity"
              icon={<PsychologyIcon />}
              iconPosition="start"
              label="Agent Reasoning"
              sx={{ fontWeight: 500, textTransform: 'none', fontSize: '0.95rem', letterSpacing: '-0.005em' }}
            />
            <Tab
              value="blueprint"
              icon={<FactCheckIcon />}
              iconPosition="start"
              label="ML Blueprint"
              sx={{ fontWeight: 500, textTransform: 'none', fontSize: '0.95rem', letterSpacing: '-0.005em' }}
            />
          </Tabs>
        </Box>
      )}

      {activeTab === 'activity' && (
        <Box
          sx={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 245, 241, 0.98) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: isDark ? '1px solid rgba(244, 240, 232, 0.06)' : '1px solid rgba(24, 22, 15, 0.08)',
            borderRadius: 2.5,
            boxShadow: isDark
              ? '0 1px 0 rgba(244, 240, 232, 0.03) inset, 0 16px 48px rgba(0, 0, 0, 0.36)'
              : '0 1px 0 rgba(255, 255, 255, 0.92) inset, 0 16px 40px rgba(24, 22, 15, 0.10)',
            height: { xs: 'calc(100vh - 340px)', sm: 'calc(100vh - 300px)', md: 'calc(100vh - 280px)' },
            minHeight: 580,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <LiveActivityFeed messages={messages} agents={allAgents} activeAgents={blueprint ? [] : getActiveAgents()} />
        </Box>
      )}

      {activeTab === 'blueprint' && blueprint && (
        <MLBlueprintPanel blueprint={blueprint} projectData={projectData} />
      )}

      {!isRunning && !blueprint && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Initializing ModelX...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preparing the guided ML planning workflow
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DebateViewer;
