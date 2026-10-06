/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { TodoProvider, useTodo } from './context/TodoContext';
import { PriorityListView } from './components/PriorityListView';
import { CalendarView } from './components/CalendarView';
import { TriageView } from './components/TriageView';
import { MapView } from './components/MapView';
import { SpeedDialFAB } from './components/SpeedDialFAB';
import { TaskModal } from './components/TaskModal';
import { MiniWidgetModal } from './components/MiniWidgetModal';
import { SettingsModal } from './components/SettingsModal';
import { CompletedTasksModal } from './components/CompletedTasksModal';
import { ToastContainer } from './components/ToastContainer';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    openTaskModal,
    setIsMiniWidgetOpen,
  } = useTodo();

  // Helper to process deep links or URL query strings
  const processIncomingUrl = (urlStr: string) => {
    try {
      // Handles "geodesic://widget", "chronos://widget" or "https://.../?widget=1"
      const normalized = urlStr
        .replace('geodesic://', 'https://dummy.host/')
        .replace('chronos://', 'https://dummy.host/');
      const parsed = new URL(normalized);
      const host = parsed.hostname; // e.g. "widget" if geodesic://widget
      const pathname = parsed.pathname; // e.g. "/widget"
      const searchParams = parsed.searchParams;

      if (
        host === 'widget' ||
        pathname.includes('widget') ||
        searchParams.get('widget') !== null
      ) {
        setIsMiniWidgetOpen(true);
      }

      if (
        host === 'new' ||
        pathname.includes('new') ||
        searchParams.get('new') !== null
      ) {
        openTaskModal(undefined, true);
      }

      const viewParam = searchParams.get('view') || (host !== 'dummy.host' ? host : null);
      if (
        viewParam === 'calendar' ||
        viewParam === 'triage' ||
        viewParam === 'priority' ||
        viewParam === 'map'
      ) {
        setActiveView(viewParam);
      }
    } catch {
      // ignore parsing errors
    }
  };

  useEffect(() => {
    // 1. Initial browser URL check (for web / PWA launch)
    processIncomingUrl(window.location.href);

    // 2. Native iOS Deep Link listener (@capacitor/app appUrlOpen)
    // Fired whenever iOS opens a custom scheme like chronos://widget or chronos://new
    const setupListener = async () => {
      try {
        const handler = await CapApp.addListener('appUrlOpen', (event) => {
          if (event?.url) {
            processIncomingUrl(event.url);
          }
        });
        return handler;
      } catch {
        // Fallback for non-Capacitor web environments
        return null;
      }
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then((handler) => {
        if (handler?.remove) {
          handler.remove();
        }
      });
    };
  }, [setIsMiniWidgetOpen, openTaskModal, setActiveView]);

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased pt-[max(env(safe-area-inset-top),2.75rem)] md:pt-0">
      {/* Main Full-Screen Viewport */}
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-full relative overflow-hidden">
        {activeView === 'priority' && <PriorityListView />}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'triage' && <TriageView />}
        {activeView === 'map' && <MapView />}
      </main>

      {/* Bottom Right Floating Action Speed Dial */}
      <SpeedDialFAB />

      {/* Modals & Overlays */}
      <TaskModal />
      <MiniWidgetModal />
      <SettingsModal />
      <CompletedTasksModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <TodoProvider>
      <AppContent />
    </TodoProvider>
  );
}
