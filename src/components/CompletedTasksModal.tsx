import React, { useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Trash2,
  X,
  Search,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { formatAppleDate } from '../utils/priority';

export const CompletedTasksModal: React.FC = () => {
  const {
    tasks,
    isCompletedMenuOpen,
    setIsCompletedMenuOpen,
    toggleTaskCompleted,
    deleteTask,
    openTaskModal,
    showToast,
  } = useTodo();

  const [searchQuery, setSearchQuery] = useState('');

  if (!isCompletedMenuOpen) return null;

  // Filter for completed tasks (both parent tasks and subtasks)
  const completedTasks = tasks.filter((t) => t.completed);
  const filteredCompletedTasks = completedTasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.location?.name && t.location.name.toLowerCase().includes(q))
    );
  });

  const handleRestore = (taskId: string, title: string) => {
    toggleTaskCompleted(taskId);
    showToast('Task Restored', `"${title}" has been restored to your active queue`, 'success');
  };

  const handleDelete = (taskId: string, title: string) => {
    if (window.confirm(`Permanently delete "${title}"?`)) {
      deleteTask(taskId);
      showToast('Task Deleted', `"${title}" permanently deleted`, 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Completed Tasks
              </h2>
              <span className="text-xs text-neutral-500">
                {completedTasks.length} {completedTasks.length === 1 ? 'task' : 'tasks'} completed
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCompletedMenuOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search filter bar */}
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search completed tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>

        {/* Completed list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {filteredCompletedTasks.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs">
              {completedTasks.length === 0
                ? 'No completed tasks yet. Finish a task from your queue to see it here!'
                : 'No completed tasks matched your search.'}
            </div>
          ) : (
            filteredCompletedTasks.map((t) => (
              <div
                key={t.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 px-2 rounded-xl transition-colors"
              >
                {/* Task info */}
                <div
                  onClick={() => {
                    setIsCompletedMenuOpen(false);
                    openTaskModal(t.id);
                  }}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">
                      {t.title}
                    </span>
                    {t.parentId && (
                      <span className="text-[10px] text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1 shrink-0">
                        Subtask
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-400">
                    {t.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatAppleDate(t.dueDate)}
                      </span>
                    )}
                    {t.location && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3" />
                        {t.location.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Restore & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(t.id, t.title)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition active:scale-95"
                    title="Restore task back to active list"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id, t.title)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    title="Permanently delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between text-xs text-neutral-500">
          <span>Click any task to view details</span>
          <button
            type="button"
            onClick={() => setIsCompletedMenuOpen(false)}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
