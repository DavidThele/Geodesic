import { ImportanceLevel } from './todo';

export interface AppSettings {
  defaultBaselineHours: number; // default: 72 (3 days)
  importanceDeductions: Record<ImportanceLevel, number>;
  distanceScalar: number; // hours added per mile (scalar)
  distanceOffset: number; // x in miles (buffer before distance penalty applies)
  distanceCapHours: number; // maximum hours added by distance
  triageThresholdHours: number; // default: 24 (tasks with priority <= this enter triage)
  maxTriageCardsDesktop: number; // default: 7
  maxTriageCardsMobile: number; // default: 3
  proximityAlertRadiusMiles: number; // default: 1.0 mile
  pinchSensitivity: number; // default: 1.0
  theme: 'system' | 'light' | 'dark';
  uiScale: number; // default: 1.0 (can be 1.15 or 1.25 for comfortable Mac desktop reading)
  popupDefaultView: 'priority' | 'calendar' | 'triage';
  autoSyncICloud: boolean; // default: true
  autoSyncFileName: string; // default: 'chronos-tasks-backup.json'
  // Optional simulated location for testing priority scores without moving
  simulatedUserLocation?: {
    lat: number;
    lng: number;
    name: string;
  } | null;
}

export const DEFAULT_IMPORTANCE_DEDUCTIONS: Record<ImportanceLevel, number> = {
  none: 0,
  low: 6,
  'med-low': 12,
  med: 24,
  'med-high': 48,
  high: 72,
  urgent: 120,
  do_now: 240,
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultBaselineHours: 72, // 3 days
  importanceDeductions: DEFAULT_IMPORTANCE_DEDUCTIONS,
  distanceScalar: 1.5, // 1.5 hours added per mile away
  distanceOffset: 0.5, // first 0.5 miles add nothing
  distanceCapHours: 72, // cap addition at 72h
  triageThresholdHours: 24, // 24 hours
  maxTriageCardsDesktop: 7,
  maxTriageCardsMobile: 3,
  proximityAlertRadiusMiles: 1.0,
  pinchSensitivity: 1.0,
  theme: 'system',
  uiScale: 1.0,
  popupDefaultView: 'priority',
  autoSyncICloud: true,
  autoSyncFileName: 'geodesic-tasks-backup.json',
  simulatedUserLocation: null,
};
