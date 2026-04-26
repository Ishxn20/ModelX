import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const clrLilac = '#C2B5E8';
const clrLilacDeep = '#9D8DD0';
const clrMint = '#A8D4C5';
const clrNight = '#0A0B0F';

type TaskType =
  | 'binary_classification'
  | 'multi_class'
  | 'regression'
  | 'text_classification'
  | 'image_classification'
  | 'time_series';

interface ArchitectureLayer {
  label: string;
  icon: string;
  name: string;
  details: string[];
}

interface ModelResult {
  model_name: string;
  layers: ArchitectureLayer[];
  metrics: Record<string, number>;
}

interface TrainingLog {
  type: 'setup' | 'section' | 'epoch' | 'error';
  message: string;
  timestamp: string;
}

interface CompletedResult {
  task_type: TaskType;
  training_summary: string;
  comparison: {
    custom_model: ModelResult;
    oss_model: ModelResult;
  };
  winner: 'custom_model' | 'oss_model';
}

interface TrainingSimulationRunnerProps {
  sessionId?: string;
  problemFraming?: string;
  taskType?: string;
  topModelId?: string;
  datasetName?: string;
  trainingPlanSummary?: string;
}

type LayerFamily =
  | 'conv'
  | 'pool'
  | 'attention'
  | 'ffn'
  | 'recurrent'
  | 'embedding'
  | 'dense'
  | 'output'
  | 'boost'
  | 'generic';

interface LayerPalette {
  bg: string;
  border: string;
  accent: string;
  label: string;
}

const FAMILY_PALETTE: Record<LayerFamily, LayerPalette> = {
  conv:      { bg: 'rgba(229,181,160,0.10)', border: 'rgba(229,181,160,0.30)', accent: '#E5B5A0', label: '#E5B5A0' },
  pool:      { bg: 'rgba(224,168,184,0.10)', border: 'rgba(224,168,184,0.30)', accent: '#E0A8B8', label: '#E0A8B8' },
  attention: { bg: 'rgba(194,181,232,0.10)', border: 'rgba(194,181,232,0.30)', accent: clrLilac, label: clrLilac },
  ffn:       { bg: 'rgba(157,141,208,0.10)', border: 'rgba(157,141,208,0.30)', accent: clrLilacDeep, label: clrLilac },
  recurrent: { bg: 'rgba(212,176,122,0.10)', border: 'rgba(212,176,122,0.30)', accent: '#D4B07A', label: '#D4B07A' },
  embedding: { bg: 'rgba(168,212,197,0.10)', border: 'rgba(168,212,197,0.30)', accent: clrMint, label: clrMint },
  dense:     { bg: 'rgba(194,181,232,0.08)', border: 'rgba(194,181,232,0.26)', accent: clrLilac, label: clrLilac },
  output:    { bg: 'rgba(168,212,197,0.14)', border: 'rgba(168,212,197,0.40)', accent: clrMint, label: clrMint },
  boost:     { bg: 'rgba(212,176,122,0.14)', border: 'rgba(212,176,122,0.42)', accent: '#D4B07A', label: '#D4B07A' },
  generic:   { bg: 'rgba(162,180,196,0.10)', border: 'rgba(162,180,196,0.26)', accent: '#A2B4C4', label: '#A2B4C4' },
};

function classifyLayer(layer: ArchitectureLayer): LayerFamily {
  const t = [layer.name, layer.label, ...layer.details].join(' ').toLowerCase();

  if (t.includes('lstm') || t.includes('gru') || (t.includes('rnn') && !t.includes('norm'))) return 'recurrent';

  if (t.includes('attention') || t.includes('attn') || t.includes('q k v') || t.includes('q·k') || t.includes('multi-head')) return 'attention';

  if (t.includes('feed-forward') || t.includes('feedforward') || t.includes(' ffn')) return 'ffn';

  if (
    t.includes('embed') &&
    (t.includes('token') || t.includes('word') || t.includes('patch') ||
     t.includes('vocab') || t.includes('bpe') || t.includes('byte-pair') || t.includes('positional'))
  ) return 'embedding';

  if (
    t.includes('maxpool') || t.includes('max pool') ||
    t.includes('avgpool') || t.includes('avg pool') ||
    t.includes('global avg') || t.includes('global max')
  ) return 'pool';

  if (t.includes('conv')) return 'conv';

  if (
    t.includes('tree') || t.includes('forest') || t.includes('boost') ||
    t.includes('arima') || t.includes('sarima') || t.includes('autoregress') ||
    t.includes('holt') || t.includes('exponential smooth') || t.includes('moving average') ||
    t.includes('integration') || t.includes('seasonal') || t.includes('stationarity') ||
    t.includes(' svm') || t.includes(' knn') || t.includes('neighbour') || t.includes('k=')
  ) return 'boost';

  if (
    (t.includes('head') || t.includes('classifier') || t.includes('forecast') || t.includes('output')) &&
    (t.includes('linear') || t.includes('softmax') || t.includes('sigmoid') ||
     t.includes('→ n') || t.includes('ahead') || t.includes('prediction') || t.includes('class'))
  ) return 'output';

  if (
    t.includes('dense') || t.includes('linear') || t.includes('mlp') ||
    t.includes('projection') || t.includes('pooler') || t.includes('pool')
  ) return 'dense';

  return 'generic';
}

type TransformType =
  | 'relu' | 'gelu' | 'silu' | 'sigmoid' | 'tanh' | 'softmax'
  | 'batchnorm' | 'layernorm' | 'dropout';

interface TransformInfo {
  type: TransformType;
  label: string;
  value?: string;
}

const TRANSFORM_CFG: Record<TransformType, { color: string; bg: string; symbol: string; dashed?: boolean }> = {
  relu:      { color: '#D4B07A', bg: 'rgba(212,176,122,0.16)', symbol: '╱' },
  gelu:      { color: '#D4B07A', bg: 'rgba(212,176,122,0.16)', symbol: '∿' },
  silu:      { color: '#D4B07A', bg: 'rgba(212,176,122,0.16)', symbol: '∿' },
  sigmoid:   { color: '#D4B07A', bg: 'rgba(212,176,122,0.16)', symbol: 'σ' },
  tanh:      { color: '#D4B07A', bg: 'rgba(212,176,122,0.16)', symbol: '~' },
  softmax:   { color: clrMint, bg: 'rgba(168,212,197,0.16)', symbol: '∑' },
  batchnorm: { color: clrLilac, bg: 'rgba(194,181,232,0.14)', symbol: 'μσ' },
  layernorm: { color: clrLilac, bg: 'rgba(194,181,232,0.14)', symbol: 'LN' },
  dropout:   { color: '#E89B85', bg: 'rgba(232,155,133,0.12)', symbol: '✕', dashed: true },
};

function extractTransforms(layer: ArchitectureLayer): TransformInfo[] {
  const t = [layer.name, ...layer.details].join(' ').toLowerCase();
  const out: TransformInfo[] = [];

  if (t.includes('batchnorm') || t.includes('batch norm') || t.includes('bn +') || t.includes('bn+') || / bn /.test(t) || t.includes('+ bn'))
    out.push({ type: 'batchnorm', label: 'BN' });

  if (t.includes('layernorm') || t.includes('layer norm') || t.includes('ln +') || / ln /.test(t))
    out.push({ type: 'layernorm', label: 'LN' });

  if (t.includes('relu6')) out.push({ type: 'relu', label: 'ReLU6' });
  else if (t.includes('relu')) out.push({ type: 'relu', label: 'ReLU' });
  else if (t.includes('gelu')) out.push({ type: 'gelu', label: 'GELU' });
  else if (t.includes('silu') || t.includes('swish')) out.push({ type: 'silu', label: 'SiLU' });
  else if (t.includes('tanh')) out.push({ type: 'tanh', label: 'Tanh' });
  else if (t.includes('sigmoid')) out.push({ type: 'sigmoid', label: 'σ' });

  const dropMatch = t.match(/dropout\s+([\d.]+)/);
  if (dropMatch) out.push({ type: 'dropout', label: 'Drop', value: dropMatch[1] });
  else if (t.includes('dropout')) out.push({ type: 'dropout', label: 'Drop' });

  return out;
}

function detectSkip(layer: ArchitectureLayer): boolean {
  const t = [layer.name, ...layer.details].join(' ').toLowerCase();
  return (
    t.includes('shortcut') ||
    t.includes('residual block') ||
    t.includes('residual connect') ||
    t.includes('skip connect')
  );
}

function ConvVisual({ pal, layer }: { pal: LayerPalette; layer: ArchitectureLayer }) {
  const allText = layer.details.join(' ');
  const chMatch = allText.match(/(\d+)\s*(?:ch|filters?|channel)/i);
  const channels = chMatch ? Math.min(parseInt(chMatch[1]), 256) : 64;
  const sliceCount = channels >= 128 ? 5 : channels >= 64 ? 4 : 3;
  const kernelMatch = allText.match(/(\d+×\d+)/);
  const kernel = kernelMatch ? kernelMatch[1] : null;

  return (
    <Box sx={{ width: '100%', pt: 0.5 }}>
      {Array.from({ length: sliceCount }).map((_, i) => {
        const alpha = Math.round((0.78 - i * 0.12) * 255)
          .toString(16)
          .padStart(2, '0');
        return (
          <Box
            key={i}
            sx={{
              height: i === 0 ? 9 : 7,
              mb: i < sliceCount - 1 ? '3px' : 0,
              borderRadius: '3px',
              background: `linear-gradient(90deg, ${pal.accent}${alpha} 0%, ${pal.accent}1a 100%)`,
              border: `1px solid ${pal.accent}${i === 0 ? '55' : '22'}`,
              boxShadow: i === 0 ? `0 1px 5px ${pal.accent}30` : 'none',
            }}
          />
        );
      })}
      {kernel && (
        <Typography sx={{ fontSize: '0.5rem', color: pal.label, mt: '5px', fontFamily: 'monospace', opacity: 0.8 }}>
          {kernel} · {channels}ch
        </Typography>
      )}
    </Box>
  );
}

function PoolVisual({ pal }: { pal: LayerPalette }) {
  const cells = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1];
  return (
    <Box sx={{ width: '100%', pt: 0.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px' }}>
        {cells.map((lit, i) => (
          <Box
            key={i}
            sx={{
              height: 12,
              borderRadius: '2px',
              background: lit ? `${pal.accent}cc` : `${pal.accent}1e`,
              border: `1px solid ${pal.accent}${lit ? '60' : '18'}`,
              boxShadow: lit ? `0 0 5px ${pal.accent}44` : 'none',
            }}
          />
        ))}
      </Box>
      <Typography sx={{ fontSize: '0.5rem', color: pal.label, mt: '5px', fontFamily: 'monospace', opacity: 0.8 }}>
        max activation
      </Typography>
    </Box>
  );
}

function AttentionVisual({ pal }: { pal: LayerPalette }) {
  const arrows: Array<{
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    transform?: string;
    char: string;
  }> = [
    { top: 1,      left: '50%', transform: 'translateX(-50%)', char: '↓' },
    { bottom: 1,   left: '50%', transform: 'translateX(-50%)', char: '↑' },
    { left: 1,     top: '50%',  transform: 'translateY(-50%)', char: '→' },
    { right: 1,    top: '50%',  transform: 'translateY(-50%)', char: '←' },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        height: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 58,
          height: 58,
          borderRadius: '50%',
          border: `1.5px dashed ${pal.accent}38`,
          animation: 'spinAttn 14s linear infinite',
          '@keyframes spinAttn': { '100%': { transform: 'rotate(360deg)' } },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: `1.5px solid ${pal.accent}55`,
          background: `radial-gradient(circle, ${pal.accent}18 0%, transparent 70%)`,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${pal.accent}30 0%, ${pal.accent}0a 100%)`,
          border: `1.5px solid ${pal.accent}70`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{ fontSize: '0.4rem', fontWeight: 900, color: pal.label, textAlign: 'center', lineHeight: 1.3 }}
        >
          Q·K<br />·V
        </Typography>
      </Box>
      {arrows.map(({ char, ...pos }, i) => (
        <Typography
          key={i}
          sx={{
            position: 'absolute',
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            right: pos.right,
            transform: pos.transform,
            fontSize: '0.55rem',
            color: `${pal.accent}88`,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {char}
        </Typography>
      ))}
    </Box>
  );
}

function RecurrentVisual({ pal, layer }: { pal: LayerPalette; layer: ArchitectureLayer }) {
  const isLSTM = [layer.name, ...layer.details].join(' ').toLowerCase().includes('lstm');
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        gap: 0.75,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        py: 1,
      }}
    >
      <Typography
        sx={{
          position: 'absolute',
          top: 0,
          right: 4,
          fontSize: '0.85rem',
          color: pal.accent,
          animation: 'pulseSlow 2.2s ease-in-out infinite',
          '@keyframes pulseSlow': { '0%,100%': { opacity: 0.35 }, '50%': { opacity: 1 } },
          lineHeight: 1,
        }}
      >
        ↺
      </Typography>
      <Box
        sx={{
          width: 32,
          height: 32,
          border: `1.5px solid ${pal.accent}65`,
          borderRadius: '7px',
          background: `${pal.accent}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `inset 0 1px 0 ${pal.accent}30, 0 0 8px ${pal.accent}22`,
        }}
      >
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: pal.label, fontFamily: 'monospace' }}>
          h
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.75rem', color: `${pal.accent}80`, lineHeight: 1 }}>⇄</Typography>
      {isLSTM && (
        <Box
          sx={{
            width: 32,
            height: 32,
            border: `1.5px solid ${pal.accent}40`,
            borderRadius: '7px',
            background: `${pal.accent}0a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: pal.label, fontFamily: 'monospace' }}>
            c
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function EmbeddingVisual({ pal, layer }: { pal: LayerPalette; layer: ArchitectureLayer }) {
  const dimMatch = layer.details.join(' ').match(/dim[:\s]+(\d[\d,]*)/i);
  const dim = dimMatch ? parseInt(dimMatch[1].replace(/,/g, '')) : 768;
  const segCount = Math.min(9, Math.max(4, Math.round(dim / 128)));

  return (
    <Box sx={{ width: '100%', pt: 0.5 }}>
      {[0, 1, 2, 3].map((row) => (
        <Box key={row} sx={{ display: 'flex', gap: '2px', mb: '4px', opacity: 1 - row * 0.2 }}>
          {Array.from({ length: segCount }).map((_, j) => {
            const alpha = Math.round((0.85 - j * (0.55 / segCount)) * 255)
              .toString(16)
              .padStart(2, '0');
            return (
              <Box
                key={j}
                sx={{
                  flex: 1,
                  height: 5,
                  borderRadius: '1px',
                  background: `linear-gradient(90deg, ${pal.accent}${alpha} 0%, ${pal.accent}18 100%)`,
                }}
              />
            );
          })}
        </Box>
      ))}
      <Typography sx={{ fontSize: '0.5rem', color: pal.label, mt: '2px', fontFamily: 'monospace', opacity: 0.75 }}>
        {dim >= 1000 ? `${(dim / 1000).toFixed(dim % 1000 === 0 ? 0 : 1)}k` : dim}-dim
      </Typography>
    </Box>
  );
}

function DenseVisual({ pal, layer }: { pal: LayerPalette; layer: ArchitectureLayer }) {
  const dimMatch = layer.details.join(' ').match(/→\s*(\d[\d,]+)|(\d[\d,]+)\s*(?:neurons?|units?|dim\b)/i);
  const dim = dimMatch ? parseInt((dimMatch[1] ?? dimMatch[2] ?? '256').replace(/,/g, '')) : 256;
  const barCount = Math.min(14, Math.max(4, Math.round(dim / 64)));

  return (
    <Box sx={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: 52, width: '100%', pt: 0.5 }}>
      {Array.from({ length: barCount }).map((_, i) => {
        const h = 38 + Math.round(Math.sin((i / Math.max(barCount - 1, 1)) * Math.PI) * 36);
        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: `${h}%`,
              borderRadius: '2px 2px 0 0',
              background: `linear-gradient(180deg, ${pal.accent}cc 0%, ${pal.accent}44 100%)`,
              minWidth: 0,
              boxShadow: `0 -1px 4px ${pal.accent}28`,
            }}
          />
        );
      })}
    </Box>
  );
}

function OutputVisual({ pal }: { pal: LayerPalette }) {
  const probs = [0.62, 0.22, 0.10, 0.06];
  return (
    <Box sx={{ width: '100%', pt: 0.5 }}>
      {probs.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: '5px' }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              flexShrink: 0,
              background: i === 0 ? pal.accent : `${pal.accent}50`,
              boxShadow: i === 0 ? `0 0 5px ${pal.accent}` : 'none',
            }}
          />
          <Box
            sx={{
              height: 5,
              width: `${p * 100}%`,
              borderRadius: '0 2px 2px 0',
              background:
                i === 0
                  ? `linear-gradient(90deg, ${pal.accent} 0%, ${pal.accent}99 100%)`
                  : `${pal.accent}38`,
            }}
          />
          <Typography sx={{ fontSize: '0.46rem', color: pal.label, opacity: 0.7, fontFamily: 'monospace' }}>
            {Math.round(p * 100)}%
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function BoostVisual({ pal }: { pal: LayerPalette }) {
  return (
    <Box sx={{ width: '100%', height: 52, position: 'relative', pt: 0.5 }}>
      <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 22, height: 14, border: `1.5px solid ${pal.accent}65`, borderRadius: '4px', background: `${pal.accent}18` }} />
      <Box sx={{ position: 'absolute', top: 14, left: 'calc(50% - 1px)', width: 2, height: 9, background: `${pal.accent}50` }} />
      <Box sx={{ position: 'absolute', top: 23, left: '22%', right: '22%', height: 2, background: `${pal.accent}50` }} />
      <Box sx={{ position: 'absolute', top: 23, left: '22%', width: 2, height: 9, background: `${pal.accent}45` }} />
      <Box sx={{ position: 'absolute', top: 23, right: '22%', width: 2, height: 9, background: `${pal.accent}45` }} />
      <Box sx={{ position: 'absolute', top: 32, left: '13%', width: 20, height: 13, border: `1.5px solid ${pal.accent}45`, borderRadius: '4px', background: `${pal.accent}10` }} />
      <Box sx={{ position: 'absolute', top: 32, right: '13%', width: 20, height: 13, border: `1.5px solid ${pal.accent}45`, borderRadius: '4px', background: `${pal.accent}10` }} />
    </Box>
  );
}

function GenericVisual({ pal }: { pal: LayerPalette }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: 44,
        borderRadius: '6px',
        background: `linear-gradient(135deg, ${pal.accent}18 0%, ${pal.accent}06 100%)`,
        border: `1px solid ${pal.accent}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
      }}
    >
      {[0.7, 0.4, 0.65, 0.3, 0.55].map((h, i) => (
        <Box
          key={i}
          sx={{ width: 3, height: `${h * 68}%`, background: `${pal.accent}55`, borderRadius: '2px' }}
        />
      ))}
    </Box>
  );
}

function LayerVisual({
  family,
  pal,
  layer,
}: {
  family: LayerFamily;
  pal: LayerPalette;
  layer: ArchitectureLayer;
}) {
  switch (family) {
    case 'conv':      return <ConvVisual pal={pal} layer={layer} />;
    case 'pool':      return <PoolVisual pal={pal} />;
    case 'attention': return <AttentionVisual pal={pal} />;
    case 'ffn':       return <DenseVisual pal={pal} layer={layer} />;
    case 'recurrent': return <RecurrentVisual pal={pal} layer={layer} />;
    case 'embedding': return <EmbeddingVisual pal={pal} layer={layer} />;
    case 'dense':     return <DenseVisual pal={pal} layer={layer} />;
    case 'output':    return <OutputVisual pal={pal} />;
    case 'boost':     return <BoostVisual pal={pal} />;
    default:          return <GenericVisual pal={pal} />;
  }
}

function TransformStrip({ tf }: { tf: TransformInfo }) {
  const cfg = TRANSFORM_CFG[tf.type];
  const displayLabel =
    tf.type === 'dropout' && tf.value ? `Drop ${tf.value}` : tf.label;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        px: 0.75,
        py: '2px',
        borderRadius: '4px',
        background: cfg.bg,
        border: `1px ${cfg.dashed ? 'dashed' : 'solid'} ${cfg.color}38`,
      }}
    >
      <Typography
        sx={{ fontSize: '0.52rem', fontWeight: 900, color: cfg.color, fontFamily: 'monospace', lineHeight: 1 }}
      >
        {cfg.symbol}
      </Typography>
      <Typography
        sx={{ fontSize: '0.52rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.02em', lineHeight: 1 }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
}

function LayerBlock({ layer }: { layer: ArchitectureLayer }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const family = classifyLayer(layer);
  const pal = FAMILY_PALETTE[family];
  const transforms = extractTransforms(layer);
  const hasSkip = detectSkip(layer);

  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 162,
        maxWidth: 196,
        flexShrink: 0,
        pt: hasSkip ? '30px' : 0,
      }}
    >
      {hasSkip && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 6,
            right: 6,
            height: 27,
            border: '1.5px dashed rgba(194,181,232,0.55)',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            '&::after': {
              content: '"identity ↓"',
              position: 'absolute',
              right: 8,
              top: 4,
              fontSize: '0.42rem',
              color: clrLilac,
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            },
          }}
        />
      )}

      <Box
        sx={{
          p: 1.75,
          borderRadius: '10px',
          background: isDark
            ? `linear-gradient(180deg, ${pal.bg} 0%, rgba(23,26,34,0.85) 100%)`
            : `linear-gradient(180deg, ${pal.bg} 0%, rgba(255,255,255,0.94) 100%)`,
          border: `1px solid ${pal.border}`,
          boxShadow: isDark
            ? `inset 0 1px 0 rgba(244,240,232,0.06), inset 0 -1px 0 rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.24)`
            : `inset 0 1px 0 rgba(255,255,255,0.86), 0 4px 12px rgba(24,22,15,0.08)`,
          transition: 'box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            boxShadow: isDark
              ? `inset 0 1px 0 rgba(244,240,232,0.10), 0 0 24px 3px ${pal.accent}30, 0 6px 18px rgba(0,0,0,0.36)`
              : `inset 0 1px 0 rgba(255,255,255,0.92), 0 0 20px 2px ${pal.accent}22, 0 6px 18px rgba(24,22,15,0.10)`,
            borderColor: `${pal.accent}70`,
            transform: 'translateY(-1px)',
          },
        }}
      >
        <Box sx={{ mb: 1, minHeight: 50 }}>
          <LayerVisual family={family} pal={pal} layer={layer} />
        </Box>

        {transforms.length > 0 && (
          <Stack direction="row" flexWrap="wrap" sx={{ gap: '4px', mb: 1 }}>
            {transforms.map((tf, i) => (
              <TransformStrip key={i} tf={tf} />
            ))}
          </Stack>
        )}

        <Divider sx={{ borderColor: `${pal.accent}1e`, mb: 0.85 }} />

        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.85rem', lineHeight: 1, flexShrink: 0 }}>
            {layer.icon}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.52rem',
              fontWeight: 900,
              color: pal.label,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {layer.label}
          </Typography>
        </Stack>

        <Typography
          sx={{ fontWeight: 800, fontSize: '0.77rem', mb: 0.7, lineHeight: 1.3, color: 'text.primary' }}
        >
          {layer.name}
        </Typography>

        {layer.details.map((d, i) => (
          <Typography
            key={i}
            variant="caption"
            display="block"
            sx={{
              color: 'text.secondary',
              fontSize: '0.63rem',
              lineHeight: 1.52,
              '&::before': { content: '"·"', mr: '4px', color: pal.accent },
            }}
          >
            {d}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function AnimatedArrow({ delay = 0 }: { delay?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, mx: 0.5 }}>
      <Box
        sx={{
          position: 'relative',
          width: 30,
          height: 2,
          background: 'linear-gradient(90deg, rgba(194,181,232,0.20) 0%, rgba(194,181,232,0.55) 100%)',
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #E5B5A0 0%, #C2B5E8 70%)',
            boxShadow: '0 0 12px 2px rgba(194,181,232,0.65)',
            animation: `flowDot 1.9s ${delay}s ease-in-out infinite`,
            '@keyframes flowDot': {
              '0%':   { left: -4, opacity: 0 },
              '12%':  { opacity: 1 },
              '85%':  { opacity: 1 },
              '100%': { left: 30, opacity: 0 },
            },
          }}
        />
      </Box>
      <Box
        sx={{
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: '7px solid rgba(194,181,232,0.55)',
          flexShrink: 0,
        }}
      />
    </Box>
  );
}

const LOWER_IS_BETTER = new Set(['RMSE', 'MAE', 'MAPE', 'SMAPE', 'Log Loss']);

function MetricBar({
  name,
  value,
  compareValue,
}: {
  name: string;
  value: number;
  compareValue: number;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const lowerIsBetter = LOWER_IS_BETTER.has(name);
  const maxVal = Math.max(Math.abs(value), Math.abs(compareValue), 0.001);
  const fillPct = lowerIsBetter
    ? Math.max(0, (1 - Math.abs(value) / maxVal) * 100)
    : (Math.abs(value) / maxVal) * 100;
  const isWinner = lowerIsBetter ? value < compareValue : value > compareValue;

  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.72rem' }}>
          {name}
          {lowerIsBetter && (
            <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.disabled', fontSize: '0.6rem' }}>
              (lower ↓)
            </Typography>
          )}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {isWinner && (
            <Typography variant="caption" sx={{ color: clrMint, fontSize: '0.7rem', fontWeight: 700 }}>
              ↑
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: isWinner ? clrMint : 'text.primary', fontSize: '0.78rem' }}
          >
            {value}
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(fillPct, 100)}
        sx={{
          height: 6,
          borderRadius: 4,
          backgroundColor: isDark ? 'rgba(244,240,232,0.06)' : 'rgba(24,22,15,0.08)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: isWinner
              ? `linear-gradient(90deg, ${clrMint} 0%, #7FBAA8 100%)`
              : isDark ? 'linear-gradient(90deg, #4A4640 0%, #76716A 100%)' : 'linear-gradient(90deg, #D8D2C8 0%, #AFA79C 100%)',
            boxShadow: isWinner ? `0 0 8px rgba(168,212,197,0.40)` : 'none',
          },
        }}
      />
    </Box>
  );
}

function ModelCard({
  model,
  compareMetrics,
  isWinner,
  label,
}: {
  model: ModelResult;
  compareMetrics: Record<string, number>;
  isWinner: boolean;
  label: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        width: '100%',
        p: 2.5,
        borderRadius: 2.5,
        border: isWinner
          ? `1.5px solid rgba(168,212,197,0.45)`
          : isDark ? '1px solid rgba(244,240,232,0.08)' : '1px solid rgba(24,22,15,0.08)',
        background: isWinner
          ? isDark
            ? `linear-gradient(180deg, rgba(168,212,197,0.06) 0%, rgba(23,26,34,0.85) 100%)`
            : `linear-gradient(180deg, rgba(168,212,197,0.16) 0%, rgba(255,255,255,0.96) 100%)`
          : isDark
            ? 'linear-gradient(180deg, rgba(31,35,44,0.85) 0%, rgba(23,26,34,0.85) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,245,241,0.98) 100%)',
        boxShadow: isWinner
          ? isDark
            ? `0 0 0 1px rgba(168,212,197,0.18) inset, 0 16px 40px rgba(0,0,0,0.32), 0 0 32px rgba(168,212,197,0.12)`
            : `0 0 0 1px rgba(168,212,197,0.18) inset, 0 16px 34px rgba(24,22,15,0.10), 0 0 28px rgba(168,212,197,0.10)`
          : isDark
            ? '0 1px 0 rgba(244,240,232,0.04) inset, 0 12px 32px rgba(0,0,0,0.28)'
            : '0 1px 0 rgba(255,255,255,0.92) inset, 0 12px 28px rgba(24,22,15,0.08)',
        position: 'relative',
      }}
    >
      {isWinner && (
        <Chip
          icon={<EmojiEventsIcon sx={{ fontSize: '0.85rem !important' }} />}
          label="Winner"
          size="small"
          sx={{
            position: 'absolute',
            top: -13,
            right: 16,
            background: `linear-gradient(135deg, ${clrMint} 0%, #7FBAA8 100%)`,
            color: clrNight,
            fontWeight: 700,
            fontSize: '0.68rem',
            height: 24,
            border: 'none',
            boxShadow: `0 1px 0 rgba(255,255,255,0.20) inset, 0 6px 16px rgba(168,212,197,0.40)`,
          }}
        />
      )}

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 600,
          color: isWinner ? clrMint : 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          fontSize: '0.6rem',
          mb: 0.4,
        }}
      >
        {label}
      </Typography>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2.5, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
        {model.model_name}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          flexWrap: 'wrap',
          overflowX: 'auto',
          pb: 1,
          mb: 3,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {model.layers.map((layer, i) => (
          <React.Fragment key={i}>
            <LayerBlock layer={layer} />
            {i < model.layers.length - 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AnimatedArrow delay={(i * 0.4) % 1.9} />
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>

      <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(24,22,15,0.08)', mb: 2 }} />

      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          fontSize: '0.6rem',
          display: 'block',
          mb: 1.5,
        }}
      >
        Evaluation Metrics
      </Typography>

      {Object.entries(model.metrics).map(([k, v]) => (
        <MetricBar key={k} name={k} value={v} compareValue={compareMetrics[k] ?? 0} />
      ))}
    </Box>
  );
}

function determineTaskType(framing: string): TaskType {
  const lower = framing.toLowerCase();
  if (lower.includes('time series') || lower.includes('forecast') || lower.includes('temporal')) return 'time_series';
  if (lower.includes('image') || lower.includes('vision') || lower.includes('photo') || lower.includes('picture')) return 'image_classification';
  if (lower.includes('text') || lower.includes('nlp') || lower.includes('sentiment') || lower.includes('language') || lower.includes('document')) return 'text_classification';
  if (lower.includes('regression') || lower.includes('predict price') || lower.includes('predict quantity') || lower.includes('continuous')) return 'regression';
  if (lower.includes('multi-class') || lower.includes('categorical') || lower.includes('categories') || lower.includes('multiple classes')) return 'multi_class';
  return 'binary_classification';
}

function nowStamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const TrainingSimulationRunner: React.FC<TrainingSimulationRunnerProps> = ({
  sessionId = 'agent_session',
  problemFraming = '',
  taskType: taskTypeProp,
  topModelId = '',
  datasetName = '',
  trainingPlanSummary = '',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [result, setResult] = useState<CompletedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const startTraining = async () => {
    setIsTraining(true);
    setLogs([]);
    setResult(null);
    setError(null);

    const taskType = (taskTypeProp as TaskType) || determineTaskType(problemFraming);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_URL}/api/training-sim/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: taskType,
          model_id: topModelId,
          dataset_name: datasetName,
          training_plan: trainingPlanSummary,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No readable stream returned');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.trim()) continue;
          const line = part.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.type === 'completed') {
              setResult(data as CompletedResult);
              setIsTraining(false);
            } else if (data.type === 'error') {
              setError(data.message);
              setIsTraining(false);
            } else {
              setLogs((prev) => [
                ...prev,
                { type: data.type, message: data.message, timestamp: nowStamp() },
              ]);
            }
          } catch {
            /* ignore malformed chunks */
          }
        }
      }
      setIsTraining(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start Training Agent');
      setIsTraining(false);
    }
  };

  const reset = () => {
    setResult(null);
    setLogs([]);
    setError(null);
  };

  if (!isTraining && !result) {
    return (
      <Box
        sx={{
          mt: 3,
          p: 3,
          borderRadius: 2.5,
          border: isDark ? `1px solid rgba(194,181,232,0.22)` : '1px solid rgba(24,22,15,0.08)',
          background: isDark
            ? 'linear-gradient(135deg, rgba(31,35,44,0.85) 0%, rgba(23,26,34,0.88) 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #FAF9F6 100%)',
          backgroundColor: isDark ? 'rgba(23,26,34,0.88)' : '#FFFFFF',
          backdropFilter: 'blur(24px)',
          textAlign: 'center',
          boxShadow: isDark
            ? '0 1px 0 rgba(244,240,232,0.04) inset, 0 16px 40px rgba(0,0,0,0.32), 0 0 32px rgba(194,181,232,0.08)'
            : '0 1px 0 rgba(255,255,255,0.96) inset, 0 12px 24px rgba(24,22,15,0.06)',
        }}
      >
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
          <SmartToyIcon sx={{ color: clrLilac, fontSize: '1rem', filter: 'drop-shadow(0 0 8px rgba(194,181,232,0.45))' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: clrLilac, letterSpacing: '-0.005em' }}>
            Training Agent
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2.5, maxWidth: 440, mx: 'auto', lineHeight: 1.65, fontSize: '0.85rem' }}
        >
          Benchmark a custom baseline against the top-ranked open-source model — with
          accurate architectures, live training loop, and real evaluation metrics.
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={startTraining}
          sx={{
            fontWeight: 600,
            px: 3,
            py: 1.1,
            borderRadius: 2.5,
            color: clrNight,
            background: `linear-gradient(135deg, ${clrLilac} 0%, ${clrLilacDeep} 100%)`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 20px rgba(157,141,208,0.40)',
            '&:hover': {
              background: `linear-gradient(135deg, #D5CBEF 0%, ${clrLilac} 100%)`,
              boxShadow: '0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px rgba(157,141,208,0.55)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Run Training Agent
        </Button>
        {error && (
          <Typography variant="caption" color="error" display="block" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <SmartToyIcon sx={{ color: clrLilac, fontSize: '1rem', filter: 'drop-shadow(0 0 8px rgba(194,181,232,0.45))' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: clrLilac, letterSpacing: '-0.005em' }}>
          Training Agent
        </Typography>
        {isTraining && <CircularProgress size={13} sx={{ ml: 0.5, color: clrLilac }} />}
      </Stack>

      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.6rem',
          display: 'block',
          mb: 0.75,
        }}
      >
        Training Loop
      </Typography>

      <Box
        sx={{
          fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code",monospace',
          fontSize: '0.72rem',
          background: isDark ? clrNight : '#F1EEE7',
          border: isDark ? '1px solid rgba(244,240,232,0.08)' : '1px solid rgba(24,22,15,0.10)',
          borderRadius: 2,
          p: 2,
          mb: result ? 3 : 0,
          maxHeight: 270,
          overflowY: 'auto',
          boxShadow: isDark
            ? '0 1px 0 rgba(244,240,232,0.04) inset, 0 8px 24px rgba(0,0,0,0.40)'
            : '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 22px rgba(24,22,15,0.08)',
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? `#272C37 ${clrNight}` : '#D8D2C8 #F1EEE7',
        }}
      >
        {logs.map((log, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 0.55, alignItems: 'flex-start' }}>
            <Typography
              component="span"
              sx={{ color: clrLilac, fontSize: '0.65rem', fontFamily: 'inherit', flexShrink: 0, mt: '1px', userSelect: 'none', fontWeight: 600 }}
            >
              ❯
            </Typography>
            <Typography
              component="span"
              sx={{ color: 'text.disabled', fontSize: '0.65rem', fontFamily: 'inherit', flexShrink: 0, mt: '1px', userSelect: 'none' }}
            >
              [{log.timestamp}]
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: 'inherit',
                fontSize: '0.72rem',
                lineHeight: 1.55,
                color:
                  log.type === 'section' ? clrLilac : log.type === 'epoch' ? clrMint : isDark ? '#B5AFA4' : 'text.secondary',
                fontWeight: log.type === 'section' ? 600 : 400,
              }}
            >
              {log.message}
            </Typography>
          </Box>
        ))}
        {isTraining && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5 }}>
            <Typography
              component="span"
              sx={{ color: clrLilac, fontSize: '0.65rem', fontFamily: 'inherit', userSelect: 'none', fontWeight: 600 }}
            >
              ❯
            </Typography>
            <Typography
              component="span"
              sx={{ color: 'text.disabled', fontSize: '0.65rem', fontFamily: 'inherit', userSelect: 'none' }}
            >
              [{nowStamp()}]
            </Typography>
            <Typography
              component="span"
              sx={{
                color: clrLilac,
                fontSize: '0.72rem',
                fontFamily: 'inherit',
                animation: 'blink 1s step-end infinite',
                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
              }}
            >
              ▋
            </Typography>
          </Box>
        )}
        <div ref={logsEndRef} />
      </Box>

      {result && (
        <>
          <Box
            sx={{
              mb: 3,
              p: 2.25,
              borderRadius: 2,
              background: isDark
                ? `linear-gradient(180deg, rgba(194,181,232,0.08) 0%, rgba(31,35,44,0.85) 100%)`
                : `linear-gradient(180deg, rgba(194,181,232,0.14) 0%, rgba(255,255,255,0.96) 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid rgba(194,181,232,0.22)`,
              boxShadow: isDark
                ? '0 1px 0 rgba(244,240,232,0.04) inset, 0 12px 28px rgba(0,0,0,0.28)'
                : '0 1px 0 rgba(255,255,255,0.92) inset, 0 12px 26px rgba(24,22,15,0.08)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: clrLilac,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                fontSize: '0.6rem',
                display: 'block',
                mb: 0.75,
              }}
            >
              Training Agent Summary
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.75, fontSize: '0.82rem' }}>
              {trainingPlanSummary
                ? (() => {
                    const plain = trainingPlanSummary
                      .replace(/#+\s+/g, '')
                      .replace(/\*\*/g, '')
                      .replace(/\*/g, '')
                      .replace(/`[^`]*`/g, '')
                      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                      .replace(/\n+/g, ' ')
                      .trim();
                    const sentences = plain.match(/[^.!?]+[.!?]+/g) || [plain];
                    let out = '';
                    for (const s of sentences) {
                      if ((out + s).length > 320) break;
                      out += s;
                    }
                    return out.trim() || plain.slice(0, 320) + '…';
                  })()
                : result.training_summary}
            </Typography>
          </Box>

          <Stack direction="column" spacing={2.5} sx={{ mb: 2.5 }}>
            <ModelCard
              model={result.comparison.custom_model}
              compareMetrics={result.comparison.oss_model.metrics}
              isWinner={result.winner === 'custom_model'}
              label="Custom Baseline Model"
            />
            <ModelCard
              model={result.comparison.oss_model}
              compareMetrics={result.comparison.custom_model.metrics}
              isWinner={result.winner === 'oss_model'}
              label="Open-Source Model"
            />
          </Stack>

          <Box
            sx={{
              p: 2.25,
              borderRadius: 2,
              background: isDark
                ? `linear-gradient(180deg, rgba(168,212,197,0.10) 0%, rgba(31,35,44,0.85) 100%)`
                : `linear-gradient(180deg, rgba(168,212,197,0.16) 0%, rgba(255,255,255,0.96) 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid rgba(168,212,197,0.32)`,
              boxShadow: isDark
                ? '0 1px 0 rgba(244,240,232,0.04) inset, 0 12px 32px rgba(0,0,0,0.28), 0 0 32px rgba(168,212,197,0.12)'
                : '0 1px 0 rgba(255,255,255,0.92) inset, 0 12px 28px rgba(24,22,15,0.08), 0 0 28px rgba(168,212,197,0.10)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.6 }}>
              <EmojiEventsIcon sx={{ color: clrMint, fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px rgba(168,212,197,0.45))' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: clrMint, letterSpacing: '-0.005em' }}>
                {result.winner === 'oss_model'
                  ? `${result.comparison.oss_model.model_name} wins`
                  : `${result.comparison.custom_model.model_name} wins`}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem', lineHeight: 1.65 }}>
              {result.winner === 'oss_model'
                ? `The open-source model outperforms the custom baseline across the majority of tracked metrics. Pre-trained weights give it a strong head start — we recommend prototyping with ${result.comparison.oss_model.model_name}.`
                : `The custom baseline edges out the open-source model. A lightweight approach may be all you need for this task — easier to control, iterate on, and deploy to production.`}
            </Typography>
          </Box>

          <Button
            variant="text"
            size="small"
            onClick={reset}
            sx={{
              mt: 1.5,
              fontWeight: 500,
              color: clrLilac,
              fontSize: '0.75rem',
              letterSpacing: '-0.005em',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': { color: '#D5CBEF', background: 'transparent' },
            }}
          >
            Run Again
          </Button>
        </>
      )}
    </Box>
  );
};

export default TrainingSimulationRunner;
