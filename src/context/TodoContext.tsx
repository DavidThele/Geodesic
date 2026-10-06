import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { App as CapApp } from '@capacitor/app';
import { Task, TaskColumn, ImportanceLevel } from '../types/todo';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { INITIAL_TASKS } from '../data/initialTasks';
import { calculateDistanceMiles } from '../utils/priority';
import {
  scheduleTaskNotifications,
  requestNotificationPermission,
  checkNotificationPermission,
} from '../utils/notifications';
import {
  syncWidgetData,
  forceReloadWidgets,
  WidgetDataPayload,
} from '../utils/widgetSync';

const TASKS_STORAGE_KEY = 'geodesic_tasks_v1';
const SETTINGS_STORAGE_KEY = 'geodesic_settings_v1';
const LEGACY_TASKS_STORAGE_KEY = 'chronos_tasks_v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'chronos_settings_v1';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
}

interface TodoContextType {
  tasks: Task[];
  settings: AppSettings;
  userLocation: { lat: number; lng: number; name?: string } | null;
  locationError: string | null;
  toasts: NotificationToast[];
  selectedTaskId: string | null;
  isTaskModalOpen: boolean;
  isEditingTask: boolean;
  activeView: 'priority' | 'calendar' | 'triage' | 'map';
  isSettingsOpen: boolean;
  isMiniWidgetOpen: boolean;
  isCompletedMenuOpen: boolean;
  isProgressPromptOpen: boolean;
  isStuckPromptOpen: boolean;
  pendingDragTask: Task | null;
  lastSyncTime: string | null;
  isSyncing: boolean;
  notificationPermissionGranted: boolean;
  widgetDataPayload: WidgetDataPayload | null;
  
  // Actions
  setActiveView: (view: 'priority' | 'calendar' | 'triage' | 'map') => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsMiniWidgetOpen: (open: boolean) => void;
  setIsCompletedMenuOpen: (open: boolean) => void;
  openTaskModal: (taskId?: string, editMode?: boolean) => void;
  closeTaskModal: () => void;
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'alert') => void;
  requestNotificationAccess: () => Promise<boolean>;
  rescheduleNotifications: () => Promise<number>;
  reloadWidgets: () => Promise<boolean>;
  
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'progressNotes'>, subtaskTitles?: string[]) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompleted: (id: string, skipSubtaskConfirmation?: boolean) => { needConfirmation: boolean; remainingSubtasksCount: number };
  batchCompleteSubtasks: (parentId: string) => void;
  
  // Kanban & Triage Drag actions
  initiateDragToColumn: (task: Task, targetColumn: TaskColumn) => void;
  confirmMoveToInProgress: (taskId: string, progressNote: string) => void;
  confirmMoveToStuck: (taskId: string, blockerTaskTitle: string, blockerImportance: ImportanceLevel) => void;
  cancelColumnMove: () => void;
  
  // Settings & Location
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  refreshLocation: () => void;
  setSimulatedLocation: (loc: { lat: number; lng: number; name: string } | null) => void;
  
  // iCloud Sync & Backup
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
  saveToICloudDrive: () => Promise<boolean>;
  syncFromICloudDrive: () => Promise<boolean>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load tasks from localStorage or initial demo data
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY) || localStorage.getItem(LEGACY_TASKS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_TASKS;
  });

  // Load settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [activeView, setActiveView] = useState<'priority' | 'calendar' | 'triage' | 'map'>('priority');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMiniWidgetOpen, setIsMiniWidgetOpen] = useState(false);
  const [isCompletedMenuOpen, setIsCompletedMenuOpen] = useState(false);

  // Kanban drag prompts
  const [pendingDragTask, setPendingDragTask] = useState<Task | null>(null);
  const [isProgressPromptOpen, setIsProgressPromptOpen] = useState(false);
  const [isStuckPromptOpen, setIsStuckPromptOpen] = useState(false);

  // Notifications / toasts
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  // User location
  const [realUserLocation, setRealUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [notifiedTaskIdsInProximity, setNotifiedTaskIdsInProximity] = useState<Set<string>>(new Set());

  // Sync state
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const [widgetDataPayload, setWidgetDataPayload] = useState<WidgetDataPayload | null>(null);

  // Refs for debounced saving
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Determine effective user location (simulated overrides real if set)
  const effectiveUserLocation = settings.simulatedUserLocation || realUserLocation;

  // Persist tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Handle dark mode / theme & UI Scale
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply true global UI zoom (scales text, icons, buttons, padding, modals, speed dials, floating controls)
    const scale = settings.uiScale || 1.0;
    // Set standard zoom property (supported natively in WebKit / Safari / Mac iPad mode)
    (document.documentElement.style as unknown as Record<string, string>).zoom = `${scale}`;
    // Also adjust root font-size as fallback
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [settings.theme, settings.uiScale]);

  // Show toast notification
  const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Request native Capacitor / browser geolocation with explicit permission prompt
  const refreshLocation = useCallback(async () => {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const requested = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (requested.location !== 'granted') {
          setLocationError('Location permission denied in iOS Settings');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      if (position?.coords) {
        setRealUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
        return;
      }
    } catch {
      // Fall through to browser standard geolocation
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported on this device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRealUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  // Auto request location and notifications on launch
  useEffect(() => {
    refreshLocation();
    checkNotificationPermission().then((granted) => {
      setNotificationPermissionGranted(granted);
      if (!granted) {
        requestNotificationPermission().then((res) => {
          setNotificationPermissionGranted(res);
        });
      }
    });
  }, [refreshLocation]);

  // Watch position continuously
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setRealUserLocation((prev) => {
          if (!prev) {
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
          const latDiff = Math.abs(prev.lat - pos.coords.latitude);
          const lngDiff = Math.abs(prev.lng - pos.coords.longitude);
          if (latDiff > 0.0002 || lngDiff > 0.0002) {
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
          return prev;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [refreshLocation]);

  // Proximity alerting (e.g. within 1 mile of a task)
  useEffect(() => {
    if (!effectiveUserLocation) return;
    const alertRadius = settings.proximityAlertRadiusMiles;

    tasks.forEach((task) => {
      if (task.completed || !task.location) return;
      const dist = calculateDistanceMiles(
        effectiveUserLocation.lat,
        effectiveUserLocation.lng,
        task.location.lat,
        task.location.lng
      );

      if (dist <= alertRadius && !notifiedTaskIdsInProximity.has(task.id)) {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Nearby Task Alert', {
              body: `You are near "${task.title}" (${task.location.name})`,
              icon: '/favicon.ico',
            });
          } catch {
            // ignore
          }
        }
        setNotifiedTaskIdsInProximity((prev) => new Set(prev).add(task.id));
      }
    });
  }, [effectiveUserLocation, tasks, settings.proximityAlertRadiusMiles, notifiedTaskIdsInProximity]);

  // Export Data JSON helper
  const exportDataJSON = useCallback(() => {
    const payload = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      tasks: tasksRef.current,
      settings: settingsRef.current,
    };
    return JSON.stringify(payload, null, 2);
  }, []);

  // Import Data JSON helper
  const importDataJSON = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        setTasks(parsed.tasks);
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        setSettings((prev) => ({ ...prev, ...parsed.settings }));
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Direct File Auto-Sync: Write tasks directly to Filesystem (Documents directory -> shared with Files / iCloud Drive)
  const writeTasksToFile = useCallback(async (): Promise<boolean> => {
    if (!settingsRef.current.autoSyncICloud) return false;
    const fileName = settingsRef.current.autoSyncFileName || 'geodesic-tasks-backup.json';
    const jsonContent = exportDataJSON();

    try {
      // 1. Write via Capacitor Filesystem (works natively on iOS inside Documents directory)
      await Filesystem.writeFile({
        path: fileName,
        data: jsonContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      return true;
    } catch {
      // Web fallback: Keep in localStorage
      return false;
    }
  }, [exportDataJSON]);

  // Direct File Auto-Sync: Read tasks directly from Filesystem on app launch or foreground
  const readTasksFromFile = useCallback(async (): Promise<boolean> => {
    if (!settingsRef.current.autoSyncICloud) return false;
    const fileName = settingsRef.current.autoSyncFileName || 'geodesic-tasks-backup.json';

    try {
      let result;
      try {
        result = await Filesystem.readFile({
          path: fileName,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      } catch {
        // Fallback to legacy file name if upgrading from Chronos
        result = await Filesystem.readFile({
          path: 'chronos-tasks-backup.json',
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      }

      if (typeof result.data === 'string' && result.data.trim().length > 0) {
        const parsed = JSON.parse(result.data);
        if (parsed?.tasks && Array.isArray(parsed.tasks)) {
          // If the file on disk has newer changes, update state
          setTasks(parsed.tasks);
          if (parsed.settings) {
            setSettings((prev) => ({ ...prev, ...parsed.settings }));
          }
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          return true;
        }
      }
    } catch {
      // File may not exist yet on very first launch; write initial state
      writeTasksToFile();
    }
    return false;
  }, [writeTasksToFile]);

  // Load from file on launch & when app returns to foreground
  useEffect(() => {
    readTasksFromFile();

    // Listen to native app state change: when user returns to app, reload any updates from disk
    let appStateListener: { remove: () => void } | null = null;
    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        readTasksFromFile();
      } else {
        // App backgrounded: write immediately!
        writeTasksToFile();
      }
    }).then((handler) => {
      appStateListener = handler;
    }).catch(() => {});

    return () => {
      if (appStateListener) appStateListener.remove();
    };
  }, [readTasksFromFile, writeTasksToFile]);

  // Auto-save debounced whenever tasks or settings change (1.5s debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      writeTasksToFile();
    }, 1500);
    return () => clearTimeout(timer);
  }, [tasks, settings, writeTasksToFile]);

  // Automatically update Home Screen & Lock Screen widget data and schedule notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      scheduleTaskNotifications(tasks, settings, effectiveUserLocation);
      syncWidgetData(tasks, settings, effectiveUserLocation).then((payload) => {
        setWidgetDataPayload(payload);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [tasks, settings, effectiveUserLocation]);

  // Periodic background heartbeat auto-sync (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      writeTasksToFile();
    }, 10000);
    return () => clearInterval(interval);
  }, [writeTasksToFile]);

  const requestNotificationAccess = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setNotificationPermissionGranted(granted);
    if (granted) {
      await scheduleTaskNotifications(tasksRef.current, settingsRef.current, effectiveUserLocation);
      showToast('Notifications Enabled', '15m and 1h alerts scheduled for all active deadlines', 'success');
    } else {
      showToast('Notifications Disabled', 'Please allow notification permissions in Settings', 'alert');
    }
    return granted;
  }, [effectiveUserLocation, showToast]);

  const rescheduleNotifications = useCallback(async (): Promise<number> => {
    return await scheduleTaskNotifications(tasksRef.current, settingsRef.current, effectiveUserLocation);
  }, [effectiveUserLocation]);

  const reloadWidgets = useCallback(async (): Promise<boolean> => {
    const payload = await syncWidgetData(tasksRef.current, settingsRef.current, effectiveUserLocation);
    setWidgetDataPayload(payload);
    const success = await forceReloadWidgets();
    showToast('Widgets Refreshed', `Synchronized ${payload.totalActiveCount} tasks to Home & Lock Screen`, 'success');
    return success;
  }, [effectiveUserLocation, showToast]);

  // Manual trigger for Settings UI
  const saveToICloudDrive = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    const success = await writeTasksToFile();
    setIsSyncing(false);
    return success;
  }, [writeTasksToFile]);

  const syncFromICloudDrive = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    const success = await readTasksFromFile();
    setIsSyncing(false);
    return success;
  }, [readTasksFromFile]);

  // Task creation
  const addTask = useCallback(
    (
      data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'progressNotes'>,
      subtaskTitles: string[] = []
    ): Task => {
      const newId = `task-${Date.now()}`;
      const nowStr = new Date().toISOString();

      const newTask: Task = {
        ...data,
        id: newId,
        progressNotes: [],
        createdAt: nowStr,
        updatedAt: nowStr,
      };

      const newSubtasks: Task[] = subtaskTitles
        .filter((t) => t.trim().length > 0)
        .map((subTitle, idx) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: subTitle.trim(),
          parentId: newId,
          importance: data.importance,
          completed: false,
          column: data.column,
          progressNotes: [],
          createdAt: nowStr,
          updatedAt: nowStr,
        }));

      setTasks((prev) => [...prev, newTask, ...newSubtasks]);
      return newTask;
    },
    []
  );

  // Update task
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
  }, []);

  // Delete task
  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        return prev.filter((t) => t.id !== id && t.parentId !== id);
      });
      if (selectedTaskId === id) {
        closeTaskModal();
      }
    },
    [selectedTaskId]
  );

  // Toggle completion with subtask unblocking
  const toggleTaskCompleted = useCallback(
    (id: string, skipSubtaskConfirmation: boolean = false) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return { needConfirmation: false, remainingSubtasksCount: 0 };

      if (!target.completed && !target.parentId) {
        const remainingSubtasks = tasks.filter((t) => t.parentId === id && !t.completed);
        if (remainingSubtasks.length > 0 && !skipSubtaskConfirmation) {
          return { needConfirmation: true, remainingSubtasksCount: remainingSubtasks.length };
        }
      }

      const nextCompleted = !target.completed;
      const nowStr = new Date().toISOString();

      setTasks((prev) => {
        return prev.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? nowStr : undefined,
              updatedAt: nowStr,
            };
          }
          return t;
        });
      });

      if (nextCompleted) {
        const blockedTask = tasks.find((t) => t.blockedByTaskId === id);
        if (blockedTask) {
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id === blockedTask.id) {
                return {
                  ...t,
                  column: 'todo',
                  blockedByTaskId: null,
                  updatedAt: nowStr,
                };
              }
              return t;
            })
          );
        }
      }

      return { needConfirmation: false, remainingSubtasksCount: 0 };
    },
    [tasks]
  );

  // Batch complete subtasks
  const batchCompleteSubtasks = useCallback(
    (parentId: string) => {
      const nowStr = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.parentId === parentId && !t.completed) {
            return {
              ...t,
              completed: true,
              completedAt: nowStr,
              updatedAt: nowStr,
            };
          }
          return t;
        })
      );
    },
    []
  );

  // Kanban prompts
  const initiateDragToColumn = useCallback((task: Task, targetColumn: TaskColumn) => {
    if (targetColumn === 'in_progress' && task.column !== 'in_progress') {
      setPendingDragTask(task);
      setIsProgressPromptOpen(true);
    } else if (targetColumn === 'stuck' && task.column !== 'stuck') {
      setPendingDragTask(task);
      setIsStuckPromptOpen(true);
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, column: targetColumn, updatedAt: new Date().toISOString() } : t
        )
      );
    }
  }, []);

  const confirmMoveToInProgress = useCallback(
    (taskId: string, progressNote: string) => {
      const nowStr = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const noteObj = {
              id: `note-${Date.now()}`,
              timestamp: nowStr,
              note: progressNote.trim(),
            };
            return {
              ...t,
              column: 'in_progress' as TaskColumn,
              progressNotes: [...t.progressNotes, noteObj],
              updatedAt: nowStr,
            };
          }
          return t;
        })
      );
      setIsProgressPromptOpen(false);
      setPendingDragTask(null);
    },
    []
  );

  const confirmMoveToStuck = useCallback(
    (taskId: string, blockerTaskTitle: string, blockerImportance: ImportanceLevel) => {
      const nowStr = new Date().toISOString();
      const blockerId = `task-${Date.now()}-blocker`;
      const stuckTask = tasks.find((t) => t.id === taskId);

      const blockerTask: Task = {
        id: blockerId,
        title: blockerTaskTitle.trim(),
        description: `Unblocks "${stuckTask?.title || 'task'}"`,
        importance: blockerImportance,
        completed: false,
        column: 'todo',
        progressNotes: [],
        createdAt: nowStr,
        updatedAt: nowStr,
      };

      setTasks((prev) => [
        ...prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              column: 'stuck' as TaskColumn,
              blockedByTaskId: blockerId,
              updatedAt: nowStr,
            };
          }
          return t;
        }),
        blockerTask,
      ]);

      setIsStuckPromptOpen(false);
      setPendingDragTask(null);
    },
    [tasks]
  );

  const cancelColumnMove = useCallback(() => {
    setIsProgressPromptOpen(false);
    setIsStuckPromptOpen(false);
    setPendingDragTask(null);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const setSimulatedLocation = useCallback((loc: { lat: number; lng: number; name: string } | null) => {
    setSettings((prev) => ({
      ...prev,
      simulatedUserLocation: loc,
    }));
  }, []);

  const openTaskModal = useCallback((taskId?: string, editMode: boolean = false) => {
    setSelectedTaskId(taskId || null);
    setIsEditingTask(editMode);
    setIsTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTaskId(null);
    setIsEditingTask(false);
  }, []);

  return (
    <TodoContext.Provider
      value={{
        tasks,
        settings,
        userLocation: effectiveUserLocation,
        locationError,
        toasts,
        selectedTaskId,
        isTaskModalOpen,
        isEditingTask,
        activeView,
        isSettingsOpen,
        isMiniWidgetOpen,
        isCompletedMenuOpen,
        isProgressPromptOpen,
        isStuckPromptOpen,
        pendingDragTask,
        lastSyncTime,
        isSyncing,
        notificationPermissionGranted,
        widgetDataPayload,
        setActiveView,
        setIsSettingsOpen,
        setIsMiniWidgetOpen,
        setIsCompletedMenuOpen,
        openTaskModal,
        closeTaskModal,
        dismissToast,
        showToast,
        requestNotificationAccess,
        rescheduleNotifications,
        reloadWidgets,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompleted,
        batchCompleteSubtasks,
        initiateDragToColumn,
        confirmMoveToInProgress,
        confirmMoveToStuck,
        cancelColumnMove,
        updateSettings,
        resetSettings,
        refreshLocation,
        setSimulatedLocation,
        exportDataJSON,
        importDataJSON,
        saveToICloudDrive,
        syncFromICloudDrive,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};
