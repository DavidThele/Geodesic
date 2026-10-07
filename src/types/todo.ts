export type ImportanceLevel =
  | 'none'
  | 'low'
  | 'med-low'
  | 'med'
  | 'med-high'
  | 'high'
  | 'urgent'
  | 'do_now';

export type TaskColumn = 'todo' | 'in_progress' | 'stuck';

export interface TaskLocation {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  details?: string; // Room number, gate, desk, floor, etc.
}

export interface ProgressNote {
  id: string;
  timestamp: string;
  note: string;
  completedSubtaskSnapshot?: string[];
}

export interface TaskReminder {
  id: string;
  minutesBefore: number; // e.g. 15, 60, 120, 1440
  target: 'calculated' | 'hard'; // which due date this reminder is anchored to
  label?: string; // Optional user label, e.g. "Prepare presentation"
}

export interface Task {
  id: string;
  title: string; // Required
  description?: string;
  location?: TaskLocation;
  dueDate?: string; // ISO string for hard due date & time
  importance: ImportanceLevel;
  estimatedMinutes?: number; // Estimated time to complete in minutes (defaults to 10)
  completed: boolean;
  completedAt?: string;
  parentId?: string | null; // For subtasks
  column: TaskColumn;
  blockedByTaskId?: string | null; // ID of task blocking this item in "stuck"
  progressNotes: ProgressNote[];
  customReminders?: TaskReminder[]; // User-defined custom notifications
  disableDefaultReminders?: boolean; // Whether to suppress standard 15m & 1h alerts
  createdAt: string;
  updatedAt: string;
}

export interface CalculatedPriority {
  score: number; // in hours (lower means sooner)
  baselineHours: number;
  importanceDeduction: number;
  distanceAddition: number;
  durationAdjustment?: number; // Priority boost in hours for quick-win tasks (<= 10 mins)
  distanceMiles: number | null;
  presumedDueDate: string; // ISO string: Now + score hours
  isOverdue: boolean;
}

export interface DisplayTaskEntry {
  displayId: string; // unique key for rendering (e.g. `task-123`)
  task: Task;
  type: 'yellow' | 'red';
  hoursAway: number;
  displayDate: string; // ISO string (calculated / presumed due date)
  priorityScore: number;
  isSubtask: boolean;
  hardDueDate?: string; // hard set due date ISO string if defined
  hardHoursAway?: number; // hours away until hard due date
}
