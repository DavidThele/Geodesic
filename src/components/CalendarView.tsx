import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { buildDisplayEntries, formatAppleDate } from '../utils/priority';

type CalendarScale = 'day' | 'multiday' | 'week' | 'month';

export const CalendarView: React.FC = () => {
  const { tasks, settings, userLocation, openTaskModal } = useTodo();

  const [scale, setScale] = useState<CalendarScale>('week');
  const [numCustomDays, setNumCustomDays] = useState<number>(3);
  const [currentAnchorDate, setCurrentAnchorDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Track live time indicator
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Display entries (both red hard due dates and yellow presumed due dates)
  const displayEntries = useMemo(() => {
    return buildDisplayEntries(tasks, settings, userLocation);
  }, [tasks, settings, userLocation]);

  // Navigate forward / back
  const navigateIncrement = useCallback(
    (direction: 1 | -1) => {
      setCurrentAnchorDate((prev) => {
        const next = new Date(prev);
        if (scale === 'day') {
          next.setDate(next.getDate() + direction * 1);
        } else if (scale === 'multiday') {
          next.setDate(next.getDate() + direction * numCustomDays);
        } else if (scale === 'week') {
          next.setDate(next.getDate() + direction * 7);
        } else if (scale === 'month') {
          next.setMonth(next.getMonth() + direction * 1);
        }
        return next;
      });
    },
    [scale, numCustomDays]
  );

  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentAnchorDate(d);
  };

  // Keyboard shortcuts handler: 'd', 'w', 'm', left arrow, right arrow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        setScale('day');
      } else if (e.key === 'w' || e.key === 'W') {
        setScale('week');
      } else if (e.key === 'm' || e.key === 'M') {
        setScale('month');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateIncrement(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateIncrement(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateIncrement]);

  // Prompt for custom N days
  const handleCustomDaysClick = () => {
    const val = window.prompt('Enter number of days to display (1 - 14):', String(numCustomDays));
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
        setNumCustomDays(parsed);
        setScale('multiday');
      }
    }
  };

  // Mobile Touch Gestures: Swipe left/right for time navigation, Pinch for zoom
  const touchStartRef = useRef<{ x: number; y: number; dist: number | null }>({
    x: 0,
    y: 0,
    dist: null,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        dist: null,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1 && touchStartRef.current.dist === null) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
        if (deltaX < 0) {
          navigateIncrement(1);
        } else {
          navigateIncrement(-1);
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current.dist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const pinchDelta = currentDist - touchStartRef.current.dist;
      const sensitivity = 50 / (settings.pinchSensitivity || 1);

      if (pinchDelta > sensitivity) {
        if (scale === 'month') setScale('week');
        else if (scale === 'week') setScale('multiday');
        else if (scale === 'multiday') setScale('day');
        touchStartRef.current.dist = currentDist;
      } else if (pinchDelta < -sensitivity) {
        if (scale === 'day') setScale('multiday');
        else if (scale === 'multiday') setScale('week');
        else if (scale === 'week') setScale('month');
        touchStartRef.current.dist = currentDist;
      }
    }
  };

  // Determine active columns (dates) for day / multiday / week
  const visibleDates = useMemo(() => {
    const list: Date[] = [];
    const count = scale === 'day' ? 1 : scale === 'multiday' ? numCustomDays : 7;

    for (let i = 0; i < count; i++) {
      const d = new Date(currentAnchorDate);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, [currentAnchorDate, scale, numCustomDays]);

  const isTodayDate = (date: Date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  // Filter entries falling on a specific date (day view/timeline)
  const getEntriesForDate = (date: Date) => {
    return displayEntries.filter((entry) => {
      const itemDate = new Date(entry.displayDate);
      return (
        itemDate.getDate() === date.getDate() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Month days generator
  const monthDays = useMemo(() => {
    const year = currentAnchorDate.getFullYear();
    const month = currentAnchorDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    const startOffset = firstDayOfMonth.getDay();

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentAnchorDate]);

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-neutral-950 select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Calendar Header Controls */}
      <div className="px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between shrink-0">
        {/* Navigation & Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5 bg-neutral-50 dark:bg-neutral-900">
            <button
              onClick={() => navigateIncrement(-1)}
              className="p-1 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
              title="Previous (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={goToToday}
              className="px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 rounded transition"
            >
              Today
            </button>
            <button
              onClick={() => navigateIncrement(1)}
              className="p-1 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
              title="Next (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight">
            {currentAnchorDate.toLocaleDateString([], {
              month: 'short',
              year: 'numeric',
              ...(scale === 'day' && { day: 'numeric' }),
            })}
          </h2>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => setScale('day')}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                scale === 'day'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Day
            </button>
            <button
              onClick={handleCustomDaysClick}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                scale === 'multiday'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              {numCustomDays}D
            </button>
            <button
              onClick={() => setScale('week')}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                scale === 'week'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setScale('month')}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                scale === 'month'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Viewport */}
      {scale === 'month' ? (
        /* MONTH VIEW */
        <div className="flex-1 flex flex-col min-h-0 p-3 overflow-y-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-neutral-400 uppercase tracking-wider py-1 border-b border-neutral-100 dark:border-neutral-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 flex-1 border-l border-t border-neutral-100 dark:border-neutral-800 divide-x divide-y divide-neutral-100 dark:divide-neutral-800">
            {monthDays.map(({ date, isCurrentMonth }, i) => {
              const entries = getEntriesForDate(date);
              const isToday = isTodayDate(date);

              return (
                <div
                  key={i}
                  className={`min-h-[70px] p-1 flex flex-col ${
                    isCurrentMonth
                      ? 'bg-white dark:bg-neutral-950'
                      : 'bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-300 dark:text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-[11px] font-mono px-1 py-0.2 rounded-full ${
                        isToday
                          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold'
                          : isCurrentMonth
                          ? 'text-neutral-700 dark:text-neutral-300'
                          : 'text-neutral-400 dark:text-neutral-600'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-0.5 flex-1 overflow-hidden">
                    {entries.slice(0, 2).map((entry) => (
                      <button
                        key={entry.displayId}
                        type="button"
                        onClick={() => openTaskModal(entry.task.id)}
                        className={`w-full text-left truncate px-1 py-0.5 rounded text-[10px] transition ${
                          entry.type === 'red'
                            ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {entry.task.title}
                      </button>
                    ))}
                    {entries.length > 2 && (
                      <div className="text-[9px] text-neutral-400 pl-0.5">
                        +{entries.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* DAY / MULTI-DAY / WEEK 24-HOUR SQUISHED TIMELINE VIEW (No Vertical Scrolling) */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Column Date Headers */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50/40 dark:bg-neutral-900/40">
            {/* Time gutter spacer */}
            <div className="w-12 shrink-0 border-r border-neutral-100 dark:border-neutral-800 text-[9px] text-neutral-400 flex items-center justify-center font-mono">
              24h
            </div>

            {/* Date Columns */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}>
              {visibleDates.map((d, idx) => {
                const isToday = isTodayDate(d);
                return (
                  <div
                    key={idx}
                    className={`py-1 text-center border-r border-neutral-100 dark:border-neutral-800 last:border-r-0 ${
                      isToday ? 'bg-neutral-100/50 dark:bg-neutral-800/30' : ''
                    }`}
                  >
                    <span className="text-[10px] uppercase text-neutral-400 font-medium mr-1">
                      {d.toLocaleDateString([], { weekday: 'short' })}
                    </span>
                    <span
                      className={`text-xs font-mono ${
                        isToday
                          ? 'font-bold text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 24-Hour Vertically-Squished Grid (fits 100% height without scrolling) */}
          <div className="flex-1 flex min-h-0 relative overflow-hidden">
            {/* Left Hour Labels (24 evenly distributed rows) */}
            <div className="w-12 shrink-0 border-r border-neutral-100 dark:border-neutral-800 flex flex-col h-full bg-neutral-50/20 dark:bg-neutral-900/10 select-none">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  className="flex-1 border-b border-neutral-100/80 dark:border-neutral-800/40 pr-1.5 flex items-center justify-end text-[9px] text-neutral-400 font-mono"
                >
                  {hour % 3 === 0 ? (hour === 0 ? '12A' : hour < 12 ? `${hour}A` : hour === 12 ? '12P' : `${hour - 12}P`) : ''}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div
              className="flex-1 grid relative divide-x divide-neutral-100 dark:divide-neutral-800 h-full"
              style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}
            >
              {visibleDates.map((date, colIdx) => {
                const isToday = isTodayDate(date);
                const dayEntries = getEntriesForDate(date);

                return (
                  <div key={colIdx} className="relative h-full flex flex-col">
                    {/* 24 Squished Hour rows */}
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="flex-1 border-b border-neutral-100/60 dark:border-neutral-800/40"
                      />
                    ))}

                    {/* Current Time Line (Red horizontal line with dot) */}
                    {isToday && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${(currentTimeMinutes / 1440) * 100}%` }}
                      >
                        <span className="w-1.5 h-1.5 -ml-0.5 rounded-full bg-red-500 shadow-2xs" />
                        <div className="flex-1 h-0.5 bg-red-500/70" />
                      </div>
                    )}

                    {/* Instantaneous Event Markers (Toned-down soft badges, title + time only, no scores) */}
                    {dayEntries.map((entry) => {
                      const itemDate = new Date(entry.displayDate);
                      const minuteOffset = itemDate.getHours() * 60 + itemDate.getMinutes();
                      const percentTop = Math.min((minuteOffset / 1440) * 100, 96);

                      return (
                        <div
                          key={entry.displayId}
                          style={{ top: `${percentTop}%` }}
                          className="absolute inset-x-0.5 z-10 -translate-y-1/2"
                        >
                          <button
                            type="button"
                            onClick={() => openTaskModal(entry.task.id)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center justify-between border shadow-2xs transition hover:brightness-95 ${
                              entry.hardDueDate
                                ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-200/80 dark:border-rose-900/50'
                                : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border-amber-200/80 dark:border-amber-900/50'
                            }`}
                            title={`${entry.task.title}${entry.hardDueDate ? ' (Hard deadline set)' : ''}`}
                          >
                            <span className="truncate flex-1">
                              {entry.task.title}
                            </span>
                            <span className="text-[9px] font-mono ml-1 shrink-0 opacity-70">
                              {itemDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
