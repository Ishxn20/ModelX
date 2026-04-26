import type { AgentMessage, MLBlueprint, Phase } from './types';
import { generateMockMessages, mockBlueprint } from './mockData';

const SYSTEM_MESSAGE_DELAY = 250;
const MESSAGE_INTERVAL = 1250;

export type SimulationCallback = {
  onPhaseChange: (phase: Phase) => void;
  onMessage: (message: AgentMessage) => void;
  onBlueprint: (blueprint: MLBlueprint) => void;
  onComplete: () => void;
};

class SimulationService {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private isRunning = false;
  private callbacks: SimulationCallback | null = null;

  private phaseAgents: Array<{ phase: Phase; agentId: string; duration: number }> = [
    { phase: 'idea', agentId: 'system', duration: 1200 },
    { phase: 'dataset', agentId: 'dataset_agent', duration: 4200 },
    { phase: 'kaggle', agentId: 'kaggle_agent', duration: 4200 },
    { phase: 'model', agentId: 'model_agent', duration: 4200 },
    { phase: 'huggingface', agentId: 'huggingface_agent', duration: 4200 },
    { phase: 'compatibility', agentId: 'compatibility_agent', duration: 4200 },
    { phase: 'training', agentId: 'training_agent', duration: 4200 },
    { phase: 'evaluation', agentId: 'evaluation_agent', duration: 4200 },
    { phase: 'blueprint', agentId: 'modelx_guide', duration: 4200 },
  ];

  start(callbacks: SimulationCallback) {
    if (this.isRunning) {
      this.stop();
    }

    this.isRunning = true;
    this.callbacks = callbacks;
    this.runPhase(0);
  }

  stop() {
    this.isRunning = false;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }

  reset() {
    this.stop();
    this.callbacks = null;
  }

  private runPhase(index: number) {
    if (!this.isRunning || !this.callbacks) return;

    if (index >= this.phaseAgents.length) {
      this.callbacks.onBlueprint(mockBlueprint);
      this.callbacks.onPhaseChange('completed');
      this.callbacks.onComplete();
      this.isRunning = false;
      return;
    }

    const phaseConfig = this.phaseAgents[index];
    this.callbacks.onPhaseChange(phaseConfig.phase);

    if (phaseConfig.agentId === 'system') {
      const timer = setTimeout(() => {
        if (this.callbacks && this.isRunning) {
          this.callbacks.onMessage({
            agent: 'system',
            message: 'ModelX is reading your idea and preparing the agent workflow.',
            message_type: 'info',
            timestamp: Date.now(),
          });
        }
      }, SYSTEM_MESSAGE_DELAY);
      this.timers.push(timer);
    } else {
      const messages = generateMockMessages(phaseConfig.agentId, 3);
      messages.forEach((message, messageIndex) => {
        const timer = setTimeout(() => {
          if (this.callbacks && this.isRunning) {
            this.callbacks.onMessage({
              ...message,
              timestamp: Date.now(),
            });
          }
        }, messageIndex * MESSAGE_INTERVAL);
        this.timers.push(timer);
      });
    }

    const nextTimer = setTimeout(() => this.runPhase(index + 1), phaseConfig.duration);
    this.timers.push(nextTimer);
  }
}

export const simulationService = new SimulationService();
