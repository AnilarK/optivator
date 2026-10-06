import { StudentStage } from './types';

export const STAGES: readonly StudentStage[] = [
  'New',
  'Stage 1',
  'Stage 2',
  'Stage 3',
  'Selected',
  'Rejected',
  'On Hold',
] as const;

export interface StageConfig {
  name: StudentStage;
  bgLight: string;
  textLight: string;
  borderLight: string;
  dotColor: string;
  badgeClass: string;
}

export const STAGE_CONFIGS: Record<StudentStage, StageConfig> = {
  New: {
    name: 'New',
    bgLight: 'bg-slate-100',
    textLight: 'text-slate-700',
    borderLight: 'border-slate-300',
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200',
  },
  'Stage 1': {
    name: 'Stage 1',
    bgLight: 'bg-lime-50',
    textLight: 'text-lime-700',
    borderLight: 'border-lime-200',
    dotColor: 'bg-lime-500',
    badgeClass: 'bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100',
  },
  'Stage 2': {
    name: 'Stage 2',
    bgLight: 'bg-green-50',
    textLight: 'text-green-700',
    borderLight: 'border-green-200',
    dotColor: 'bg-green-500',
    badgeClass: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  },
  'Stage 3': {
    name: 'Stage 3',
    bgLight: 'bg-emerald-50',
    textLight: 'text-emerald-700',
    borderLight: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  Selected: {
    name: 'Selected',
    bgLight: 'bg-green-50',
    textLight: 'text-green-700',
    borderLight: 'border-green-200',
    dotColor: 'bg-green-500',
    badgeClass: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  },
  Rejected: {
    name: 'Rejected',
    bgLight: 'bg-red-50',
    textLight: 'text-red-700',
    borderLight: 'border-red-200',
    dotColor: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  },
  'On Hold': {
    name: 'On Hold',
    bgLight: 'bg-orange-50',
    textLight: 'text-orange-700',
    borderLight: 'border-orange-200',
    dotColor: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
};

export function getStageConfig(stage: string): StageConfig {
  if (stage in STAGE_CONFIGS) {
    return STAGE_CONFIGS[stage as StudentStage];
  }
  return {
    name: stage as StudentStage,
    bgLight: 'bg-gray-100',
    textLight: 'text-gray-700',
    borderLight: 'border-gray-200',
    dotColor: 'bg-gray-400',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  };
}

export function isValidStage(stage: string): stage is StudentStage {
  return STAGES.includes(stage as StudentStage);
}
