import type { MLBlueprint, ProjectData } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PlanStatus {
  session_id: string;
  status: string;
  project_data: ProjectData;
  result: MLBlueprint | null;
  task_outputs: Array<Record<string, unknown>>;
  error?: string | null;
  message?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
}

export const api = {
  startPlan: async (
    projectData: ProjectData
  ): Promise<{ session_id: string; status: string; message: string }> => {
    const response = await fetch(`${API_URL}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getPlanStatus: async (sessionId: string): Promise<PlanStatus> => {
    const response = await fetch(`${API_URL}/api/plan/${sessionId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};
