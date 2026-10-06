import React, { useState } from 'react';
import {
  Plus,
  ListOrdered,
  Calendar,
  Columns3,
  MapPin,
  CheckCircle2,
  Settings,
  AppWindow,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';

export const SpeedDialFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    activeView,
    setActiveView,
    openTaskModal,
    setIsSettingsOpen,
    setIsMiniWidgetOpen,
    setIsCompletedMenuOpen,
    tasks,
  } = useTodo();

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleAction = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col-reverse items-end gap-3">
      {/* Primary Floating Action Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
          isOpen
            ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 rotate-45'
            : 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100'
        }`}
        title="Quick Actions Menu"
      >
        <Plus className="w-6 h-6 stroke-[2.5] transition-transform duration-200" />
      </button>

      {/* Expanded Radial / Vertical Speed Dial Options */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Action 1: Create New Task */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              New Task
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => openTaskModal(undefined, true))}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition active:scale-95"
              title="New Task"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Action 2: Priority List View */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              Priority List
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setActiveView('priority'))}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 ${
                activeView === 'priority'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 ring-2 ring-blue-500'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
              }`}
              title="Priority List View"
            >
              <ListOrdered className="w-5 h-5" />
            </button>
          </div>

          {/* Action 3: 24h Timeline Calendar */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              24h Calendar
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setActiveView('calendar'))}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 ${
                activeView === 'calendar'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 ring-2 ring-blue-500'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
              }`}
              title="24h Timeline Calendar"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          {/* Action 4: Urgent Triage Kanban */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              Urgent Triage
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setActiveView('triage'))}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 ${
                activeView === 'triage'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 ring-2 ring-blue-500'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
              }`}
              title="Urgent Triage Board"
            >
              <Columns3 className="w-5 h-5" />
            </button>
          </div>

          {/* Action 5: Location Map */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              Location Map
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setActiveView('map'))}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 ${
                activeView === 'map'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 ring-2 ring-blue-500'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
              }`}
              title="Interactive Location Map"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          {/* Action 6: Completed Tasks Menu */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              Completed ({completedCount})
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setIsCompletedMenuOpen(true))}
              className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 shadow-lg flex items-center justify-center transition active:scale-95"
              title="View and Restore Completed Tasks"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>

          {/* Action 7: Standalone Mini Widget */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              Widget Popup
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setIsMiniWidgetOpen(true))}
              className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center justify-center transition active:scale-95"
              title="Open Standalone Mini Widget"
            >
              <AppWindow className="w-5 h-5 text-indigo-500" />
            </button>
          </div>

          {/* Action 8: Settings */}
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-800/95 text-neutral-800 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 pointer-events-none">
              Settings & Scale
            </span>
            <button
              type="button"
              onClick={() => handleAction(() => setIsSettingsOpen(true))}
              className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center justify-center transition active:scale-95"
              title="Settings & Formula Simulator"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
