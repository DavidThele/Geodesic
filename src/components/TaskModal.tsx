import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Lock,
  ChevronRight,
  ListTodo,
  Bell,
  BellRing,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { ImportanceLevel, TaskColumn, TaskLocation, TaskReminder } from '../types/todo';
import { calculateTaskPriority, formatHoursAway, formatAppleDate } from '../utils/priority';
import { celebrateTaskCompletion } from '../utils/celebration';
import { formatMinutesOffset } from '../utils/notifications';
import { MapLocationPicker } from './MapLocationPicker';

export const TaskModal: React.FC = () => {
  const {
    tasks,
    settings,
    userLocation,
    selectedTaskId,
    isTaskModalOpen,
    isEditingTask,
    closeTaskModal,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompleted,
    openTaskModal,
  } = useTodo();

  const isCreating = !selectedTaskId;
  const task = tasks.find((t) => t.id === selectedTaskId);
  const subtasks = tasks.filter((t) => t.parentId === selectedTaskId);
  const parentTask = task?.parentId ? tasks.find((t) => t.id === task.parentId) : null;
  const blockerTask = task?.blockedByTaskId ? tasks.find((t) => t.id === task.blockedByTaskId) : null;

  // Form State
  const [isEditing, setIsEditing] = useState(isEditingTask || isCreating);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [importance, setImportance] = useState<ImportanceLevel>('none');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(10);
  const [column, setColumn] = useState<TaskColumn>('todo');
  const [location, setLocation] = useState<TaskLocation | undefined>(undefined);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDrafts, setNewSubtaskDrafts] = useState<string[]>([]);

  // Notifications State
  const [customReminders, setCustomReminders] = useState<TaskReminder[]>([]);
  const [disableDefaultReminders, setDisableDefaultReminders] = useState<boolean>(false);
  const [newReminderMinutes, setNewReminderMinutes] = useState<number>(30); // 30 mins
  const [newReminderTarget, setNewReminderTarget] = useState<'calculated' | 'hard'>('calculated');
  const [isCustomMinutes, setIsCustomMinutes] = useState(false);
  const [customMinutesVal, setCustomMinutesVal] = useState('45');

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate ? task.dueDate.slice(0, 16) : '');
      setImportance(task.importance);
      setEstimatedMinutes(task.estimatedMinutes !== undefined ? task.estimatedMinutes : 10);
      setColumn(task.column);
      setLocation(task.location);
      setCustomReminders(task.customReminders || []);
      setDisableDefaultReminders(!!task.disableDefaultReminders);
      setIsEditing(isEditingTask);
    } else {
      // Creating new task
      setTitle('');
      setDescription('');
      setDueDate('');
      setImportance('none');
      setEstimatedMinutes(10);
      setColumn('todo');
      setLocation(undefined);
      setNewSubtaskDrafts([]);
      setCustomReminders([]);
      setDisableDefaultReminders(false);
      setIsEditing(true);
    }
  }, [task, isEditingTask, isCreating]);

  if (!isTaskModalOpen) return null;

  const priority = task ? calculateTaskPriority(task, settings, userLocation) : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const formattedDueDate = dueDate ? new Date(dueDate).toISOString() : undefined;

    if (isCreating) {
      addTask(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: formattedDueDate,
          importance,
          estimatedMinutes,
          completed: false,
          column,
          location,
          customReminders,
          disableDefaultReminders,
        },
        newSubtaskDrafts
      );
      closeTaskModal();
    } else if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: formattedDueDate,
        importance,
        estimatedMinutes,
        column,
        location,
        customReminders,
        disableDefaultReminders,
      });
      setIsEditing(false);
    }
  };

  const handleAddCustomReminder = () => {
    const mins = isCustomMinutes ? parseInt(customMinutesVal, 10) : newReminderMinutes;
    if (isNaN(mins) || mins <= 0) return;

    const newReminder: TaskReminder = {
      id: `rem-${Date.now()}`,
      minutesBefore: mins,
      target: dueDate && newReminderTarget === 'hard' ? 'hard' : 'calculated',
    };

    setCustomReminders((prev) => [...prev, newReminder]);
    setIsCustomMinutes(false);
  };

  const handleRemoveReminder = (id: string) => {
    setCustomReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddInlineSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    if (task) {
      addTask({
        title: newSubtaskTitle.trim(),
        parentId: task.id,
        importance: task.importance,
        completed: false,
        column: task.column,
      });
      setNewSubtaskTitle('');
    } else {
      setNewSubtaskDrafts((prev) => [...prev, newSubtaskTitle.trim()]);
      setNewSubtaskTitle('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
              {isCreating ? 'New Task' : isEditing ? 'Edit Task' : 'Task Details'}
            </span>
            {task && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  task.completed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {task.completed ? 'Completed' : task.column.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  title={isEditing ? 'Cancel Edit' : 'Edit Task'}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this task permanently?')) {
                      deleteTask(task!.id);
                    }
                  }}
                  title="Delete Task"
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={closeTaskModal}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-neutral-900 dark:text-neutral-100">
          {isEditing ? (
            /* EDIT / CREATE FORM */
            <form id="task-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-base font-medium px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional context, notes, details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-base sm:text-sm px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Hard Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-base sm:text-sm px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <span className="block text-[11px] text-neutral-400 mt-1">
                    If unset, defaults to {settings.defaultBaselineHours}h baseline
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Importance Value
                  </label>
                  <select
                    value={importance}
                    onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                    className="w-full text-base sm:text-sm px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="none">No priority (0h)</option>
                    <option value="low">Low (-{settings.importanceDeductions.low}h)</option>
                    <option value="med-low">Med-Low (-{settings.importanceDeductions['med-low']}h)</option>
                    <option value="med">Med (-{settings.importanceDeductions.med}h)</option>
                    <option value="med-high">Med-High (-{settings.importanceDeductions['med-high']}h)</option>
                    <option value="high">High (-{settings.importanceDeductions.high}h)</option>
                    <option value="urgent">Urgent (-{settings.importanceDeductions.urgent}h)</option>
                    <option value="do_now">Do Now (-{settings.importanceDeductions.do_now}h)</option>
                  </select>
                </div>
              </div>

              {/* Estimated Time to Complete */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Estimated Time to Complete
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={estimatedMinutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setEstimatedMinutes(isNaN(val) ? 0 : Math.max(1, val));
                      }}
                      className="w-28 text-base sm:text-sm px-3 py-2 pr-7 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                    />
                    <span className="absolute right-2.5 text-xs text-neutral-400 pointer-events-none">m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setEstimatedMinutes(mins)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          estimatedMinutes === mins
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
                <span className="block text-[11px] text-neutral-400 mt-1">
                  Quick wins (&le;10m) receive a priority boost to prevent task paralysis.
                </span>
              </div>

              {/* Map Location Picker */}
              <MapLocationPicker
                value={location}
                onChange={setLocation}
                currentUserLocation={userLocation}
              />

              {/* Push Alerts & Reminders */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    Push Alerts & Reminders
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      checked={!disableDefaultReminders}
                      onChange={(e) => setDisableDefaultReminders(!e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600 w-3.5 h-3.5"
                    />
                    <span>Default 15m & 1h Alerts</span>
                  </label>
                </div>

                {/* Subtask notification note */}
                {Boolean(task?.parentId) && !dueDate && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-400">
                    ℹ️ Subtask notifications only fire when a specific hard deadline is set.
                  </div>
                )}

                {/* Custom Reminders List */}
                {customReminders.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-neutral-400">
                      Additional Scheduled Alerts:
                    </span>
                    <div className="space-y-1">
                      {customReminders.map((rem) => (
                        <div
                          key={rem.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <BellRing className="w-3 h-3 text-blue-500" />
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">
                              {formatMinutesOffset(rem.minutesBefore)} before{' '}
                              {rem.target === 'hard' ? 'Hard Deadline' : 'Calculated Due Date'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveReminder(rem.id)}
                            className="text-neutral-400 hover:text-red-500 p-0.5 text-sm"
                            title="Remove alert"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Reminder Controls */}
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    + Add Custom Alert Time
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={isCustomMinutes ? 'custom' : newReminderMinutes}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomMinutes(true);
                        } else {
                          setIsCustomMinutes(false);
                          setNewReminderMinutes(parseInt(e.target.value, 10));
                        }
                      }}
                      className="text-base sm:text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    >
                      <option value={5}>5 mins before</option>
                      <option value={10}>10 mins before</option>
                      <option value={15}>15 mins before</option>
                      <option value={30}>30 mins before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                      <option value={240}>4 hours before</option>
                      <option value={1440}>1 day before</option>
                      <option value="custom">Custom minutes...</option>
                    </select>

                    {isCustomMinutes && (
                      <input
                        type="number"
                        min={1}
                        placeholder="Mins"
                        value={customMinutesVal}
                        onChange={(e) => setCustomMinutesVal(e.target.value)}
                        className="w-20 text-base sm:text-xs px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      />
                    )}

                    <select
                      value={newReminderTarget}
                      onChange={(e) => setNewReminderTarget(e.target.value as 'calculated' | 'hard')}
                      className="text-base sm:text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    >
                      <option value="calculated">Before Calculated Due Date</option>
                      {dueDate && <option value="hard">Before Hard Deadline</option>}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddCustomReminder}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                      Add Alert
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtasks addition during creation */}
              {isCreating && (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Sub-items ({newSubtaskDrafts.length})
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add sub-task..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInlineSubtask();
                        }
                      }}
                      className="flex-1 text-base sm:text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineSubtask}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300"
                    >
                      Add
                    </button>
                  </div>
                  {newSubtaskDrafts.length > 0 && (
                    <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300 pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
                      {newSubtaskDrafts.map((st, i) => (
                        <li key={i} className="flex items-center justify-between py-0.5">
                          <span>• {st}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewSubtaskDrafts((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-neutral-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
          ) : (
            /* VIEW MODE */
            <div className="space-y-6">
              {/* Linked Blocker Alert */}
              {blockerTask && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Blocked by:
                    </span>{' '}
                    <button
                      onClick={() => openTaskModal(blockerTask.id)}
                      className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      {blockerTask.title}
                    </button>
                    <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                      Completing this blocker task will automatically unblock this task back to Todo.
                    </p>
                  </div>
                </div>
              )}

              {/* Title & Description */}
              <div>
                {parentTask && (
                  <button
                    onClick={() => openTaskModal(parentTask.id)}
                    className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline flex items-center gap-1 mb-1"
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    Part of: {parentTask.title}
                  </button>
                )}
                <h2
                  className={`text-xl font-semibold tracking-tight ${
                    task?.completed ? 'line-through text-neutral-400 dark:text-neutral-500' : ''
                  }`}
                >
                  {task?.title}
                </h2>
                {task?.description && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Key Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-neutral-100 dark:border-neutral-800 text-xs">
                {/* Priority Score Breakdown */}
                <div>
                  <span className="block text-neutral-400 uppercase tracking-wider text-[10px]">
                    Priority Score
                  </span>
                  <span className="font-mono font-medium text-sm text-neutral-800 dark:text-neutral-200">
                    {priority ? `${priority.score.toFixed(1)}h` : '—'}
                  </span>
                </div>

                {/* Hard Due Date */}
                <div>
                  <span className="block text-neutral-400 uppercase tracking-wider text-[10px]">
                    Hard Due Date
                  </span>
                  {task?.dueDate ? (
                    <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatAppleDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-neutral-400 italic">None</span>
                  )}
                </div>

                {/* Presumed Due Date */}
                <div>
                  <span className="block text-neutral-400 uppercase tracking-wider text-[10px]">
                    Presumed Due
                  </span>
                  {priority ? (
                    <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatAppleDate(priority.presumedDueDate)} ({formatHoursAway(priority.score)})
                    </span>
                  ) : (
                    '—'
                  )}
                </div>

                {/* Importance */}
                <div>
                  <span className="block text-neutral-400 uppercase tracking-wider text-[10px]">
                    Importance
                  </span>
                  <span className="capitalize font-medium text-neutral-700 dark:text-neutral-300">
                    {task?.importance.replace('_', ' ')} (-
                    {priority?.importanceDeduction || 0}h)
                  </span>
                </div>

                {/* Est Duration */}
                <div>
                  <span className="block text-neutral-400 uppercase tracking-wider text-[10px]">
                    Est. Duration
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    {task?.estimatedMinutes !== undefined ? `${task.estimatedMinutes}m` : '10m'}
                    {(task?.estimatedMinutes ?? 10) <= 10 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Quick win)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Location display */}
              {task?.location && (
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {task.location.name}
                    </span>
                    {task.location.details && (
                      <span className="text-neutral-500 dark:text-neutral-400 ml-1.5">
                        · {task.location.details}
                      </span>
                    )}
                    {priority?.distanceMiles !== null && priority?.distanceMiles !== undefined && (
                      <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Distance from you: <span className="font-mono font-medium">{priority.distanceMiles.toFixed(1)} miles</span>
                        {priority.distanceAddition > 0 && ` (+${priority.distanceAddition.toFixed(1)}h score adjustment)`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Active Notifications Summary */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex items-start gap-3">
                <Bell className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Scheduled Alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Configure
                    </button>
                  </div>
                  {task?.parentId && !task.dueDate ? (
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Subtasks without a hard deadline do not trigger push notifications.
                    </p>
                  ) : (
                    <div className="mt-1 space-y-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                      {!task?.disableDefaultReminders && (
                        <div>• Default 15m & 1h alerts before calculated due date{task?.dueDate ? ' & hard deadline' : ''}</div>
                      )}
                      {task?.customReminders && task.customReminders.length > 0 && (
                        task.customReminders.map((r) => (
                          <div key={r.id}>
                            • {formatMinutesOffset(r.minutesBefore)} before {r.target === 'hard' ? 'Hard Deadline' : 'Calculated Due Date'}
                          </div>
                        ))
                      )}
                      {task?.disableDefaultReminders && (!task?.customReminders || task.customReminders.length === 0) && (
                        <div className="text-neutral-400 italic">No alerts scheduled for this task.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-items Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5" />
                    Sub-tasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                  </h3>
                </div>

                <div className="space-y-1.5">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={(e) => {
                            if (!st.completed) {
                              celebrateTaskCompletion(e.currentTarget as HTMLElement);
                            }
                            toggleTaskCompleted(st.id);
                          }}
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className={`text-xs truncate ${
                            st.completed ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {st.title}
                        </span>
                      </label>
                      <button
                        onClick={() => openTaskModal(st.id)}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1"
                        title="View subtask"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Quick Add Subtask in View Mode */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add sub-task..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInlineSubtask();
                        }
                      }}
                      className="flex-1 text-base sm:text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineSubtask}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress & Work Log */}
              {task?.progressNotes && task.progressNotes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    Work Progress Log ({task.progressNotes.length})
                  </h3>
                  <div className="space-y-2">
                    {task.progressNotes.map((pn) => (
                      <div
                        key={pn.id}
                        className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs"
                      >
                        <div className="text-[10px] text-neutral-400 font-mono mb-1">
                          {formatAppleDate(pn.timestamp)}
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {pn.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            {!isCreating && task && (
              <button
                type="button"
                onClick={(e) => {
                  if (!task.completed) {
                    celebrateTaskCompletion(e.currentTarget as HTMLElement);
                  }
                  toggleTaskCompleted(task.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  task.completed
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {task.completed ? 'Mark Incomplete' : 'Complete Task'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeTaskModal}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition"
            >
              Close
            </button>
            {isEditing && (
              <button
                type="submit"
                form="task-form"
                className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg transition"
              >
                {isCreating ? 'Create Task' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
