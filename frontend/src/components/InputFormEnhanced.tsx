import React, { useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { DataStatus, ProjectData, SkillLevel } from '../lib/types';
import { api } from '../lib/api';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DatasetIcon from '@mui/icons-material/Dataset';
import FlagIcon from '@mui/icons-material/Flag';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SchoolIcon from '@mui/icons-material/School';
import TuneIcon from '@mui/icons-material/Tune';

interface InputFormEnhancedProps {
  onPlanStart: (sessionId: string, projectData: ProjectData) => void;
}

const requiredFields = ['idea', 'goal', 'skill_level', 'data_status'] as const;

const skillLabels: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  some_python: 'Some Python',
  intermediate: 'Intermediate',
};

const dataStatusLabels: Record<DataStatus, string> = {
  no_dataset: 'No dataset yet',
  have_dataset: 'I have a dataset',
  need_public_dataset: 'Help me find public data',
};

const InputFormEnhanced: React.FC<InputFormEnhancedProps> = ({ onPlanStart }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [formData, setFormData] = useState<ProjectData>({
    project_title: '',
    idea: '',
    goal: '',
    skill_level: 'beginner',
    data_status: 'no_dataset',
    data_description: '',
    constraints: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedFields = useMemo(
    () =>
      requiredFields.filter((field) => {
        const value = formData[field];
        return typeof value === 'string' && value.trim().length > 0;
      }).length,
    [formData]
  );
  const progress = (completedFields / requiredFields.length) * 100;

  const handleTextChange = (
    field: keyof ProjectData,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.idea.trim() || !formData.goal.trim()) {
      setError('Please describe your idea and what you want the model to do.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: ProjectData = {
        ...formData,
        project_title: formData.project_title?.trim() || undefined,
        idea: formData.idea.trim(),
        goal: formData.goal.trim(),
        data_description: formData.data_description?.trim() || undefined,
        constraints: formData.constraints?.trim() || undefined,
      };

      if (import.meta.env.VITE_USE_SSE !== 'true') {
        onPlanStart(`mock_${Date.now()}`, payload);
        return;
      }

      const response = await api.startPlan(payload);
      onPlanStart(response.session_id, payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start the ModelX plan. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', animation: 'floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <Box sx={{ mb: 5, mt: { xs: 1, md: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: '#C2B5E8', fontSize: '1.6rem', filter: 'drop-shadow(0 0 12px rgba(194, 181, 232, 0.45))' }} />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 600,
              textAlign: 'center',
              background: isDark
                  ? 'linear-gradient(135deg, #F4F0E8 0%, #C2B5E8 55%, #E5B5A0 100%)'
                  : 'linear-gradient(135deg, #18160F 0%, #7B6BBD 55%, #C07050 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em',
              fontSize: { xs: '2.5rem', md: '3.25rem' },
            }}
          >
            ModelX
          </Typography>
        </Stack>
        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            textAlign: 'center',
            maxWidth: 720,
            mx: 'auto',
            fontWeight: 400,
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            letterSpacing: '-0.005em',
          }}
        >
          Make an LLM from scratch in one prompt
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: { xs: 2.5, md: 4 },
          background: isDark
            ? 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(246,245,241,0.92) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isDark
            ? '1px solid rgba(244, 240, 232, 0.08)'
            : '1px solid rgba(24, 22, 15, 0.08)',
          borderRadius: 3,
          boxShadow: isDark
            ? '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 24px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(194, 181, 232, 0.04)'
            : '0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 60px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(123, 107, 189, 0.04)',
          transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            borderColor: isDark ? 'rgba(194, 181, 232, 0.14)' : 'rgba(123, 107, 189, 0.16)',
            boxShadow: isDark
              ? '0 1px 0 rgba(244, 240, 232, 0.06) inset, 0 32px 72px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(194, 181, 232, 0.08)'
              : '0 1px 0 rgba(255,255,255,0.95) inset, 0 32px 72px rgba(0, 0, 0, 0.09), 0 0 0 1px rgba(123, 107, 189, 0.10)',
          },
        }}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <RocketLaunchIcon sx={{ fontSize: 20, color: '#C2B5E8' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Project Title
                </Typography>
              </Stack>
              <TextField
                fullWidth
                value={formData.project_title || ''}
                onChange={(event) => handleTextChange('project_title', event)}
                placeholder="e.g., Plant Disease Detector"
                size="small"
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SchoolIcon sx={{ fontSize: 20, color: '#A8D4C5' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Skill Level *
                </Typography>
              </Stack>
              <TextField
                select
                fullWidth
                size="small"
                label="Skill level"
                value={formData.skill_level}
                onChange={(event) => handleTextChange('skill_level', event as any)}
              >
                {Object.entries(skillLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DatasetIcon sx={{ fontSize: 20, color: '#D4B07A' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Data Status *
                </Typography>
              </Stack>
              <TextField
                select
                fullWidth
                size="small"
                label="Data status"
                value={formData.data_status}
                onChange={(event) => handleTextChange('data_status', event as any)}
              >
                {Object.entries(dataStatusLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PsychologyIcon sx={{ fontSize: 20, color: '#C2B5E8' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  ML Idea *
                </Typography>
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={5}
                value={formData.idea}
                onChange={(event) => handleTextChange('idea', event)}
                placeholder="Describe the thing you want to build. For example: classify plant leaf photos by disease, predict apartment rent from listing details, or sort support messages by urgency."
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FlagIcon sx={{ fontSize: 20, color: '#A8D4C5' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Goal *
                </Typography>
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={5}
                value={formData.goal}
                onChange={(event) => handleTextChange('goal', event)}
                placeholder="What should the model decide, predict, or recommend? Include what a good first version would accomplish."
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DatasetIcon sx={{ fontSize: 20, color: '#E5B5A0' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Data Description
                </Typography>
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={4}
                value={formData.data_description || ''}
                onChange={(event) => handleTextChange('data_description', event)}
                placeholder="Describe the data you have or expect to find: images, rows in a spreadsheet, text messages, ratings, sensor readings, labels, and rough size."
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TuneIcon sx={{ fontSize: 20, color: '#E0A8B8' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Constraints
                </Typography>
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={4}
                value={formData.constraints || ''}
                onChange={(event) => handleTextChange('constraints', event)}
                placeholder="Mention time limits, privacy requirements, tools you want to use, school project constraints, or anything the agents should keep in mind."
              />
            </Stack>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || progress < 100}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{
              minWidth: 220,
              py: 1.5,
              px: 3,
              fontWeight: 600,
              fontSize: '0.95rem',
              borderRadius: 2.5,
              color: isDark ? '#0A0B0F' : '#FFFFFF',
              background: isDark
                ? 'linear-gradient(135deg, #C2B5E8 0%, #9D8DD0 100%)'
                : 'linear-gradient(135deg, #7B6BBD 0%, #5E4FA0 100%)',
              boxShadow: isDark
                ? '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 8px 22px rgba(157, 141, 208, 0.40)'
                : '0 1px 0 rgba(255, 255, 255, 0.20) inset, 0 8px 22px rgba(123, 107, 189, 0.30)',
              transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': {
                background: isDark
                  ? 'linear-gradient(135deg, #D5CBEF 0%, #C2B5E8 100%)'
                  : 'linear-gradient(135deg, #9D8DD0 0%, #7B6BBD 100%)',
                boxShadow: isDark
                  ? '0 1px 0 rgba(255, 255, 255, 0.24) inset, 0 14px 32px rgba(157, 141, 208, 0.55)'
                  : '0 1px 0 rgba(255, 255, 255, 0.25) inset, 0 14px 32px rgba(123, 107, 189, 0.42)',
                transform: 'translateY(-2px)',
              },
              '&:active': { transform: 'translateY(0) scale(0.99)' },
              '&.Mui-disabled': {
                background: isDark ? '#1F232C' : '#E4E1DA',
                color: isDark ? '#76716A' : '#9A948C',
                boxShadow: 'none',
              },
              ...(progress === 100 && !loading
                ? { animation: 'softGlow 3s ease-in-out infinite' }
                : {}),
            }}
          >
            {loading ? 'Starting ModelX...' : 'Create ML Blueprint'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default InputFormEnhanced;
