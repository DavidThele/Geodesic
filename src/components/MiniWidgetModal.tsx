import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Smartphone,
  Laptop,
  Check,
  Share2,
  Copy,
  Info,
  Sliders,
  List,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import {
  buildDisplayEntries,
  formatHoursAway,
  formatAppleDate,
  formatHardMaxHours,
} from '../utils/priority';
import { TaskBubble } from './TaskBubble';
import { celebrateTaskCompletion } from '../utils/celebration';

export const MiniWidgetModal: React.FC = () => {
  const {
    tasks,
    settings,
    userLocation,
    isMiniWidgetOpen,
    setIsMiniWidgetOpen,
    openTaskModal,
    toggleTaskCompleted,
    showToast,
  } = useTodo();

  const [widgetView, setWidgetView] = useState<'priority' | 'calendar' | 'triage'>(
    settings.popupDefaultView || 'priority'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedScheme, setCopiedScheme] = useState(false);
  const [copiedTextSummary, setCopiedTextSummary] = useState(false);

  if (!isMiniWidgetOpen) return null;

  const displayEntries = buildDisplayEntries(tasks, settings, userLocation).slice(0, 5);
  const triageItems = tasks
    .filter((t) => !t.completed && !t.parentId)
    .slice(0, 4);

  const customSchemeUrl = `geodesic://widget?view=${widgetView}`;

  // Formatted plain-text summary for native Shortcuts notification or dialog banner overlay
  const textSummary = displayEntries
    .map((e, i) => `${i + 1}. ${e.task.title} (${formatHoursAway(e.hoursAway)})`)
    .join('\n');

  const copyTextSummary = () => {
    navigator.clipboard.writeText(textSummary);
    setCopiedTextSummary(true);
    showToast('Copied to Clipboard', 'Text summary ready for Shortcut', 'success');
    setTimeout(() => setCopiedTextSummary(false), 2000);
  };

  const copySchemeLink = () => {
    navigator.clipboard.writeText(customSchemeUrl);
    setCopiedScheme(true);
    setTimeout(() => setCopiedScheme(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      {/* Widget Container simulating macOS / iOS Lockscreen Widget */}
      <div className="w-full max-w-sm rounded-3xl bg-neutral-900/95 text-white border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Widget Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs font-semibold tracking-tight text-white/90">
              Geodesic Quick-Look
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Selector Tabs inside widget */}
            <div className="flex bg-black/40 rounded-lg p-0.5 text-[10px]">
              <button
                onClick={() => setWidgetView('priority')}
                className={`px-1.5 py-0.5 rounded ${
                  widgetView === 'priority' ? 'bg-white/20 text-white font-medium' : 'text-white/60'
                }`}
              >
                Queue
              </button>
              <button
                onClick={() => setWidgetView('triage')}
                className={`px-1.5 py-0.5 rounded ${
                  widgetView === 'triage' ? 'bg-white/20 text-white font-medium' : 'text-white/60'
                }`}
              >
                Triage
              </button>
            </div>

            <button
              onClick={() => setIsMiniWidgetOpen(false)}
              className="text-white/50 hover:text-white p-1 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Widget Body */}
        <div className="p-4 max-h-[300px] overflow-y-auto space-y-2.5">
          {widgetView === 'priority' && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-white/40 font-semibold px-1">
                Top Priority Deadlines
              </div>
              {displayEntries.map((entry) => (
                <div
                  key={entry.displayId}
                  onClick={() => openTaskModal(entry.task.id)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer border border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TaskBubble
                      completed={entry.task.completed}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!entry.task.completed) {
                          celebrateTaskCompletion(e.currentTarget as HTMLElement);
                        }
                        toggleTaskCompleted(entry.task.id);
                      }}
                      size="sm"
                    />
                    <span className="text-xs font-medium text-white/90 truncate">
                      {entry.task.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded text-right ${
                      entry.hardHoursAway !== undefined
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {formatHoursAway(entry.hoursAway)}
                    {entry.hardHoursAway !== undefined && (
                      <span className="opacity-75 block text-[9px] font-normal">
                        ({formatHardMaxHours(entry.hardHoursAway)})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {widgetView === 'triage' && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-white/40 font-semibold px-1">
                Active Focus Deck
              </div>
              {triageItems.map((task) => (
                <div
                  key={task.id}
                  onClick={() => openTaskModal(task.id)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer border border-white/5"
                >
                  <div className="flex items-center justify-between text-[10px] text-white/50 uppercase tracking-wider mb-0.5">
                    <span>{task.column.replace('_', ' ')}</span>
                    <span className="capitalize">{task.importance}</span>
                  </div>
                  <div className="text-xs font-medium text-white/90 truncate">
                    {task.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shortcuts Options: 2 Ways to Trigger */}
        <div className="p-3 bg-black/40 border-t border-white/10 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/80 font-semibold flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              Shortcuts Integration Options
            </span>
          </div>

          {/* Option A: Overlay Notification / Sheet (stays in your current app!) */}
          <div className="bg-neutral-800/80 rounded-xl p-2.5 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                <List className="w-3 h-3" />
                True Overlay (Stays in current app)
              </span>
              <button
                type="button"
                onClick={copyTextSummary}
                className="inline-flex items-center gap-1 text-[10.5px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
              >
                {copiedTextSummary ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTextSummary ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
            <p className="text-[10px] text-neutral-300 leading-tight">
              In Shortcuts, use action <strong className="text-white">&quot;Show Result&quot;</strong> or <strong className="text-white">&quot;Show Notification&quot;</strong> reading your tasks from your iCloud file. It drops down from the top of your screen as a native sheet <em>without</em> opening Geodesic!
            </p>
          </div>

          {/* Option B: App URL Launch */}
          <div className="bg-neutral-800/80 rounded-xl p-2.5 border border-white/5 space-y-1 text-[10px] text-neutral-400">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300 text-[10.5px]">
                Full App Launch URL
              </span>
              <button
                type="button"
                onClick={copySchemeLink}
                className="inline-flex items-center gap-1 text-[10.5px] text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20"
              >
                {copiedScheme ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScheme ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <span className="font-mono text-neutral-300 text-[10px]">{customSchemeUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
