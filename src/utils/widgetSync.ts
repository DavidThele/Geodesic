import { registerPlugin } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Task } from '../types/todo';
import { AppSettings } from '../types/settings';
import { calculateTaskPriority, formatAppleDate, formatHoursAway } from './priority';

export const APP_GROUP_ID = 'group.com.davidthele.geodesic';
export const WIDGET_STORAGE_KEY = 'geodesic_widget_data';

export interface WidgetTaskItem {
  id: string;
  title: string;
  dueDateFormatted: string;
  hoursAwayFormatted: string;
  isHardDueDate: boolean;
  isOverdue: boolean;
  importance: string;
  estimatedMinutes?: number;
  completed?: boolean;
}

export interface WidgetDataPayload {
  updatedAt: string;
  totalActiveCount: number;
  tasks: WidgetTaskItem[];
}

interface NativeWidgetSyncPlugin {
  syncWidgetData(options: { json: string }): Promise<{ success: boolean }>;
  reloadTimelines(): Promise<{ success: boolean }>;
}

const WidgetSync = registerPlugin<NativeWidgetSyncPlugin>('WidgetSync');

/**
 * Builds the prepared payload with prioritized tasks for Home Screen & Lock Screen widgets.
 * Never returns fake tasks. If all tasks are completed, shows the actual completed tasks.
 */
export function prepareWidgetPayload(
  tasks: Task[],
  settings: AppSettings,
  userLocation: { lat: number; lng: number } | null
): WidgetDataPayload {
  // 1. Separate uncompleted tasks from completed tasks
  const uncompleted = tasks.filter((t) => {
    if (t.completed) return false;
    if (t.parentId && !t.dueDate) return false;
    return true;
  });

  // 2. Score and sort uncompleted by priority (lowest score = highest urgency)
  const scored = uncompleted
    .map((task) => {
      const priority = calculateTaskPriority(task, settings, userLocation);
      return { task, priority };
    })
    .sort((a, b) => a.priority.score - b.priority.score);

  let candidateTasks: { task: Task; priorityScore: number; dateToDisplay?: string; isOverdue: boolean }[] = [];

  if (scored.length > 0) {
    candidateTasks = scored.map(({ task, priority }) => ({
      task,
      priorityScore: priority.score,
      dateToDisplay: task.dueDate || priority.presumedDueDate,
      isOverdue: priority.isOverdue,
    }));
  } else if (tasks.length > 0) {
    // If all tasks are completed, show user's actual tasks marked completed so they see REAL data
    candidateTasks = tasks.slice(0, 6).map((task) => ({
      task,
      priorityScore: 0,
      dateToDisplay: task.dueDate,
      isOverdue: false,
    }));
  }

  // 3. Format into WidgetTaskItem
  const topTasks: WidgetTaskItem[] = candidateTasks.slice(0, 6).map(({ task, priorityScore, dateToDisplay, isOverdue }) => {
    const isHardDueDate = Boolean(task.dueDate);

    return {
      id: task.id,
      title: task.completed ? `✓ ${task.title}` : task.title,
      dueDateFormatted: dateToDisplay ? formatAppleDate(dateToDisplay) : 'No due date',
      hoursAwayFormatted: task.completed ? 'Done' : formatHoursAway(priorityScore),
      isHardDueDate,
      isOverdue: Boolean(isOverdue),
      importance: task.importance,
      estimatedMinutes: task.estimatedMinutes !== undefined ? task.estimatedMinutes : 10,
      completed: task.completed,
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    totalActiveCount: uncompleted.length,
    tasks: topTasks,
  };
}

/**
 * Synchronizes task data to the native iOS Widget via App Group UserDefaults.
 */
export async function syncWidgetData(
  tasks: Task[],
  settings: AppSettings,
  userLocation: { lat: number; lng: number } | null
): Promise<WidgetDataPayload> {
  const payload = prepareWidgetPayload(tasks, settings, userLocation);
  const jsonString = JSON.stringify(payload);

  // 1. PRIMARY CHANNEL: App Group UserDefaults via native Swift plugin
  try {
    const res = await WidgetSync.syncWidgetData({ json: jsonString });
    console.log('🟢 [WidgetSync] Successfully synced with iOS native bridge:', res);
  } catch (err) {
    // Expected fallback if custom bridge is not compiled in
    console.debug('WidgetSync native plugin skipped (non-native or web):', err);
  }

  // 2. SECONDARY CHANNEL: Filesystem backup (just for web/app debugging)
  try {
    await Filesystem.writeFile({
      path: 'geodesic_widget_tasks.json',
      data: jsonString,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  } catch {
    // Ignore fallback failures
  }

  return payload;
}

/**
 * Manually prompts iOS to reload all Home Screen & Lock Screen widget timelines
 */
export async function forceReloadWidgets(): Promise<boolean> {
  try {
    await WidgetSync.reloadTimelines();
    return true;
  } catch {
    return false;
  }
}