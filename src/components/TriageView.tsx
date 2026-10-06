import React, { useState, useMemo } from 'react';
import {
  PlayCircle,
  Lock,
  FileText,
  Clock,
  Calendar,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import {
  calculateTaskPriority,
  formatHoursAway,
  formatAppleDate,
  formatHardMaxHours,
} from '../utils/priority';
import { Task, TaskColumn, ImportanceLevel } from '../types/todo';
import { celebrateTaskCompletion } from '../utils/celebration';

export const TriageView: React.FC = () => {
  const {
    tasks,
    settings,
    userLocation,
    openTaskModal,
    initiateDragToColumn,
    confirmMoveToInProgress,
    confirmMoveToStuck,
    cancelColumnMove,
    pendingDragTask,
    isProgressPromptOpen,
    isStuckPromptOpen,
    toggleTaskCompleted,
  } = useTodo();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskColumn | null>(null);

  // Modals state for drag actions
  const [inProgressNote, setInProgressNote] = useState('');
  const [blockerTitle, setBlockerTitle] = useState('');
  const [blockerImportance, setBlockerImportance] = useState<ImportanceLevel>('high');

  // Filter tasks with priority scores
  const tasksWithPriority = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && !t.parentId) // Only top-level uncompleted tasks
      .map((task) => {
        const priority = calculateTaskPriority(task, settings, userLocation);
        return { task, priority };
      })
      .sort((a, b) => a.priority.score - b.priority.score);
  }, [tasks, settings, userLocation]);

  // Tasks qualified for Triage (score <= triageThresholdHours)
  const triageCards = useMemo(() => {
    return tasksWithPriority
      .filter((item) => item.priority.score <= settings.triageThresholdHours)
      .slice(0, settings.maxTriageCardsDesktop);
  }, [tasksWithPriority, settings]);

  // Column lists
  const todoTasks = useMemo(
    () => tasksWithPriority.filter((item) => item.task.column === 'todo'),
    [tasksWithPriority]
  );
  const inProgressTasks = useMemo(
    () => tasksWithPriority.filter((item) => item.task.column === 'in_progress'),
    [tasksWithPriority]
  );
  const stuckTasks = useMemo(
    () => tasksWithPriority.filter((item) => item.task.column === 'stuck'),
    [tasksWithPriority]
  );

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, col: TaskColumn) => {
    e.preventDefault();
    setActiveDropColumn(col);
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: TaskColumn) => {
    e.preventDefault();
    setActiveDropColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.column !== targetCol) {
      initiateDragToColumn(task, targetCol);
    }
    setDraggedTaskId(null);
  };

  // Toned-down, calm urgency tint (no loud gradients)
  const getUrgencyCardStyle = (score: number) => {
    if (score <= 8) {
      return 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/50 text-neutral-900 dark:text-neutral-100';
    }
    if (score <= 18) {
      return 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/50 text-neutral-900 dark:text-neutral-100';
    }
    return 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/50 text-neutral-900 dark:text-neutral-100';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/40 dark:bg-neutral-950 overflow-y-auto">
      {/* SECTION 1: Top Triage Rail */}
      <div className="p-4 sm:p-5 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-900/60">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Triage Deck
            </h2>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            {triageCards.length} focus items
          </span>
        </div>

        {/* Responsive Triage Cards Deck: wraps on desktop/tablet so no items get pushed offscreen */}
        <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
          {triageCards.length === 0 ? (
            <div className="py-5 px-4 text-center w-full text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
              No tasks currently under the {settings.triageThresholdHours}h triage threshold.
            </div>
          ) : (
            triageCards.map(({ task, priority }) => (
              <div
                key={task.id}
                onClick={() => openTaskModal(task.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className={`flex-1 min-w-[200px] max-w-full sm:max-w-[280px] p-3 rounded-xl border shadow-2xs cursor-grab active:cursor-grabbing transition hover:shadow-xs ${getUrgencyCardStyle(
                  priority.score
                )}`}
              >
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  <span className="uppercase text-xs tracking-wider font-semibold">
                    {task.column.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {task.dueDate && <Clock className="w-3 h-3 opacity-60 text-rose-500" />}
                    <span>{formatHoursAway(priority.score)}</span>
                    {task.dueDate && (
                      <span className="opacity-75 font-normal text-[11px]">
                        ({formatHardMaxHours((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60))})
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                  {task.title}
                </h3>

                {task.description && (
                  <p className="text-xs mt-1 line-clamp-1 text-neutral-500 dark:text-neutral-400">
                    {task.description}
                  </p>
                )}

                <div className="mt-2.5 pt-1.5 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{formatAppleDate(priority.presumedDueDate)}</span>
                  <span className="capitalize font-medium">{task.importance.replace('_', ' ')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: Kanban 3 Lists (Todo, In Progress, Stuck) - Responsive grid that wraps cleanly under zoom */}
      <div className="flex-1 p-3 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 min-h-[350px]">
        {/* LIST 1: TODO */}
        <div
          onDragOver={(e) => handleDragOver(e, 'todo')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'todo')}
          className={`flex flex-col rounded-2xl border p-3.5 bg-neutral-100/40 dark:bg-neutral-900/20 border-neutral-200/70 dark:border-neutral-800/70 transition-colors ${
            activeDropColumn === 'todo' ? 'ring-2 ring-neutral-400 bg-neutral-100 dark:bg-neutral-800/40' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200/50 dark:border-neutral-800/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400/80" />
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                To Do
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {todoTasks.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {todoTasks.map(({ task, priority }) => (
              <KanbanCard
                key={task.id}
                task={task}
                priorityDate={task.dueDate || priority.presumedDueDate}
                isHardDueDate={!!task.dueDate}
                hoursAway={priority.score}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => openTaskModal(task.id)}
              />
            ))}
          </div>
        </div>

        {/* LIST 2: IN PROGRESS */}
        <div
          onDragOver={(e) => handleDragOver(e, 'in_progress')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'in_progress')}
          className={`flex flex-col rounded-2xl border p-3.5 bg-neutral-100/40 dark:bg-neutral-900/20 border-neutral-200/70 dark:border-neutral-800/70 transition-colors ${
            activeDropColumn === 'in_progress' ? 'ring-2 ring-neutral-400 bg-neutral-100 dark:bg-neutral-800/40' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200/50 dark:border-neutral-800/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400/80" />
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                In Progress
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {inProgressTasks.map(({ task, priority }) => (
              <KanbanCard
                key={task.id}
                task={task}
                priorityDate={task.dueDate || priority.presumedDueDate}
                isHardDueDate={!!task.dueDate}
                hoursAway={priority.score}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => openTaskModal(task.id)}
              />
            ))}
          </div>
        </div>

        {/* LIST 3: STUCK */}
        <div
          onDragOver={(e) => handleDragOver(e, 'stuck')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'stuck')}
          className={`flex flex-col rounded-2xl border p-3.5 bg-neutral-100/40 dark:bg-neutral-900/20 border-neutral-200/70 dark:border-neutral-800/70 transition-colors ${
            activeDropColumn === 'stuck' ? 'ring-2 ring-neutral-400 bg-neutral-100 dark:bg-neutral-800/40' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200/50 dark:border-neutral-800/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400/80" />
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Stuck
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {stuckTasks.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {stuckTasks.map(({ task, priority }) => (
              <KanbanCard
                key={task.id}
                task={task}
                priorityDate={task.dueDate || priority.presumedDueDate}
                isHardDueDate={!!task.dueDate}
                hoursAway={priority.score}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => openTaskModal(task.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: In Progress Prompt (Triggered exclusively by drag to In Progress) */}
      {isProgressPromptOpen && pendingDragTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md p-5 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-3.5">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
              <PlayCircle className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm">
                Move to In Progress
              </h3>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Moving &quot;{pendingDragTask.title}&quot; to In Progress.
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                What&apos;s been done already? (Optional note)
              </label>
              <textarea
                rows={3}
                placeholder="Log notes on work started..."
                value={inProgressNote}
                onChange={(e) => setInProgressNote(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            {/* Sub-items preview */}
            {tasks.filter((t) => t.parentId === pendingDragTask.id).length > 0 && (
              <div>
                <span className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Sub-tasks:
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {tasks
                    .filter((t) => t.parentId === pendingDragTask.id)
                    .map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={(e) => {
                            if (!st.completed) {
                              celebrateTaskCompletion(e.currentTarget as HTMLElement);
                            }
                            toggleTaskCompleted(st.id);
                          }}
                          className="rounded border-neutral-300 text-blue-600"
                        />
                        <span className={st.completed ? 'line-through text-neutral-400' : ''}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelColumnMove}
                className="px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmMoveToInProgress(pendingDragTask.id, inProgressNote);
                  setInProgressNote('');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg transition"
              >
                Move to In Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Stuck Prompt (Triggered exclusively by drag to Stuck) */}
      {isStuckPromptOpen && pendingDragTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md p-5 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-3.5">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
              <Lock className="w-4 h-4 text-rose-500" />
              <h3 className="font-semibold text-sm">
                Mark as Stuck & Create Blocker
              </h3>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Define the task blocking &quot;{pendingDragTask.title}&quot;. When this blocker completes,
              it will automatically move this task back to To Do.
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Blocker Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wait for client approval, order parts..."
                value={blockerTitle}
                onChange={(e) => setBlockerTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Blocker Importance
              </label>
              <select
                value={blockerImportance}
                onChange={(e) => setBlockerImportance(e.target.value as ImportanceLevel)}
                className="w-full text-xs p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="do_now">Do Now</option>
                <option value="med">Med</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelColumnMove}
                className="px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!blockerTitle.trim()}
                onClick={() => {
                  confirmMoveToStuck(pendingDragTask.id, blockerTitle, blockerImportance);
                  setBlockerTitle('');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50 rounded-lg transition"
              >
                Link Blocker & Mark Stuck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface KanbanCardProps {
  task: Task;
  priorityDate: string;
  isHardDueDate: boolean;
  hoursAway: number;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  priorityDate,
  isHardDueDate,
  hoursAway,
  onDragStart,
  onClick,
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-3 rounded-xl bg-white dark:bg-neutral-900 shadow-2xs border border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-grab active:cursor-grabbing transition"
    >
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
        <span className="capitalize font-medium">{task.importance.replace('_', ' ')}</span>
        <div className="flex items-center gap-1 font-mono">
          {isHardDueDate && <Clock className="w-3 h-3 opacity-60 text-rose-500" />}
          <span>{formatHoursAway(hoursAway)}</span>
          {task.dueDate && (
            <span className="opacity-75 font-normal text-[11px]">
              ({formatHardMaxHours((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60))})
            </span>
          )}
        </div>
      </div>

      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1">
          {task.description}
        </p>
      )}

      {/* Due Date Indicator (Shows calculated date, with hard max noted in header) */}
      <div className="mt-2 text-xs text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatAppleDate(priorityDate)}
        </span>
        {task.progressNotes && task.progressNotes.length > 0 && (
          <span className="flex items-center gap-0.5 font-medium">
            <FileText className="w-3 h-3" />
            {task.progressNotes.length}
          </span>
        )}
      </div>

      {/* Blocker Badge */}
      {task.blockedByTaskId && (
        <div className="mt-2 text-xs flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
          <Lock className="w-3 h-3" />
          Blocked by linked task
        </div>
      )}
    </div>
  );
};
