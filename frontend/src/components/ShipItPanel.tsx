import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  LinearProgress,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import NotebookIcon from '@mui/icons-material/MenuBook';
import CodeIcon from '@mui/icons-material/Code';
import FolderZipIcon from '@mui/icons-material/FolderZip';

interface ShipItPanelProps {
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
    title: 'Model Weights',
    subtitle: 'Download .pt',
    description:
      'A PyTorch .pt file containing the model architecture and randomised weights — load it directly with torch.load() and swap in your real fine-tuned weights.',
    endpoint: '/api/ship/model',
    filename: (s) => `${s}_model.pt`,
    mimeType: 'application/octet-stream',
  },
  {
    key: 'notebook',
    icon: <NotebookIcon sx={{ fontSize: '1.5rem' }} />,
    title: 'Jupyter Notebook',
    subtitle: 'Download .ipynb',
    description:
      'A complete end-to-end training notebook covering dataset loading, preprocessing, fine-tuning with the HuggingFace Trainer API, evaluation, and model saving — 100% runnable.',
    endpoint: '/api/ship/notebook',
    filename: (s) => `${s}_training.ipynb`,
    mimeType: 'application/json',
  },
  {
    key: 'repo',
    icon: <FolderZipIcon sx={{ fontSize: '1.5rem' }} />,
    title: 'GitHub Repository',
    subtitle: 'Download .zip',
    description:
      'A fully-structured repository ZIP with README, requirements.txt, config.yaml, and separate src/ modules for dataset loading, model setup, training, and evaluation.',
    endpoint: '/api/ship/repo',
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
  model: ['Initialising model architecture…', 'Generating random weights…', 'Serialising .pt file…'],
  notebook: [
    'Writing your notebook…',
    'Building training cells…',
    'Adding evaluation & metrics…',
    'Finalising notebook JSON…',
  ],
  repo: [
    'Architecting your repository…',
    'Writing dataset module…',
    'Writing training script…',
    'Writing evaluation script…',
    'Bundling files into ZIP…',
  ],
};

export default function ShipItPanel({
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
}: ShipItPanelProps) {
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
      const resp = await fetch(`http://localhost:8000${option.endpoint}`, {
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
                borderColor: isLoading ? 'rgba(194, 181, 232, 0.40)' : 'rgba(244, 240, 232, 0.08)',
                borderRadius: 2.5,
                p: 2.5,
                background: isLoading
                  ? 'linear-gradient(135deg, rgba(31, 35, 44, 0.95) 0%, rgba(39, 44, 55, 0.95) 100%)'
                  : 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)',
                backdropFilter: 'blur(24px)',
                boxShadow: isLoading
                  ? '0 1px 0 rgba(244, 240, 232, 0.06) inset, 0 16px 40px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(194, 181, 232, 0.12)'
                  : '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 12px 32px rgba(0, 0, 0, 0.32)',
                transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: isDisabled ? 0.4 : 1,
                position: 'relative',
                overflow: 'hidden',
                '&:hover': isDisabled || isLoading ? undefined : {
                  background: 'linear-gradient(180deg, rgba(31, 35, 44, 0.90) 0%, rgba(23, 26, 34, 0.92) 100%)',
                  borderColor: 'rgba(194, 181, 232, 0.20)',
                  boxShadow: '0 1px 0 rgba(244, 240, 232, 0.06) inset, 0 16px 40px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(194, 181, 232, 0.08)',
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
                    bgcolor: 'rgba(244, 240, 232, 0.06)',
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
                    background: 'linear-gradient(135deg, rgba(194, 181, 232, 0.18) 0%, rgba(157, 141, 208, 0.10) 100%)',
                    border: '1px solid rgba(194, 181, 232, 0.22)',
                    color: '#C2B5E8',
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
                            color: '#C2B5E8',
                            background: 'rgba(194, 181, 232, 0.06)',
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
                    {isLoading ? 'Generating…' : `Download ${option.subtitle}`}
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
        Generated code is grounded in your blueprint. Review before production use.
      </Typography>
    </Box>
  );
}
