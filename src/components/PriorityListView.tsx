import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Clock,
  MapPin,
  Lock,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import {
  buildDisplayEntries,
  formatHoursAway,
  formatAppleDate,
  formatHardMaxHours,
} from '../utils/priority';
import { TaskBubble } from './TaskBubble';
import { DisplayTaskEntry, Task } from '../types/todo';
import { celebrateTaskCompletion } from '../utils/celebration';

export const PriorityListView: React.FC = () => {
  const {
    tasks,
    settings,
    userLocation,
    openTaskModal,
    toggleTaskCompleted,
    batchCompleteSubtasks,
  } = useTodo();

  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Parent task batch completion confirmation state
  const [confirmationTarget, setConfirmationTarget] = useState<{
    task: Task;
    remainingCount: number;
  } | null>(null);

  // Generate display entries (both yellow priority & red hard-due dates)
  const displayEntries = useMemo(() => {
    return buildDisplayEntries(tasks, settings, userLocation);
  }, [tasks, settings, userLocation]);

  const toggleExpand = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleBubbleClick = (e: React.MouseEvent, entry: DisplayTaskEntry) => {
    e.stopPropagation();
    if (!entry.task.completed) {
      celebrateTaskCompletion(e.currentTarget as HTMLElement);
    }
    const result = toggleTaskCompleted(entry.task.id);
    if (result.needConfirmation) {
      setConfirmationTarget({
        task: entry.task,
        remainingCount: result.remainingSubtasksCount,
      });
    }
  };

  // Helper to determine slight tint based on hours away
  // < 24h (including overdue): slight red tint
  // < 48h: slight yellow tint
  // >= 48h: quiet neutral
  const getDueDateTintClass = (hoursAway: number) => {
    if (hoursAway < 24) {
      return 'text-red-700 dark:text-red-300 bg-red-500/10 dark:bg-red-500/15 border-red-500/20';
    }
    if (hoursAway < 48) {
      return 'text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20';
    }
    return 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/80 border-neutral-200/60 dark:border-neutral-700/60';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-neutral-950">
      {/* Priority Queue items - Clean full screen list (5px left margin on mobile, comfortable on tablet/desktop) */}
      <div className="flex-1 overflow-y-auto pl-[5px] pr-2 sm:px-8 py-4 sm:py-5 divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {displayEntries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              No tasks in your queue.
            </p>
          </div>
        ) : (
          displayEntries.map((entry) => {
            const subtasks = tasks.filter((t) => t.parentId === entry.task.id);
            const completedSubtasks = subtasks.filter((s) => s.completed).length;
            const hasSubtasks = subtasks.length > 0;
            const isExpanded = expandedTaskIds.has(entry.task.id);
            const isHardDueDate = entry.type === 'red';
            const parentTask = entry.task.parentId ? tasks.find((t) => t.id === entry.task.parentId) : null;

            return (
              <div key={entry.displayId} className="py-2 group">
                <div
                  onClick={() => openTaskModal(entry.task.id)}
                  className="flex items-center justify-between gap-2.5 p-1 sm:p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  {/* Left: Bubble + Expand Arrow + Title */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Completion Bubble (front and center, right at ~5px margin) */}
                    <TaskBubble
                      completed={entry.task.completed}
                      totalSubtasks={subtasks.length}
                      completedSubtasks={completedSubtasks}
                      onClick={(e) => handleBubbleClick(e, entry)}
                      size="md"
                    />

                    {/* Expand Arrow for Subtasks */}
                    {hasSubtasks ? (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(e, entry.task.id)}
                        className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition shrink-0"
                        title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : null}

                    {/* Task Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {entry.isSubtask && (
                          <span
                            className="text-[10px] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 inline-flex items-center gap-1 shrink-0"
                            title={parentTask ? `Subtask of: ${parentTask.title}` : 'Subtask'}
                          >
                            <span>Subtask</span>
                            {parentTask && (
                              <span className="opacity-75 max-w-[100px] sm:max-w-[140px] truncate">
                                · {parentTask.title}
                              </span>
                            )}
                          </span>
                        )}
                        <span
                          className={`text-sm font-medium tracking-tight truncate ${
                            entry.task.completed
                              ? 'line-through text-neutral-400 dark:text-neutral-500'
                              : 'text-neutral-900 dark:text-neutral-100'
                          }`}
                        >
                          {entry.task.title}
                        </span>

                        {/* Blocker indicator */}
                        {entry.task.blockedByTaskId && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Lock className="w-3 h-3" />
                            Blocked
                          </span>
                        )}

                        {/* Location indicator */}
                        {entry.task.location && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            {entry.task.location.name}
                          </span>
                        )}
                      </div>

                      {/* Quiet metadata description */}
                      {entry.task.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 max-w-xl">
                          {entry.task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Stacked Due Date (Calculated date on top, In Xh (Yh max) on bottom) */}
                  <div className="flex items-center shrink-0 ml-1">
                    <div
                      className={`flex flex-col items-end px-2.5 py-1 rounded-lg border text-right leading-tight ${getDueDateTintClass(
                        entry.hoursAway
                      )}`}
                    >
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium">
                        {/* Clock icon if there is a hard due date */}
                        {isHardDueDate && (
                          <Clock className="w-2.5 h-2.5 opacity-70 stroke-[2.2] text-rose-500" />
                        )}
                        <span>{formatAppleDate(entry.displayDate)}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80 mt-0.5">
                        {formatHoursAway(entry.hoursAway)}
                        {entry.hardHoursAway !== undefined && (
                          <span className="ml-1 opacity-75 font-normal">
                            ({formatHardMaxHours(entry.hardHoursAway)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Subtasks List */}
                {isExpanded && hasSubtasks && (
                  <div className="ml-7 mt-1 pl-2.5 border-l-2 border-neutral-100 dark:border-neutral-800 space-y-1">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/50 text-xs group/subtask"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Dedicated, comfortable checkbox touch/click zone */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!st.completed) {
                                celebrateTaskCompletion(e.currentTarget as HTMLElement);
                              }
                              toggleTaskCompleted(st.id);
                            }}
                            className="p-1 -m-1 flex items-center justify-center shrink-0 cursor-pointer"
                            title={st.completed ? 'Mark subtask uncompleted' : 'Mark subtask completed'}
                          >
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (!st.completed) {
                                  celebrateTaskCompletion(e.currentTarget as HTMLElement);
                                }
                                toggleTaskCompleted(st.id);
                              }}
                              className="rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                            />
                          </button>
                          {/* Clickable title area that opens the task modal */}
                          <span
                            onClick={() => openTaskModal(st.id)}
                            className={`cursor-pointer truncate flex-1 ${
                              st.completed
                                ? 'line-through text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100'
                            }`}
                          >
                            {st.title}
                          </span>
                        </div>
                        {st.dueDate && (
                          <span
                            onClick={() => openTaskModal(st.id)}
                            className="text-[11px] text-neutral-500 font-medium shrink-0 ml-2 cursor-pointer"
                          >
                            {formatAppleDate(st.dueDate)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Auto-Completing Remaining Subtasks */}
      {confirmationTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 text-center">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Autocomplete Subtasks?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
              Marking &quot;{confirmationTarget.task.title}&quot; as completed will autocomplete{' '}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {confirmationTarget.remainingCount} remaining subtasks
              </span>
              . Are you sure?
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmationTarget(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  celebrateTaskCompletion(e.currentTarget as HTMLElement);
                  batchCompleteSubtasks(confirmationTarget.task.id);
                  setConfirmationTarget(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Yes, Complete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
