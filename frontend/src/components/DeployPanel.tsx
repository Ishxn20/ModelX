import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  LinearProgress,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import NotebookIcon from '@mui/icons-material/MenuBook';
import CodeIcon from '@mui/icons-material/Code';
import FolderZipIcon from '@mui/icons-material/FolderZip';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface DeployPanelProps {
  taskType: string;
  modelId: string;
  datasetName: string;
  datasetUrl?: string;
  projectTitle?: string;
  problemFraming?: string;
  datasetPlan?: string;
  modelPlan?: string;
  trainingPlan?: string;
  evaluationPlan?: string;
  nextSteps?: string[];
  whyThisPair?: string;
  estimatedEffort?: string;
}

type OptionKey = 'model' | 'notebook' | 'repo';

interface ShipOption {
  key: OptionKey;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  endpoint: string;
  filename: (slug: string) => string;
  mimeType: string;
}

const OPTIONS: ShipOption[] = [
  {
    key: 'model',
    icon: <CodeIcon sx={{ fontSize: '1.5rem' }} />,
    title: 'Model Config',
    subtitle: 'Download .json',
    description:
      'A deploy-ready configuration manifest with task type, model, dataset, metrics, and starter serving settings.',
    endpoint: '/api/deploy/model',
    filename: (s) => `${s}_model_config.json`,
    mimeType: 'application/json',
  },
  {
    key: 'notebook',
    icon: <NotebookIcon sx={{ fontSize: '1.5rem' }} />,
    title: 'Training Notebook',
    subtitle: 'Download .ipynb',
    description:
      'A complete starter notebook covering setup, dataset loading, preprocessing, training, evaluation, and saving.',
    endpoint: '/api/deploy/notebook',
    filename: (s) => `${s}_training.ipynb`,
    mimeType: 'application/json',
  },
  {
    key: 'repo',
    icon: <FolderZipIcon sx={{ fontSize: '1.5rem' }} />,
    title: 'Deploy Repository',
    subtitle: 'Download .zip',
    description:
      'A structured repository ZIP with README, config, training, evaluation, inference, and a minimal serving API.',
    endpoint: '/api/deploy/repo',
    filename: (s) => `${s}.zip`,
    mimeType: 'application/zip',
  },
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'ml-project';

const LOADING_MESSAGES: Record<OptionKey, string[]> = {
  model: ['Preparing model manifest…', 'Adding deployment settings…', 'Serialising config…'],
  notebook: [
    'Writing your notebook…',
    'Building training cells…',
    'Adding evaluation & metrics…',
    'Finalising notebook JSON…',
  ],
  repo: [
    'Creating deploy repository…',
    'Writing dataset module…',
    'Writing training script…',
    'Writing evaluation script…',
    'Bundling files into ZIP…',
  ],
};

export default function DeployPanel({
  taskType,
  modelId,
  datasetName,
  datasetUrl = '',
  projectTitle = 'ml-project',
  problemFraming = '',
  datasetPlan = '',
  modelPlan = '',
  trainingPlan = '',
  evaluationPlan = '',
  nextSteps = [],
  whyThisPair = '',
  estimatedEffort = '',
}: DeployPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState<OptionKey | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const projectSlug = slugify(projectTitle);

  const requestBody = {
    task_type: taskType,
    model_id: modelId,
    dataset_name: datasetName,
    dataset_url: datasetUrl,
    project_title: projectTitle,
    problem_framing: problemFraming,
    dataset_plan: datasetPlan,
    model_plan: modelPlan,
    training_plan: trainingPlan,
    evaluation_plan: evaluationPlan,
    next_steps: nextSteps,
    why_this_pair: whyThisPair,
    estimated_effort: estimatedEffort,
  };

  const handleDownload = async (option: ShipOption) => {
    setLoading(option.key);
    setError(null);
    const messages = LOADING_MESSAGES[option.key];
    let msgIdx = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoadingMsg(messages[msgIdx]);
    }, 2800);

    try {
      const resp = await fetch(`${API_URL}${option.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error ${resp.status}: ${text.slice(0, 200)}`);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = option.filename(projectSlug);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed. Please try again.');
    } finally {
      clearInterval(interval);
      setLoading(null);
      setLoadingMsg('');
    }
  };

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 2, borderRadius: 2, fontSize: '0.8rem' }}
        >
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        {OPTIONS.map((option) => {
          const isLoading = loading === option.key;
          const isDisabled = loading !== null && !isLoading;

          return (
            <Box
              key={option.key}
              sx={{
                border: '1px solid',
                borderColor: isLoading
                  ? 'rgba(157, 141, 208, 0.42)'
                  : isDark ? 'rgba(244, 240, 232, 0.08)' : 'rgba(24, 22, 15, 0.08)',
                borderRadius: 2.5,
                p: 2.5,
                background: isLoading
                  ? isDark
                    ? 'linear-gradient(135deg, rgba(31, 35, 44, 0.95) 0%, rgba(39, 44, 55, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 239, 232, 0.98) 100%)'
                  : isDark
                    ? 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)'
                    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 247, 244, 0.98) 100%)',
                backdropFilter: 'blur(24px)',
                boxShadow: isLoading
                  ? isDark
                    ? '0 1px 0 rgba(244, 240, 232, 0.06) inset, 0 16px 40px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(194, 181, 232, 0.12)'
                    : '0 1px 0 rgba(255, 255, 255, 0.92) inset, 0 14px 30px rgba(24, 22, 15, 0.10), 0 0 0 1px rgba(157, 141, 208, 0.10)'
                  : isDark
                    ? '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 12px 32px rgba(0, 0, 0, 0.32)'
                    : '0 1px 0 rgba(255, 255, 255, 0.92) inset, 0 12px 28px rgba(24, 22, 15, 0.08)',
                transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: isDisabled ? 0.4 : 1,
                position: 'relative',
                overflow: 'hidden',
                '&:hover': isDisabled || isLoading ? undefined : {
                  background: isDark
                    ? 'linear-gradient(180deg, rgba(31, 35, 44, 0.90) 0%, rgba(23, 26, 34, 0.92) 100%)'
                    : 'linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(242, 239, 232, 0.98) 100%)',
                  borderColor: 'rgba(157, 141, 208, 0.24)',
                  boxShadow: isDark
                    ? '0 1px 0 rgba(244, 240, 232, 0.06) inset, 0 16px 40px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(194, 181, 232, 0.08)'
                    : '0 1px 0 rgba(255, 255, 255, 0.94) inset, 0 16px 34px rgba(24, 22, 15, 0.10), 0 0 0 1px rgba(157, 141, 208, 0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {isLoading && (
                <LinearProgress
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    borderRadius: 0,
                    bgcolor: isDark ? 'rgba(244, 240, 232, 0.06)' : 'rgba(24, 22, 15, 0.06)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #C2B5E8 0%, #E5B5A0 100%)',
                      boxShadow: '0 0 12px rgba(194, 181, 232, 0.45)',
                    },
                  }}
                />
              )}

              <Stack direction="row" alignItems="flex-start" spacing={2}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(194, 181, 232, 0.18) 0%, rgba(157, 141, 208, 0.10) 100%)'
                      : 'linear-gradient(135deg, rgba(157, 141, 208, 0.18) 0%, rgba(194, 181, 232, 0.22) 100%)',
                    border: isDark ? '1px solid rgba(194, 181, 232, 0.22)' : '1px solid rgba(157, 141, 208, 0.24)',
                    color: isDark ? '#C2B5E8' : '#6F5CB6',
                    flexShrink: 0,
                    transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {option.icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.3 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem', letterSpacing: '-0.01em' }}
                    >
                      {option.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                      {option.subtitle}
                    </Typography>
                  </Stack>

                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.82rem', mb: 1.75 }}
                  >
                    {option.description}
                  </Typography>

                  {isLoading && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#C2B5E8',
                        fontWeight: 500,
                        display: 'block',
                        mb: 1.25,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {loadingMsg}
                    </Typography>
                  )}

                  <Button
                    variant={isLoading ? 'outlined' : 'contained'}
                    size="small"
                    startIcon={isLoading ? undefined : <DownloadIcon sx={{ fontSize: '0.9rem' }} />}
                    disabled={isDisabled || isLoading}
                    onClick={() => handleDownload(option)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.82rem',
                      px: 2.5,
                      py: 0.85,
                      ...(isLoading
                        ? {
                            borderColor: 'rgba(194, 181, 232, 0.40)',
                            color: isDark ? '#C2B5E8' : '#6F5CB6',
                            background: isDark ? 'rgba(194, 181, 232, 0.06)' : 'rgba(157, 141, 208, 0.08)',
                          }
                        : {
                            background: 'linear-gradient(135deg, #C2B5E8 0%, #9D8DD0 100%)',
                            color: '#0A0B0F',
                            boxShadow: '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 4px 14px rgba(157, 141, 208, 0.32)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #D5CBEF 0%, #C2B5E8 100%)',
                              boxShadow: '0 1px 0 rgba(255, 255, 255, 0.22) inset, 0 8px 22px rgba(157, 141, 208, 0.45)',
                              transform: 'translateY(-1px)',
                            },
                          }),
                    }}
                  >
                    {isLoading ? 'Generating…' : option.subtitle}
                  </Button>
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2.5, color: 'text.disabled', textAlign: 'center', lineHeight: 1.6 }}
      >
        Deployment artifacts are grounded in your blueprint. Review before production use.
      </Typography>
    </Box>
  );
}
