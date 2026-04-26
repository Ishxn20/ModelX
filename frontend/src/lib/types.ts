export type SkillLevel = 'beginner' | 'some_python' | 'intermediate';
export type DataStatus = 'no_dataset' | 'have_dataset' | 'need_public_dataset';

export interface ProjectData {
  project_title?: string;
  idea: string;
  goal: string;
  skill_level: SkillLevel;
  data_status: DataStatus;
  data_description?: string;
  constraints?: string;
}

export interface Agent {
  id: string;
  name: string;
  color: string;
}

export interface AgentMessage {
  agent: string;
  message: string;
  message_type: string;
  timestamp: number;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface KaggleDataset {
  rank: number;
  title: string;
  url: string;
  description: string;
  relevance_reason: string;
  vote_count: number;
  download_count: number;
}

export interface HuggingFaceModel {
  rank: number;
  model_id: string;
  url: string;
  task_type: string;
  relevance_reason: string;
  downloads: number;
  likes: number;
}

export interface PreprocessingDimension {
  dimension: string;
  status: 'Ready' | 'Minor Prep' | 'Major Prep';
  description: string;
  steps: string[];
}

export interface CompatibilityResult {
  chosen_dataset: string;
  chosen_dataset_url: string;
  chosen_model: string;
  chosen_model_url: string;
  compatibility_score: 'High' | 'Medium' | 'Low';
  why_this_pair: string;
  preprocessing_dimensions: PreprocessingDimension[];
  estimated_effort: string;
}

export interface MLBlueprint {
  recommendation: 'START_SIMPLE' | 'NEEDS_DATA' | 'REFINE_IDEA';
  summary: string;
  problem_framing: string;
  dataset_plan: string;
  model_plan: string;
  training_plan: string;
  evaluation_plan: string;
  debate_summary: string;
  next_steps: string[];
  glossary: GlossaryEntry[];
  kaggle_datasets?: KaggleDataset[];
  huggingface_models?: HuggingFaceModel[];
  compatibility_result?: CompatibilityResult;
}

export type Phase =
  | 'idle'
  | 'idea'
  | 'dataset'
  | 'kaggle'
  | 'model'
  | 'huggingface'
  | 'compatibility'
  | 'training'
  | 'evaluation'
  | 'blueprint'
  | 'completed'
  | 'failed';

export interface SimulationState {
  phase: Phase;
  messages: AgentMessage[];
  blueprint: MLBlueprint | null;
  isRunning: boolean;
  startTime: number | null;
}

export interface TimelineEvent {
  id: string;
  agent: string;
  message: string;
  timestamp: number;
  type: 'start' | 'message' | 'complete' | 'phase_change';
}
