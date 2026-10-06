import { LocalNotifications } from '@capacitor/local-notifications';
import { Task } from '../types/todo';
import { AppSettings } from '../types/settings';
import { calculateTaskPriority, formatHoursAway } from './priority';

/**
 * Hash function to convert string task ID + reminder offset into a stable 32-bit positive integer
 * required by Capacitor LocalNotifications ID field.
 */
export function hashNotificationId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647; // Ensure positive 31-bit integer
}

export interface NotificationStatus {
  permissionGranted: boolean;
  scheduledCount: number;
}

/**
 * Checks and requests notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') {
      return true;
    }
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    // Web fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }
}

/**
 * Checks current notification permission without prompting
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const check = await LocalNotifications.checkPermissions();
    return check.display === 'granted';
  } catch {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }
}

interface ScheduledItem {
  id: number;
  title: string;
  body: string;
  scheduleDate: Date;
  taskId: string;
}

/**
 * Schedules all due date notifications according to user rules:
 * - 15 minutes before calculated due date
 * - 1 hour before calculated due date
 * - 15 minutes before hard due date (if hard due date exists)
 * - 1 hour before hard due date (if hard due date exists)
 * - Subtasks ONLY get notifications if they have a hard due date!
 * - Any user-added custom notifications (minutes before calculated or hard)
 */
export async function scheduleTaskNotifications(
  tasks: Task[],
  settings: AppSettings,
  userLocation: { lat: number; lng: number } | null
): Promise<number> {
  const isGranted = await checkNotificationPermission();
  if (!isGranted) return 0;

  const nowMs = Date.now();
  const itemsToSchedule: ScheduledItem[] = [];

  for (const task of tasks) {
    // Only schedule for active, uncompleted tasks
    if (task.completed) continue;

    // RULE: "I don’t want these notifications for subtasks unless the subtasks have a hard due date."
    if (task.parentId && !task.dueDate) {
      continue;
    }

    // 1. Calculate Presumed Due Date (Calculated Priority Date)
    const priority = calculateTaskPriority(task, settings, userLocation);
    const calculatedDueMs = new Date(priority.presumedDueDate).getTime();

    // 2. Hard Due Date (if present)
    const hardDueMs = task.dueDate ? new Date(task.dueDate).getTime() : null;

    // A. Default Notifications (unless user explicitly disabled them for this task)
    if (!task.disableDefaultReminders) {
      // (i) 15 minutes before calculated due date
      const calc15Ms = calculatedDueMs - 15 * 60 * 1000;
      if (calc15Ms > nowMs) {
        itemsToSchedule.push({
          id: hashNotificationId(`${task.id}-calc-15`),
          title: `Upcoming: ${task.title}`,
          body: `Calculated priority due in 15 minutes.`,
          scheduleDate: new Date(calc15Ms),
          taskId: task.id,
        });
      }

      // (ii) 1 hour before calculated due date
      const calc60Ms = calculatedDueMs - 60 * 60 * 1000;
      if (calc60Ms > nowMs) {
        itemsToSchedule.push({
          id: hashNotificationId(`${task.id}-calc-60`),
          title: `Priority Alert: ${task.title}`,
          body: `Calculated priority due in 1 hour.`,
          scheduleDate: new Date(calc60Ms),
          taskId: task.id,
        });
      }

      // (iii) Hard Due Date reminders (if hard deadline set)
      if (hardDueMs) {
        // 15 minutes before hard deadline
        const hard15Ms = hardDueMs - 15 * 60 * 1000;
        if (hard15Ms > nowMs) {
          itemsToSchedule.push({
            id: hashNotificationId(`${task.id}-hard-15`),
            title: `⏰ Hard Deadline in 15m: ${task.title}`,
            body: `Hard deadline is in 15 minutes!`,
            scheduleDate: new Date(hard15Ms),
            taskId: task.id,
          });
        }

        // 1 hour before hard deadline
        const hard60Ms = hardDueMs - 60 * 60 * 1000;
        if (hard60Ms > nowMs) {
          itemsToSchedule.push({
            id: hashNotificationId(`${task.id}-hard-60`),
            title: `⏰ Hard Deadline in 1h: ${task.title}`,
            body: `Hard deadline is in 1 hour.`,
            scheduleDate: new Date(hard60Ms),
            taskId: task.id,
          });
        }
      }
    }

    // B. Custom Additional Notifications per Task
    if (task.customReminders && task.customReminders.length > 0) {
      for (const reminder of task.customReminders) {
        let baseDateMs: number | null = null;
        let targetLabel = 'Calculated Due Date';

        if (reminder.target === 'hard') {
          baseDateMs = hardDueMs;
          targetLabel = 'Hard Deadline';
        } else {
          baseDateMs = calculatedDueMs;
        }

        if (baseDateMs) {
          const triggerMs = baseDateMs - reminder.minutesBefore * 60 * 1000;
          if (triggerMs > nowMs) {
            const timeLabel = formatMinutesOffset(reminder.minutesBefore);
            itemsToSchedule.push({
              id: hashNotificationId(`${task.id}-custom-${reminder.id}`),
              title: `${reminder.label || 'Reminder'}: ${task.title}`,
              body: `${timeLabel} before ${targetLabel}.`,
              scheduleDate: new Date(triggerMs),
              taskId: task.id,
            });
          }
        }
      }
    }
  }

  // Schedule via Capacitor LocalNotifications
  try {
    // 1. Cancel all previous notifications before rescheduling to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    // 2. Schedule up to iOS limit (Capacitor handles up to 64 scheduled notifications smoothly)
    const cappedItems = itemsToSchedule.slice(0, 64);
    if (cappedItems.length > 0) {
      await LocalNotifications.schedule({
        notifications: cappedItems.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          schedule: { at: item.scheduleDate },
          sound: 'default',
          actionTypeId: '',
          extra: { taskId: item.taskId },
        })),
      });
    }

    return cappedItems.length;
  } catch {
    // Web environment: simulate active triggers using setTimeout for items within the next 24 hours
    scheduleWebTimeouts(itemsToSchedule);
    return itemsToSchedule.length;
  }
}

/**
 * Format minutes into clean human-readable offset (e.g. "15m", "1 hour", "2 hours", "1 day")
 */
export function formatMinutesOffset(mins: number): string {
  if (mins < 60) {
    return `${mins} mins`;
  }
  if (mins < 1440) {
    const hours = mins / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const days = mins / 1440;
  return days === 1 ? '1 day' : `${days} days`;
}

// In-memory web timeout tracker for browser development preview
const activeWebTimeouts = new Map<number, number>();

function scheduleWebTimeouts(items: ScheduledItem[]) {
  // Clear previous
  activeWebTimeouts.forEach((handle) => clearTimeout(handle));
  activeWebTimeouts.clear();

  const now = Date.now();
  items.forEach((item) => {
    const delay = item.scheduleDate.getTime() - now;
    // Only schedule if within next 2 hours for in-memory browser tab
    if (delay > 0 && delay < 2 * 3600 * 1000) {
      const handle = window.setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(item.title, {
              body: item.body,
              icon: '/favicon.ico',
            });
          } catch {
            // ignore
          }
        }
      }, delay);
      activeWebTimeouts.set(item.id, handle);
    }
  });
}
