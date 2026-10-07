import { Task, CalculatedPriority, DisplayTaskEntry } from '../types/todo';
import { AppSettings } from '../types/settings';

/**
 * Calculates great-circle distance between two points in miles using Haversine formula
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates priority score and details for a given task
 */
export function calculateTaskPriority(
  task: Task,
  settings: AppSettings,
  userLocation: { lat: number; lng: number } | null,
  now: Date = new Date()
): CalculatedPriority {
  const nowMs = now.getTime();

  // 1. Baseline Hours
  let baselineHours: number;
  let isOverdue = false;

  if (task.dueDate) {
    const dueMs = new Date(task.dueDate).getTime();
    baselineHours = (dueMs - nowMs) / (1000 * 60 * 60);
    if (baselineHours < 0) {
      isOverdue = true;
    }
  } else {
    baselineHours = settings.defaultBaselineHours;
  }

  // 2. Importance Deduction
  const importanceDeduction =
    settings.importanceDeductions[task.importance] ?? 0;

  // 3. Distance Addition
  let distanceAddition = 0;
  let distanceMiles: number | null = null;

  if (task.location && userLocation) {
    distanceMiles = calculateDistanceMiles(
      userLocation.lat,
      userLocation.lng,
      task.location.lat,
      task.location.lng
    );

    // Distance - x (offset)
    const effectiveDistance = Math.max(0, distanceMiles - settings.distanceOffset);
    let rawAddition = effectiveDistance * settings.distanceScalar;

    // Cap distance addition
    let cap = settings.distanceCapHours;
    if (task.dueDate && baselineHours > 0) {
      cap = Math.min(cap, baselineHours);
    }

    distanceAddition = Math.min(rawAddition, cap);
  }

  // 4. Quick-Win Duration Deduction
  // Shorter tasks (<= 10 mins) receive a slight priority boost (hours deducted from score)
  // to encourage quick wins and reduce task paralysis.
  // Longer tasks receive 0 duration deduction, so their priority relies more heavily on
  // their explicitly set importance/urgency flags and deadlines.
  let durationAdjustment = 0;
  const estimatedMinutes = task.estimatedMinutes !== undefined ? task.estimatedMinutes : 10;
  if (estimatedMinutes <= 5) {
    durationAdjustment = 2.5; // 2.5h boost for ultra-short quick wins (<= 5m)
  } else if (estimatedMinutes <= 10) {
    durationAdjustment = 1.5; // 1.5h boost for quick wins (6-10m)
  }

  // 5. Final Priority Score
  // Lower score = complete sooner. Overdue tasks become heavily negative.
  const score = baselineHours - importanceDeduction + distanceAddition - durationAdjustment;

  // Presumed due date = now + score hours
  const presumedDateMs = nowMs + score * 3600 * 1000;
  const presumedDueDate = new Date(presumedDateMs).toISOString();

  return {
    score,
    baselineHours,
    importanceDeduction,
    distanceAddition,
    durationAdjustment,
    distanceMiles,
    presumedDueDate,
    isOverdue,
  };
}

/**
 * Builds display task entries: exactly 1 unified entry per task.
 * The calculated priority due date governs ranking. If a hard due date also exists,
 * it is linked so the UI displays both simultaneously (e.g. "In 17h (24h max)").
 */
export function buildDisplayEntries(
  tasks: Task[],
  settings: AppSettings,
  userLocation: { lat: number; lng: number } | null,
  now: Date = new Date()
): DisplayTaskEntry[] {
  const entries: DisplayTaskEntry[] = [];
  const nowMs = now.getTime();

  for (const task of tasks) {
    if (task.completed) continue; // completed tasks handled separately

    // If task is a subtask, only include it on the main task list if it has a specific due date independent from the main task
    if (task.parentId) {
      if (!task.dueDate) {
        continue;
      }
      const parentTask = tasks.find((t) => t.id === task.parentId);
      if (parentTask && parentTask.dueDate && task.dueDate === parentTask.dueDate) {
        continue;
      }
    }

    const priority = calculateTaskPriority(task, settings, userLocation, now);
    const isSubtask = !!task.parentId;

    let hardHoursAway: number | undefined;
    if (task.dueDate) {
      const dueMs = new Date(task.dueDate).getTime();
      hardHoursAway = (dueMs - nowMs) / (1000 * 60 * 60);
    }

    entries.push({
      displayId: task.id,
      task,
      type: task.dueDate ? 'red' : 'yellow',
      hoursAway: priority.score,
      displayDate: priority.presumedDueDate,
      priorityScore: priority.score,
      isSubtask,
      hardDueDate: task.dueDate,
      hardHoursAway,
    });
  }

  // Sort by calculated priority score ascending (lowest score / earliest due first)
  entries.sort((a, b) => a.hoursAway - b.hoursAway);

  return entries;
}

/**
 * Formats a duration in concise units like "24h max" or "2d max"
 */
export function formatHardMaxHours(hours: number): string {
  if (hours < 0) {
    const absHours = Math.abs(hours);
    if (absHours < 1) {
      return `${Math.round(absHours * 60)}m overdue max`;
    }
    if (absHours < 24) {
      return `${Math.round(absHours)}h overdue max`;
    }
    const days = Math.round(absHours / 24);
    return `${days}d overdue max`;
  }

  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes}m max`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h max`;
  }
  const days = Math.round(hours / 24);
  return `${days}d max`;
}

/**
 * Formats hours away in a concise human-readable way (e.g., "-2.5h overdue", "in 3h", "in 2d 4h")
 */
export function formatHoursAway(hours: number): string {
  if (hours < 0) {
    const absHours = Math.abs(hours);
    if (absHours < 1) {
      return `${Math.round(absHours * 60)}m overdue`;
    }
    if (absHours < 24) {
      return `${absHours.toFixed(1)}h overdue`;
    }
    const days = Math.floor(absHours / 24);
    const rem = Math.round(absHours % 24);
    return `${days}d ${rem}h overdue`;
  }

  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `in ${minutes}m`;
  }

  if (hours < 24) {
    return `in ${hours.toFixed(1)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `in ${days}d ${remainingHours}h` : `in ${days}d`;
}

/**
 * Formats a date into a clean Apple HIG style string (e.g. "Today 4:30 PM", "Sep 30, 2:00 PM")
 */
export function formatAppleDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
