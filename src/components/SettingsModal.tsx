import React, { useState } from 'react';
import {
  X,
  Sliders,
  Calculator,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  Check,
  Compass,
  Laptop,
  Bell,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { ImportanceLevel } from '../types/todo';

export const SettingsModal: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetSettings,
    isSettingsOpen,
    setIsSettingsOpen,
    exportDataJSON,
    importDataJSON,
    saveToICloudDrive,
    syncFromICloudDrive,
    lastSyncTime,
    userLocation,
    setSimulatedLocation,
    refreshLocation,
    notificationPermissionGranted,
    requestNotificationAccess,
    rescheduleNotifications,
    reloadWidgets,
  } = useTodo();

  const [activeTab, setActiveTab] = useState<'formula' | 'simulator' | 'sync' | 'preferences'>('formula');
  const [importJsonText, setImportJsonText] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);

  // Live Formula Simulator State
  const [simDueDateHours, setSimDueDateHours] = useState(72);
  const [simImportance, setSimImportance] = useState<ImportanceLevel>('high');
  const [simDistanceMiles, setSimDistanceMiles] = useState(5.0);
  const [simEstimatedMinutes, setSimEstimatedMinutes] = useState(10);

  if (!isSettingsOpen) return null;

  // Simulator Math
  const simBaseline = simDueDateHours;
  const simImportanceDeduction = settings.importanceDeductions[simImportance] ?? 0;
  const simEffDist = Math.max(0, simDistanceMiles - settings.distanceOffset);
  const simDistAddition = Math.min(
    settings.distanceCapHours,
    simEffDist * settings.distanceScalar
  );
  const simDurationDeduction = simEstimatedMinutes <= 5 ? 2.5 : simEstimatedMinutes <= 10 ? 1.5 : 0;
  const simFinalScore = simBaseline - simImportanceDeduction + simDistAddition - simDurationDeduction;

  const handleImportanceDeductionChange = (level: ImportanceLevel, value: number) => {
    updateSettings({
      importanceDeductions: {
        ...settings.importanceDeductions,
        [level]: value,
      },
    });
  };

  const handleExportCopy = () => {
    navigator.clipboard.writeText(exportDataJSON());
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleImportSubmit = () => {
    if (importJsonText.trim()) {
      importDataJSON(importJsonText);
      setImportJsonText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Settings & Customization
            </h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 px-4 sm:px-6 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs sm:text-sm font-medium overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('formula')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'formula'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Priority Formula
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'simulator'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Formula Simulator
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'sync'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            iCloud & Backup
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'preferences'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            App Preferences
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-neutral-900 dark:text-neutral-100 text-sm">
          {/* TAB 1: FORMULA PARAMETERS */}
          {activeTab === 'formula' && (
            <div className="space-y-6">
              {/* Baseline setting */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-sm">
                  Default Baseline (Hours when no due date is provided)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="12"
                    max="336"
                    step="12"
                    value={settings.defaultBaselineHours}
                    onChange={(e) =>
                      updateSettings({ defaultBaselineHours: parseInt(e.target.value, 10) })
                    }
                    className="flex-1"
                  />
                  <span className="w-20 font-mono font-medium text-right text-sm">
                    {settings.defaultBaselineHours} hrs ({(settings.defaultBaselineHours / 24).toFixed(1)}d)
                  </span>
                </div>
              </div>

              {/* Distance parameters */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                  Location Distance Scoring
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-600 dark:text-neutral-400 text-xs mb-1">
                      Distance Offset ($x$ buffer in miles)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={settings.distanceOffset}
                      onChange={(e) =>
                        updateSettings({ distanceOffset: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-sm"
                    />
                    <span className="text-xs text-neutral-400">
                      Distance below this adds 0 to score
                    </span>
                  </div>

                  <div>
                    <label className="block text-neutral-600 dark:text-neutral-400 text-xs mb-1">
                      Distance Scalar (Hours added per mile)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={settings.distanceScalar}
                      onChange={(e) =>
                        updateSettings({ distanceScalar: parseFloat(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-sm"
                    />
                    <span className="text-xs text-neutral-400">
                      Multiplier for effective miles away
                    </span>
                  </div>
                </div>
              </div>

              {/* Importance values breakdown */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Importance Level Deductions (Hours subtracted from baseline)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      'low',
                      'med-low',
                      'med',
                      'med-high',
                      'high',
                      'urgent',
                      'do_now',
                    ] as ImportanceLevel[]
                  ).map((lvl) => (
                    <div key={lvl}>
                      <label className="block text-neutral-500 capitalize mb-1">
                        {lvl.replace('_', ' ')}
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-400">-</span>
                        <input
                          type="number"
                          value={settings.importanceDeductions[lvl]}
                          onChange={(e) =>
                            handleImportanceDeductionChange(lvl, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-center"
                        />
                        <span className="text-neutral-400">h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE FORMULA SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold mb-1">
                  <Calculator className="w-4 h-4" />
                  Live Priority Score Math Breakdown
                </div>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400">
                  Test and observe how different parameters affect the final priority score and rank.
                </p>
              </div>

              {/* Sliders for simulation */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Simulated Due Date (Hours away)
                    </span>
                    <span className="font-mono">{simDueDateHours}h</span>
                  </div>
                  <input
                    type="range"
                    min="-24"
                    max="168"
                    step="2"
                    value={simDueDateHours}
                    onChange={(e) => setSimDueDateHours(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Negative represents overdue hours
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Importance Level
                  </label>
                  <select
                    value={simImportance}
                    onChange={(e) => setSimImportance(e.target.value as ImportanceLevel)}
                    className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-medium"
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

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      User Distance from Task Location
                    </span>
                    <span className="font-mono">{simDistanceMiles.toFixed(1)} miles</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={simDistanceMiles}
                    onChange={(e) => setSimDistanceMiles(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Estimated Task Duration (Minutes)
                    </span>
                    <span className="font-mono">{simEstimatedMinutes}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="120"
                      step="1"
                      value={simEstimatedMinutes}
                      onChange={(e) => setSimEstimatedMinutes(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                    <div className="flex gap-1 shrink-0">
                      {[5, 10, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSimEstimatedMinutes(mins)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            simEstimatedMinutes === mins
                              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    Tasks &le; 10m get a quick-win priority deduction (-2.5h for &le;5m, -1.5h for &le;10m)
                  </span>
                </div>
              </div>

              {/* Calculated Results Box */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Baseline Hours:</span>
                  <span>{simBaseline.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Importance Deduction:</span>
                  <span>-{simImportanceDeduction.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Distance Addition (({simDistanceMiles.toFixed(1)} - {settings.distanceOffset}) × {settings.distanceScalar}):</span>
                  <span>+{simDistAddition.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span>Quick-Win Duration Deduction:</span>
                  <span>{simDurationDeduction > 0 ? `-${simDurationDeduction.toFixed(1)}h` : '0.0h (standard weight)'}</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  <span>Final Calculated Priority Score:</span>
                  <span>{simFinalScore.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ICLOUD & BACKUP */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* Automatic iCloud Sync Status Card */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    Automatic iCloud File Sync
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSyncICloud}
                      onChange={(e) => updateSettings({ autoSyncICloud: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-[11px] text-blue-600/90 dark:text-blue-400 leading-relaxed">
                  When enabled, Geodesic automatically loads your tasks when you open the app, saves whenever you make an edit, and writes to disk every 10 seconds or when closing the app.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-blue-200/50 dark:border-blue-900/40 text-[11px]">
                  <div className="text-neutral-600 dark:text-neutral-400">
                    File:{' '}
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {settings.autoSyncFileName}
                    </span>
                  </div>
                  {lastSyncTime && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-synced at {lastSyncTime}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveToICloudDrive}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-1.5 transition text-xs"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Force Sync Now
                  </button>
                  <button
                    type="button"
                    onClick={syncFromICloudDrive}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-medium inline-flex items-center gap-1.5 transition text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reload from File
                  </button>
                </div>
              </div>

              {/* JSON Export */}
              <div className="space-y-2">
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">
                  JSON Export & Raw Backup
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportCopy}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium inline-flex items-center gap-1.5 transition"
                  >
                    {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                    {copiedExport ? 'Copied to Clipboard!' : 'Copy Backup JSON'}
                  </button>
                </div>
              </div>

              {/* JSON Import */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Restore from JSON Backup / iCloud File
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium inline-flex items-center gap-1.5 transition text-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    <span>Select File from iCloud / Files</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            if (content) {
                              setImportJsonText(content);
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  placeholder="Or paste JSON database backup text here..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-[11px]"
                />
                <button
                  type="button"
                  disabled={!importJsonText.trim()}
                  onClick={handleImportSubmit}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Restore Database
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: APP PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              {/* Theme Selector */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['system', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSettings({ theme: t })}
                      className={`p-2.5 rounded-xl border capitalize font-medium flex items-center justify-center gap-1.5 transition ${
                        settings.theme === t
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                          : 'border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {t === 'light' ? <Sun className="w-3.5 h-3.5" /> : t === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Push Notifications & Home/Lock Screen Widgets */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-semibold text-neutral-800 dark:text-neutral-200 text-sm flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-blue-500" />
                      Push Notifications
                    </label>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Default alerts 15m and 1h before calculated & hard deadlines. Subtasks notify only when given a hard deadline.
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      notificationPermissionGranted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {notificationPermissionGranted ? 'Active' : 'Not Granted'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {!notificationPermissionGranted ? (
                    <button
                      type="button"
                      onClick={requestNotificationAccess}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Enable Push Notifications
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const count = await rescheduleNotifications();
                        alert(`Successfully refreshed alerts for ${count} deadlines.`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reschedule All Alerts
                    </button>
                  )}
                </div>

                {/* Home Screen & Lock Screen Widgets */}
                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs space-y-2 text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      Home & Lock Screen Widgets:
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      Auto-Synced
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Automatically updates your 2x2, 3x2, and 3x3 Home Screen widgets and your Lock Screen widgets (Rectangular, Circular, and Inline) with live priority rankings and countdowns.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => reloadWidgets()}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Force Sync Widgets</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* UI Scale / Zoom Slider */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                      App-Wide Zoom & Scale
                    </label>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Scales up literally everything: cards, text, bottom buttons, icons & modals.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                    {Math.round((settings.uiScale || 1.0) * 100)}%
                  </span>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.8"
                    max="1.8"
                    step="0.05"
                    value={settings.uiScale || 1.0}
                    onChange={(e) => updateSettings({ uiScale: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>80% (Compact)</span>
                    <span>100% (Default)</span>
                    <span>140% (Mac Air)</span>
                    <span>180% (Huge)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[
                    { label: '100%', val: 1.0 },
                    { label: '125%', val: 1.25 },
                    { label: '140%', val: 1.4 },
                    { label: '160%', val: 1.6 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => updateSettings({ uiScale: preset.val })}
                      className={`flex-1 py-1 rounded-lg text-xs font-medium border transition ${
                        Math.abs((settings.uiScale || 1.0) - preset.val) < 0.01
                          ? 'border-blue-600 bg-blue-600 text-white font-semibold shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Triage Threshold */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-sm">
                  Triage Priority Threshold (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.triageThresholdHours}
                  onChange={(e) =>
                    updateSettings({ triageThresholdHours: parseInt(e.target.value, 10) || 24 })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-sm"
                />
                <span className="text-xs text-neutral-400">
                  Tasks with priority score $\le$ this number appear in top Urgent Triage deck
                </span>
              </div>

              {/* Simulated Location Sandbox */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                    Location Simulation
                  </h4>
                  <button
                    onClick={refreshLocation}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Detect Real GPS
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  Current active location:{' '}
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">
                    {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Waiting for GPS...'}
                  </span>
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSimulatedLocation({
                        lat: 37.7749,
                        lng: -122.4194,
                        name: 'San Francisco Downtown',
                      })
                    }
                    className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs"
                  >
                    Simulate SF (Near Office)
                  </button>
                  <button
                    onClick={() =>
                      setSimulatedLocation({
                        lat: 34.0522,
                        lng: -118.2437,
                        name: 'Los Angeles (Far Away)',
                      })
                    }
                    className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs"
                  >
                    Simulate LA (380 mi Away)
                  </button>
                  {settings.simulatedUserLocation && (
                    <button
                      onClick={() => setSimulatedLocation(null)}
                      className="px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 text-xs"
                    >
                      Clear Simulation
                    </button>
                  )}
                </div>
              </div>

              {/* Reset Defaults */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all customization settings to default?')) {
                      resetSettings();
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                >
                  Reset Settings to Default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
