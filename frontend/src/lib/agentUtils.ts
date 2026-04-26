export const normalizeAgentName = (agentName: string): string => {
  const roleToIdMap: Record<string, string> = {
    'Dataset Agent': 'dataset_agent',
    'Kaggle Agent': 'kaggle_agent',
    'Model Agent': 'model_agent',
    'HuggingFace Agent': 'huggingface_agent',
    'Compatibility Agent': 'compatibility_agent',
    'Training Agent': 'training_agent',
    'Evaluation Agent': 'evaluation_agent',
    'ModelX Guide': 'modelx_guide',

    dataset_agent: 'dataset_agent',
    kaggle_agent: 'kaggle_agent',
    model_agent: 'model_agent',
    huggingface_agent: 'huggingface_agent',
    compatibility_agent: 'compatibility_agent',
    training_agent: 'training_agent',
    evaluation_agent: 'evaluation_agent',
    modelx_guide: 'modelx_guide',
    system: 'system',
  };

  return roleToIdMap[agentName] || 'system';
};

export const AGENT_ROLE_MAP = {
  'Dataset Agent': 'dataset_agent',
  'Kaggle Agent': 'kaggle_agent',
  'Model Agent': 'model_agent',
  'HuggingFace Agent': 'huggingface_agent',
  'Compatibility Agent': 'compatibility_agent',
  'Training Agent': 'training_agent',
  'Evaluation Agent': 'evaluation_agent',
  'ModelX Guide': 'modelx_guide',
} as const;
