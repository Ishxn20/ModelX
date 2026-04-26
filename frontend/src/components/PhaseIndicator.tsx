import React from 'react';
import { Box, Step, StepLabel, Stepper } from '@mui/material';
import type { Phase } from '../lib/types';

const clrMuted = '#76716A';
const clrMint = '#A8D4C5';
const clrLilac = '#C2B5E8';
const clrNight = '#0A0B0F';

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

const phases: Array<{ id: Phase; label: string }> = [
  { id: 'idea', label: 'Idea' },
  { id: 'dataset', label: 'Dataset' },
  { id: 'kaggle', label: 'Kaggle' },
  { id: 'model', label: 'Model' },
  { id: 'huggingface', label: 'HuggingFace' },
  { id: 'compatibility', label: 'Compatibility' },
  { id: 'training', label: 'Training' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'blueprint', label: 'Blueprint' },
];

const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ currentPhase }) => {
  const getActiveStep = (): number => {
    if (currentPhase === 'idle') return -1;
    if (currentPhase === 'completed') return phases.length;
    const index = phases.findIndex((phase) => phase.id === currentPhase);
    return index >= 0 ? index : -1;
  };

  const activeStep = getActiveStep();

  return (
    <Box sx={{ mb: 3, animation: 'floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          '& .MuiStepLabel-label': {
            color: clrMuted,
            fontWeight: 500,
            fontSize: '0.74rem',
            letterSpacing: '-0.005em',
            transition: 'color 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          },
          '& .MuiStepLabel-root .Mui-completed': {
            color: clrMint,
            fontWeight: 500,
          },
          '& .MuiStepLabel-root .Mui-active': {
            color: clrLilac,
            fontWeight: 600,
          },
          '& .MuiStepIcon-root': {
            color: 'rgba(244,240,232,0.10)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          },
          '& .MuiStepIcon-root .MuiStepIcon-text': {
            fill: clrMuted,
            fontWeight: 600,
          },
          '& .MuiStepIcon-root.Mui-completed': {
            color: clrMint,
          },
          '& .MuiStepIcon-root.Mui-active': {
            color: clrLilac,
            filter: 'drop-shadow(0 0 8px rgba(194,181,232,0.55))',
            animation: 'softGlow 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
          },
          '& .MuiStepIcon-root.Mui-active .MuiStepIcon-text, & .MuiStepIcon-root.Mui-completed .MuiStepIcon-text': {
            fill: clrNight,
          },
          '& .MuiStepConnector-line': {
            borderColor: 'rgba(244,240,232,0.08)',
            borderTopWidth: 1.5,
            transition: 'border-color 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line, & .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: 'rgba(168,212,197,0.55)',
          },
        }}
      >
        {phases.map((phase, index) => (
          <Step key={phase.id} completed={activeStep > index}>
            <StepLabel>{phase.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default PhaseIndicator;
