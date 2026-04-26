import React from 'react';
import {
  Box,
  Chip,
  Divider,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DatasetLinkedIcon from '@mui/icons-material/DatasetLinked';
import HubIcon from '@mui/icons-material/Hub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import DownloadIcon from '@mui/icons-material/Download';
import type { KaggleDataset, HuggingFaceModel } from '../lib/types';

const KAGGLE_COLOR = '#20BEFF';
const HF_COLOR = '#FF9D00';

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

const RankBadge: React.FC<{ rank: number; color: string }> = ({ rank, color }) => (
  <Box
    sx={{
      minWidth: 22,
      height: 22,
      borderRadius: '50%',
      background: `${color}18`,
      border: `1.5px solid ${color}55`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      mt: '1px',
    }}
  >
    <Typography sx={{ fontWeight: 900, color, lineHeight: 1, fontSize: '0.68rem' }}>
      {rank}
    </Typography>
  </Box>
);

const StatChip: React.FC<{ icon: React.ReactNode; label: string; title: string }> = ({
  icon,
  label,
  title,
}) => (
  <Tooltip title={title}>
    <Chip
      icon={icon as React.ReactElement}
      label={label}
      size="small"
      sx={{
        height: 18,
        fontSize: '0.67rem',
        background: 'rgba(255,255,255,0.05)',
        color: 'text.disabled',
        border: '1px solid rgba(255,255,255,0.06)',
        '& .MuiChip-icon': { color: 'text.disabled', fontSize: '0.65rem !important' },
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  </Tooltip>
);

interface KaggleInlineListProps {
  datasets?: KaggleDataset[];
}

export const KaggleInlineList: React.FC<KaggleInlineListProps> = ({ datasets }) => {
  if (!datasets || datasets.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 2,
        borderRadius: 1.5,
        background: `${KAGGLE_COLOR}09`,
        border: `1px solid ${KAGGLE_COLOR}22`,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          px: 1.5,
          py: 0.9,
          borderBottom: `1px solid ${KAGGLE_COLOR}18`,
          background: `${KAGGLE_COLOR}0d`,
        }}
      >
        <DatasetLinkedIcon sx={{ fontSize: 13, color: KAGGLE_COLOR }} />
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: KAGGLE_COLOR,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Kaggle Datasets
        </Typography>
        <Typography sx={{ fontSize: '0.67rem', color: 'text.disabled', ml: 0.5 }}>
          · ranked by relevance
        </Typography>
      </Stack>

      <Box sx={{ px: 1.5, py: 0.5 }}>
        {datasets.map((ds, i) => (
          <React.Fragment key={`${ds.url}-${i}`}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ py: 1.1 }}>
              <RankBadge rank={ds.rank} color={KAGGLE_COLOR} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                  <Link
                    href={ds.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="none"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      '&:hover': { color: KAGGLE_COLOR },
                      transition: 'color 0.15s',
                    }}
                  >
                    {ds.title}
                  </Link>
                  <Link
                    href={ds.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', flexShrink: 0 }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 11, color: 'text.disabled', mt: '1px' }} />
                  </Link>
                </Stack>

                {ds.relevance_reason && (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      lineHeight: 1.35,
                      mb: 0.5,
                    }}
                  >
                    {ds.relevance_reason}
                  </Typography>
                )}

                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                  {ds.vote_count > 0 && (
                    <StatChip
                      icon={<ThumbUpIcon />}
                      label={formatCount(ds.vote_count)}
                      title="Community votes"
                    />
                  )}
                  {ds.download_count > 0 && (
                    <StatChip
                      icon={<DownloadIcon />}
                      label={formatCount(ds.download_count)}
                      title="Downloads"
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
            {i < datasets.length - 1 && (
              <Divider sx={{ borderColor: `${KAGGLE_COLOR}12` }} />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

interface HFInlineListProps {
  models?: HuggingFaceModel[];
}

export const HFInlineList: React.FC<HFInlineListProps> = ({ models }) => {
  if (!models || models.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 2,
        borderRadius: 1.5,
        background: `${HF_COLOR}09`,
        border: `1px solid ${HF_COLOR}22`,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          px: 1.5,
          py: 0.9,
          borderBottom: `1px solid ${HF_COLOR}18`,
          background: `${HF_COLOR}0d`,
        }}
      >
        <HubIcon sx={{ fontSize: 13, color: HF_COLOR }} />
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: HF_COLOR,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Open-Source Models to Fine-tune
        </Typography>
        <Typography sx={{ fontSize: '0.67rem', color: 'text.disabled', ml: 0.5 }}>
          · via HuggingFace
        </Typography>
      </Stack>

      <Box sx={{ px: 1.5, py: 0.5 }}>
        {models.map((m, i) => (
          <React.Fragment key={`${m.model_id}-${i}`}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ py: 1.1 }}>
              <RankBadge rank={m.rank} color={HF_COLOR} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                  <Link
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="none"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      '&:hover': { color: HF_COLOR },
                      transition: 'color 0.15s',
                    }}
                  >
                    {m.model_id}
                  </Link>
                  <Link
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', flexShrink: 0 }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 11, color: 'text.disabled', mt: '1px' }} />
                  </Link>
                </Stack>

                {m.task_type && (
                  <Chip
                    label={m.task_type}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.65rem',
                      mb: 0.4,
                      background: `${HF_COLOR}18`,
                      color: HF_COLOR,
                      border: `1px solid ${HF_COLOR}33`,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                )}

                {m.relevance_reason && (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      lineHeight: 1.35,
                      mb: 0.5,
                    }}
                  >
                    {m.relevance_reason}
                  </Typography>
                )}

                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                  {m.downloads > 0 && (
                    <StatChip
                      icon={<DownloadIcon />}
                      label={formatCount(m.downloads)}
                      title="Total downloads"
                    />
                  )}
                  {m.likes > 0 && (
                    <StatChip
                      icon={<ThumbUpIcon />}
                      label={formatCount(m.likes)}
                      title="Community likes"
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
            {i < models.length - 1 && (
              <Divider sx={{ borderColor: `${HF_COLOR}12` }} />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};
