import React from 'react';
import {
  Box,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import DatasetLinkedIcon from '@mui/icons-material/DatasetLinked';
import HubIcon from '@mui/icons-material/Hub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { CompatibilityResult, PreprocessingDimension } from '../lib/types';

const KAGGLE_COLOR = '#20BEFF';
const HF_COLOR = '#FF9D00';

const SCORE_CONFIG: Record<string, { color: string; label: string }> = {
  High: { color: '#10b981', label: 'High Compatibility' },
  Medium: { color: '#f59e0b', label: 'Medium Compatibility' },
  Low: { color: '#ef4444', label: 'Low Compatibility' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  Ready: {
    color: '#10b981',
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />,
  },
  'Minor Prep': {
    color: '#f59e0b',
    icon: <WarningAmberIcon sx={{ fontSize: 15 }} />,
  },
  'Major Prep': {
    color: '#ef4444',
    icon: <ErrorOutlineIcon sx={{ fontSize: 15 }} />,
  },
};

const DimensionRow: React.FC<{ dim: PreprocessingDimension; isLast: boolean }> = ({
  dim,
  isLast,
}) => {
  const statusCfg = STATUS_CONFIG[dim.status] || STATUS_CONFIG['Minor Prep'];

  return (
    <>
      <Box sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.6 }}>
          <Box sx={{ color: statusCfg.color, display: 'flex', alignItems: 'center' }}>
            {statusCfg.icon}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.primary' }}>
            {dim.dimension}
          </Typography>
          <Chip
            label={dim.status}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.63rem',
              fontWeight: 700,
              background: `${statusCfg.color}18`,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.color}40`,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Stack>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
            fontStyle: 'italic',
            mb: 0.75,
            lineHeight: 1.4,
          }}
        >
          {dim.description}
        </Typography>
        <Stack component="ul" spacing={0.35} sx={{ pl: 2, m: 0 }}>
          {dim.steps.map((step, i) => (
            <Typography
              key={i}
              component="li"
              sx={{ fontSize: '0.73rem', color: 'text.secondary', lineHeight: 1.45 }}
            >
              {step}
            </Typography>
          ))}
        </Stack>
      </Box>
      {!isLast && <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />}
    </>
  );
};

interface CompatibilityPanelProps {
  result: CompatibilityResult;
}

const CompatibilityPanel: React.FC<CompatibilityPanelProps> = ({ result }) => {
  const scoreCfg = SCORE_CONFIG[result.compatibility_score] || SCORE_CONFIG['Medium'];

  return (
    <Box
      sx={{
        mt: 2,
        borderRadius: 2,
        border: `1px solid ${scoreCfg.color}30`,
        background: `${scoreCfg.color}06`,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${scoreCfg.color}20`,
          background: `${scoreCfg.color}0d`,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: scoreCfg.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            mr: 0.5,
          }}
        >
          Best Pair
        </Typography>
        <Chip
          label={scoreCfg.label}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.67rem',
            fontWeight: 800,
            background: scoreCfg.color,
            color: '#fff',
            '& .MuiChip-label': { px: 1 },
          }}
        />
        <Typography sx={{ fontSize: '0.67rem', color: 'text.disabled', ml: 0.5 }}>
          · {result.estimated_effort}
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0}
        divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />}
        sx={{ px: 2, py: 1.5 }}
      >
        <Box sx={{ flex: 1, pr: { sm: 2 } }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
            <DatasetLinkedIcon sx={{ fontSize: 13, color: KAGGLE_COLOR }} />
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: KAGGLE_COLOR,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Dataset
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Link
              href={result.chosen_dataset_url}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                fontSize: '0.82rem',
                '&:hover': { color: KAGGLE_COLOR },
                transition: 'color 0.15s',
              }}
            >
              {result.chosen_dataset}
            </Link>
            <Link href={result.chosen_dataset_url} target="_blank" rel="noopener noreferrer">
              <OpenInNewIcon sx={{ fontSize: 11, color: 'text.disabled', mt: '1px' }} />
            </Link>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, pl: { sm: 2 }, pt: { xs: 1.5, sm: 0 } }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
            <HubIcon sx={{ fontSize: 13, color: HF_COLOR }} />
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: HF_COLOR,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Model
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Link
              href={result.chosen_model_url}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                '&:hover': { color: HF_COLOR },
                transition: 'color 0.15s',
              }}
            >
              {result.chosen_model}
            </Link>
            <Link href={result.chosen_model_url} target="_blank" rel="noopener noreferrer">
              <OpenInNewIcon sx={{ fontSize: 11, color: 'text.disabled', mt: '1px' }} />
            </Link>
          </Stack>
        </Box>
      </Stack>

      <Box
        sx={{
          mx: 2,
          mb: 1.5,
          px: 1.5,
          py: 1,
          borderRadius: 1,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Typography
          sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5, fontStyle: 'italic' }}
        >
          {result.why_this_pair}
        </Typography>
      </Box>

      <Box
        sx={{
          mx: 2,
          mb: 2,
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'text.disabled',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            py: 1,
          }}
        >
          Preprocessing Roadmap
        </Typography>
        {result.preprocessing_dimensions.map((dim, i) => (
          <DimensionRow
            key={dim.dimension}
            dim={dim}
            isLast={i === result.preprocessing_dimensions.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};

export default CompatibilityPanel;
