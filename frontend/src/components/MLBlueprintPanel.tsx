import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MLBlueprint, ProjectData } from '../lib/types';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import StorageIcon from '@mui/icons-material/Storage';

import { KaggleInlineList, HFInlineList } from './ResourceRecommendations';
import CompatibilityPanel from './CompatibilityPanel';
import TrainingSimulationRunner from './TrainingSimulationRunner';
import InferenceChat from './InferenceChat';
import ShipItPanel from './ShipItPanel';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const clrLilac = '#C2B5E8';
const clrLilacDeep = '#9D8DD0';
const clrMint = '#A8D4C5';
const clrNight = '#0A0B0F';

interface MLBlueprintPanelProps {
  blueprint: MLBlueprint;
  projectData: ProjectData;
}

type TaskType = 'binary_classification' | 'multi_class' | 'regression' | 'text_classification' | 'image_classification' | 'time_series';

function mapHFTaskType(hfTag: string | undefined, fallback: string): TaskType {
  const t = (hfTag || '').toLowerCase().replace(/-/g, '_');
  if (t.includes('image_classif')) return 'image_classification';
  if (t.includes('text_classif') || t.includes('sentiment') || t.includes('token_classif') || t.includes('fill_mask') || t.includes('zero_shot')) return 'text_classification';
  if (t.includes('tabular_regress') || t.includes('regression')) return 'regression';
  if (t.includes('time_series') || t.includes('forecast')) return 'time_series';
  if (t.includes('multi_label') || t.includes('multi_class') || t.includes('multiclass')) return 'multi_class';
  if (t.includes('classif')) return 'binary_classification';
  const f = fallback.toLowerCase();
  if (f.includes('time series') || f.includes('forecast') || f.includes('temporal')) return 'time_series';
  if (f.includes('image') || f.includes('vision') || f.includes('photo')) return 'image_classification';
  if (f.includes('text') || f.includes('nlp') || f.includes('sentiment') || f.includes('language')) return 'text_classification';
  if (f.includes('regression') || f.includes('predict price') || f.includes('continuous')) return 'regression';
  if (f.includes('multi') && f.includes('class')) return 'multi_class';
  return 'binary_classification';
}

function debateBrief(markdown: string): string {
  const plain = markdown
    .replace(/#+\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  const sentences = plain.match(/[^.!?]+[.!?]+/g) || [plain];
  let out = '';
  for (const s of sentences.slice(0, 2)) {
    out += s;
  }
  return out.trim() || plain.slice(0, 220) + '…';
}

function trainingBrief(markdown: string, maxChars = 300): string {
  const plain = markdown
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
    if ((out + s).length > maxChars) break;
    out += s;
  }
  return out.trim() || plain.slice(0, maxChars) + '…';
}

const recommendationConfig = {
  START_SIMPLE: {
    label: 'Start Simple',
    color: clrMint,
    variants: [
      { title: 'Your Blueprint Is Ready', subtitle: 'The problem is well-scoped and a first prototype can start today.' },
      { title: 'Time to Build', subtitle: 'A solid foundation is in place — dive straight into modelling.' },
      { title: 'Ship the First Version', subtitle: 'Scope and data are aligned. Build a lightweight baseline and iterate fast.' },
      { title: 'Clear Runway Ahead', subtitle: 'No blockers detected. Start coding your first experiment now.' },
      { title: 'Prototype-Ready Project', subtitle: 'Everything lines up for a clean first pass — model, data, and goal.' },
    ],
  },
  REFINE_IDEA: {
    label: 'Refine Idea',
    color: '#E89B85',
    variants: [
      { title: 'Sharpen the Problem First', subtitle: 'The scope is too broad to pick the right model. Narrow the task before moving forward.' },
      { title: 'Clarify Before You Build', subtitle: 'A clearer target variable or success metric will unlock the right approach.' },
      { title: 'Tighten the Problem Statement', subtitle: 'Small changes in framing can unlock dramatically better models — refine before coding.' },
      { title: 'Define the Win Condition', subtitle: 'What does a good prediction look like here? Answering that shapes every downstream choice.' },
      { title: 'Reduce Scope, Increase Focus', subtitle: 'A well-scoped sub-problem beats an ambiguous grand vision. Start smaller and sharper.' },
    ],
  },
};

function pickVariant(key: keyof typeof recommendationConfig, seed: number) {
  const variants = recommendationConfig[key].variants;
  return variants[seed % variants.length];
}

const mdStyles = {
  '& p': { m: 0, mb: 1.25, lineHeight: 1.8, color: 'text.secondary' },
  '& ul, & ol': { pl: 2.5, mb: 1, color: 'text.secondary' },
  '& li': { mb: 0.75 },
  '& strong': { color: 'text.primary', fontWeight: 600 },
  '& h1, & h2, & h3': { color: 'text.primary', mt: 2, mb: 1, fontWeight: 600, letterSpacing: '-0.015em' },
  '& code': {
    background: 'rgba(212, 176, 122, 0.16)',
    color: '#D4B07A',
    borderRadius: 0.75,
    px: 0.75,
    py: 0.25,
    fontSize: '0.82em',
    fontFamily: '"JetBrains Mono", monospace',
    border: '1px solid rgba(212, 176, 122, 0.20)',
  },
  '& a': {
    color: clrLilac,
    fontWeight: 500,
    textDecoration: 'none',
    borderBottom: '1px solid rgba(194, 181, 232, 0.30)',
    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    '&:hover': {
      color: '#D5CBEF',
      borderBottomColor: 'rgba(194, 181, 232, 0.60)',
    },
  },
};

const MLBlueprintPanel: React.FC<MLBlueprintPanelProps> = ({ blueprint, projectData }) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'bwd'>('fwd');
  const [navKey, setNavKey] = useState(0);

  const recKey = (blueprint.recommendation in recommendationConfig
    ? blueprint.recommendation
    : 'REFINE_IDEA') as keyof typeof recommendationConfig;
  const config = recommendationConfig[recKey];

  useMemo(
    () => pickVariant(recKey, Math.floor(Math.random() * 100)),
    [blueprint.summary],
  );

  const cards = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <AutoAwesomeIcon sx={{ fontSize: '1rem' }} />,
      content: (
        <Box sx={mdStyles}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{blueprint.summary}</ReactMarkdown>
        </Box>
      ),
    },
    {
      id: 'dataset',
      label: 'Dataset',
      icon: <StorageIcon sx={{ fontSize: '1rem' }} />,
      content: (
        <Box>
          <Box sx={mdStyles}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{blueprint.dataset_plan}</ReactMarkdown>
          </Box>
          <KaggleInlineList datasets={blueprint.kaggle_datasets} />
        </Box>
      ),
    },
    {
      id: 'model',
      label: 'Model',
      icon: <ModelTrainingIcon sx={{ fontSize: '1rem' }} />,
      content: (
        <Box>
          <Box sx={mdStyles}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{blueprint.model_plan}</ReactMarkdown>
          </Box>
          <HFInlineList models={blueprint.huggingface_models} />
        </Box>
      ),
    },
    ...(blueprint.compatibility_result
      ? [
          {
            id: 'compatibility',
            label: 'Compatibility',
            icon: <CompareArrowsIcon sx={{ fontSize: '1rem' }} />,
            content: <CompatibilityPanel result={blueprint.compatibility_result!} />,
          },
        ]
      : []),
    {
      id: 'training',
      label: 'Training',
      icon: <ChecklistIcon sx={{ fontSize: '1rem' }} />,
      content: (
        <Box>
          <Box sx={mdStyles}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{blueprint.training_plan}</ReactMarkdown>
          </Box>
          <TrainingSimulationRunner
            problemFraming={blueprint.problem_framing}
            taskType={mapHFTaskType(
              blueprint.huggingface_models?.[0]?.task_type,
              blueprint.problem_framing,
            )}
            topModelId={
              blueprint.compatibility_result?.chosen_model ||
              blueprint.huggingface_models?.[0]?.model_id ||
              ''
            }
            datasetName={
              blueprint.compatibility_result?.chosen_dataset ||
              blueprint.kaggle_datasets?.[0]?.title ||
              ''
            }
            trainingPlanSummary={blueprint.training_plan}
          />
        </Box>
      ),
    },
    {
      id: 'inference',
      label: 'Inference',
      icon: <BoltIcon sx={{ fontSize: '1rem' }} />,
      content: (
        <InferenceChat
          taskType={mapHFTaskType(
            blueprint.huggingface_models?.[0]?.task_type,
            blueprint.problem_framing,
          )}
          modelName={
            blueprint.compatibility_result?.chosen_model ||
            blueprint.huggingface_models?.[0]?.model_id ||
            'Trained Model'
          }
          datasetName={
            blueprint.compatibility_result?.chosen_dataset ||
            blueprint.kaggle_datasets?.[0]?.title ||
            ''
          }
          problemFraming={blueprint.problem_framing}
          datasetPlan={blueprint.dataset_plan}
          modelPlan={blueprint.model_plan}
          trainingPlan={blueprint.training_plan}
          evaluationPlan={blueprint.evaluation_plan}
          nextSteps={blueprint.next_steps}
          compatibility={blueprint.compatibility_result ? {
            chosen_dataset: blueprint.compatibility_result.chosen_dataset,
            chosen_dataset_url: blueprint.compatibility_result.chosen_dataset_url,
            chosen_model: blueprint.compatibility_result.chosen_model,
            chosen_model_url: blueprint.compatibility_result.chosen_model_url,
            why_this_pair: blueprint.compatibility_result.why_this_pair,
            estimated_effort: blueprint.compatibility_result.estimated_effort,
          } : undefined}
        />
      ),
    },
    {
      id: 'ship',
      label: 'Ship It',
      icon: <RocketLaunchIcon sx={{ fontSize: '1rem' }} />,
      content: (
        <ShipItPanel
          taskType={mapHFTaskType(blueprint.huggingface_models?.[0]?.task_type, blueprint.problem_framing)}
          modelId={blueprint.compatibility_result?.chosen_model ?? blueprint.huggingface_models?.[0]?.model_id ?? ''}
          datasetName={blueprint.compatibility_result?.chosen_dataset ?? ''}
          datasetUrl={blueprint.compatibility_result?.chosen_dataset_url ?? ''}
          projectTitle={projectData?.project_title ?? 'ml-project'}
          problemFraming={blueprint.problem_framing}
          datasetPlan={blueprint.dataset_plan}
          modelPlan={blueprint.model_plan}
          trainingPlan={blueprint.training_plan}
          evaluationPlan={blueprint.evaluation_plan}
          nextSteps={blueprint.next_steps}
          whyThisPair={blueprint.compatibility_result?.why_this_pair ?? ''}
          estimatedEffort={blueprint.compatibility_result?.estimated_effort ?? ''}
        />
      ),
    },
  ];

  const navigate = (index: number) => {
    if (index === currentCard || index < 0 || index >= cards.length) return;
    setDirection(index > currentCard ? 'fwd' : 'bwd');
    setCurrentCard(index);
    setNavKey((k) => k + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(currentCard + 1);
      if (e.key === 'ArrowLeft') navigate(currentCard - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentCard, cards.length]);

  const handleDownload = () => {
    const content = `MODELX ML BLUEPRINT
====================
Project: ${projectData.project_title || 'Untitled ML idea'}
Skill Level: ${projectData.skill_level}
Data Status: ${projectData.data_status}
Recommendation: ${config.label}

OVERVIEW
${blueprint.summary}

DATASET
${blueprint.dataset_plan}

MODEL
${blueprint.model_plan}

TRAINING
${blueprint.training_plan}

EVALUATION
${blueprint.evaluation_plan}

DEBATE
${blueprint.debate_summary}

NEXT STEPS
${blueprint.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

GLOSSARY
${blueprint.glossary.map((e) => `${e.term}: ${e.definition}`).join('\n')}

Generated by ModelX
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectData.project_title || 'modelx').replace(/\s+/g, '_')}_Blueprint.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const card = cards[currentCard];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(31, 35, 44, 0.85) 0%, rgba(23, 26, 34, 0.88) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(244, 240, 232, 0.08)',
          boxShadow: '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 16px 40px rgba(0, 0, 0, 0.32)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'floatUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, ${config.color} 0%, ${config.color}55 100%)`,
            boxShadow: `0 0 20px ${config.color}66`,
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ md: 'center' }}
        >
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: blueprint.debate_summary ? 1.5 : 0 }}>
              <AutoAwesomeIcon sx={{ color: config.color, fontSize: '1.1rem', filter: `drop-shadow(0 0 8px ${config.color}66)` }} />
              <Chip
                label={config.label}
                sx={{
                  background: `${config.color}1A`,
                  color: config.color,
                  fontWeight: 600,
                  height: 28,
                  fontSize: '0.75rem',
                  letterSpacing: '0.01em',
                  border: `1px solid ${config.color}55`,
                  boxShadow: `0 0 16px ${config.color}28`,
                }}
              />
            </Stack>

            {blueprint.debate_summary && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: config.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '0.65rem',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Agentic Debate Summary
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.65,
                    fontSize: '0.82rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {debateBrief(blueprint.debate_summary)}
                </Typography>
              </Box>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{
              py: 1.3,
              px: 3,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderRadius: 2.5,
              color: clrNight,
              background: `linear-gradient(135deg, ${clrLilac} 0%, ${clrLilacDeep} 100%)`,
              boxShadow: '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 6px 18px rgba(157, 141, 208, 0.40)',
              transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': {
                background: `linear-gradient(135deg, #D5CBEF 0%, ${clrLilac} 100%)`,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.22) inset, 0 12px 28px rgba(157, 141, 208, 0.55)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Export Blueprint
          </Button>
        </Stack>
      </Box>

      <Stack direction="row" spacing={0} alignItems="flex-start">

        <Box
          sx={{
            width: { xs: 44, sm: 164 },
            flexShrink: 0,
            mr: { xs: 1.5, sm: 2.5 },
            position: 'sticky',
            top: 16,
          }}
        >
          {cards.map((c, index) => {
            const isActive = index === currentCard;
            const isPast = index < currentCard;
            return (
              <Tooltip
                key={c.id}
                title={c.label}
                placement="right"
                disableHoverListener={false}
              >
                <Box
                  onClick={() => navigate(index)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: { xs: 0.75, sm: 1.5 },
                    py: 1.1,
                    mb: 0.5,
                    borderRadius: 1.75,
                    cursor: 'pointer',
                    borderLeft: isActive
                      ? `2px solid ${clrLilac}`
                      : `2px solid transparent`,
                    background: isActive
                      ? 'rgba(194, 181, 232, 0.10)'
                      : 'transparent',
                    transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                    '&:hover': {
                      background: isActive
                        ? 'rgba(194, 181, 232, 0.12)'
                        : 'rgba(244, 240, 232, 0.04)',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isActive
                        ? `linear-gradient(135deg, ${clrLilac} 0%, ${clrLilacDeep} 100%)`
                        : isPast
                          ? 'rgba(168, 212, 197, 0.20)'
                          : 'rgba(244, 240, 232, 0.06)',
                      border: isPast && !isActive ? `1px solid rgba(168, 212, 197, 0.40)` : 'none',
                      transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isActive
                        ? '0 0 16px rgba(194, 181, 232, 0.45)'
                        : 'none',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        color: isActive
                          ? clrNight
                          : isPast
                            ? clrMint
                            : 'text.disabled',
                        lineHeight: 1,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? 'text.primary'
                        : isPast
                          ? 'text.secondary'
                          : 'text.disabled',
                      fontSize: '0.82rem',
                      letterSpacing: '-0.005em',
                      transition: 'all 220ms ease',
                      userSelect: 'none',
                    }}
                  >
                    {c.label}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              background: 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(244, 240, 232, 0.06)',
              borderRadius: 2.5,
              boxShadow: '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 16px 48px rgba(0, 0, 0, 0.36)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: '1px solid rgba(244, 240, 232, 0.06)',
                background: 'linear-gradient(180deg, rgba(31, 35, 44, 0.6) 0%, rgba(23, 26, 34, 0.4) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    background: 'linear-gradient(135deg, rgba(194, 181, 232, 0.18) 0%, rgba(157, 141, 208, 0.10) 100%)',
                    border: '1px solid rgba(194, 181, 232, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: clrLilac,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: 'text.primary', letterSpacing: '-0.015em' }}>
                  {card.label}
                </Typography>
              </Stack>

              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {currentCard + 1} / {cards.length}
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                height: 'calc(100vh - 440px)',
                minHeight: 460,
                p: 3,
                background: 'transparent',
                scrollbarWidth: 'thin',
                scrollbarColor: '#272C37 transparent',
              }}
            >
              <Box
                key={navKey}
                sx={{
                  animation:
                    direction === 'fwd'
                      ? 'slideInFwd 0.32s cubic-bezier(0.22, 1, 0.36, 1) both'
                      : 'slideInBwd 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
                  '@keyframes slideInFwd': {
                    '0%': { transform: 'translateX(28px) translateY(8px)', opacity: 0 },
                    '100%': { transform: 'translateX(0) translateY(0)', opacity: 1 },
                  },
                  '@keyframes slideInBwd': {
                    '0%': { transform: 'translateX(-28px) translateY(8px)', opacity: 0 },
                    '100%': { transform: 'translateX(0) translateY(0)', opacity: 1 },
                  },
                }}
              >
                {card.content}
              </Box>
            </Box>

            <Box
              sx={{
                px: 3,
                py: 1.75,
                borderTop: '1px solid rgba(244, 240, 232, 0.06)',
                background: 'rgba(16, 18, 24, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <IconButton
                onClick={() => navigate(currentCard - 1)}
                disabled={currentCard === 0}
                size="small"
                sx={{
                  color: clrLilac,
                  opacity: currentCard === 0 ? 0.25 : 0.85,
                  transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:hover': { opacity: 1, background: 'rgba(194, 181, 232, 0.10)' },
                }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>

              <Stack direction="row" spacing={0.75} alignItems="center">
                {cards.map((_, idx) => (
                  <Box
                    key={idx}
                    onClick={() => navigate(idx)}
                    sx={{
                      height: 5,
                      width: idx === currentCard ? 22 : 5,
                      borderRadius: 3,
                      background:
                        idx === currentCard
                          ? `linear-gradient(90deg, ${clrLilac} 0%, ${clrLilacDeep} 100%)`
                          : idx < currentCard
                            ? 'rgba(168, 212, 197, 0.40)'
                            : 'rgba(244, 240, 232, 0.10)',
                      cursor: 'pointer',
                      boxShadow: idx === currentCard ? '0 0 12px rgba(194, 181, 232, 0.40)' : 'none',
                      transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                      '&:hover': {
                        background:
                          idx === currentCard
                            ? `linear-gradient(90deg, ${clrLilac} 0%, ${clrLilacDeep} 100%)`
                            : 'rgba(194, 181, 232, 0.30)',
                      },
                    }}
                  />
                ))}
              </Stack>

              <IconButton
                onClick={() => navigate(currentCard + 1)}
                disabled={currentCard === cards.length - 1}
                size="small"
                sx={{
                  color: clrLilac,
                  opacity: currentCard === cards.length - 1 ? 0.25 : 0.85,
                  transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:hover': { opacity: 1, background: 'rgba(194, 181, 232, 0.10)' },
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </Box>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1.25,
              color: 'text.disabled',
              fontSize: '0.65rem',
            }}
          >
            Use ← → arrow keys to navigate
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default MLBlueprintPanel;
