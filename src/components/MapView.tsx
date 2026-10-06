import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Calendar,
  X,
  Layers,
} from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { formatAppleDate } from '../utils/priority';
import { celebrateTaskCompletion } from '../utils/celebration';
import { Task } from '../types/todo';

// Fix Leaflet's default marker icons
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Single task pin (clean icon, no unnecessary numbers)
const createSinglePinIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-map-single-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background-color: ${color};
        color: white;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        transform: translate(-50%, -50%);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [0, 0],
  });
};

// Cluster badge pin showing the number of tasks in the cluster
const createClusterBadgeIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-map-cluster-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(37,99,235,0.45);
        font-weight: 700;
        font-size: 13px;
        transform: translate(-50%, -50%);
      ">
        <span>${count}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [0, 0],
  });
};

interface PlacedTask {
  task: Task;
  lat: number;
  lng: number;
  hasDirectLocation: boolean;
  isDefaultedToUser: boolean;
}

interface ClusterGroup {
  id: string;
  lat: number;
  lng: number;
  tasks: PlacedTask[];
}

export const MapView: React.FC = () => {
  const {
    tasks,
    userLocation,
    refreshLocation,
    openTaskModal,
    toggleTaskCompleted,
  } = useTodo();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.CircleMarker | null>(null);

  // Store user's position in a ref so background GPS changes do NOT re-trigger map zoom/pan resets
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  const [filterMode, setFilterMode] = useState<'all' | 'located' | 'unlocated'>('all');
  const [selectedTaskForPreview, setSelectedTaskForPreview] = useState<Task | null>(null);
  const [clusterModalTasks, setClusterModalTasks] = useState<Task[] | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);

  // Default coordinate center: userLocation > default SF
  const initialLat = userLocation?.lat || 37.7749;
  const initialLng = userLocation?.lng || -122.4194;

  // Active uncompleted tasks
  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  // Tasks mapped with their effective coordinates
  // Circle geometry for unlocated tasks:
  // - If 1 unlocated task: placed directly on user (radius = 0)
  // - If > 1 unlocated tasks: evenly spaced in an expanding circle around user
  const mappedTasks = useMemo<PlacedTask[]>(() => {
    const baseLat = userLocation?.lat || 37.7749;
    const baseLng = userLocation?.lng || -122.4194;

    const unlocatedList = activeTasks.filter((t) => !t.location);
    const totalUnlocated = unlocatedList.length;

    // Radius expands smoothly as total count grows (from ~40 meters to ~150 meters)
    // 0.0004 deg ≈ 45m; 0.001 deg ≈ 110m
    const circleRadius = totalUnlocated <= 1 ? 0 : Math.min(0.00045 + (totalUnlocated - 2) * 0.0001, 0.0018);

    let unlocatedIndex = 0;

    return activeTasks.map((t) => {
      const hasDirectLocation = !!t.location;
      let lat = t.location?.lat;
      let lng = t.location?.lng;
      let isDefaultedToUser = false;

      if (lat === undefined || lng === undefined) {
        isDefaultedToUser = true;
        if (totalUnlocated <= 1) {
          // Exactly one task: placed directly on user
          lat = baseLat;
          lng = baseLng;
        } else {
          // Evenly spaced circle around user
          const angle = (unlocatedIndex / totalUnlocated) * 2 * Math.PI;
          lat = baseLat + Math.cos(angle) * circleRadius;
          lng = baseLng + Math.sin(angle) * circleRadius;
          unlocatedIndex++;
        }
      }

      return {
        task: t,
        lat,
        lng,
        hasDirectLocation,
        isDefaultedToUser,
      };
    });
  }, [activeTasks, userLocation?.lat, userLocation?.lng]);

  const filteredTasks = useMemo(() => {
    if (filterMode === 'located') return mappedTasks.filter((m) => m.hasDirectLocation);
    if (filterMode === 'unlocated') return mappedTasks.filter((m) => m.isDefaultedToUser);
    return mappedTasks;
  }, [mappedTasks, filterMode]);

  // Dynamic Clustering: Groups pins together when zoomed out or overlapping (distance in screen pixels < 45px)
  const clusters = useMemo<ClusterGroup[]>(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return filteredTasks.map((pt, i) => ({
        id: `single-${pt.task.id}-${i}`,
        lat: pt.lat,
        lng: pt.lng,
        tasks: [pt],
      }));
    }

    const clusterDistanceThresholdPixels = 42;
    const groups: { centerPoint: L.Point; lat: number; lng: number; tasks: PlacedTask[] }[] = [];

    filteredTasks.forEach((pt) => {
      const point = map.latLngToLayerPoint([pt.lat, pt.lng]);
      let assigned = false;

      for (const group of groups) {
        const dist = point.distanceTo(group.centerPoint);
        if (dist <= clusterDistanceThresholdPixels) {
          group.tasks.push(pt);
          // Update centroid
          group.lat = group.tasks.reduce((sum, item) => sum + item.lat, 0) / group.tasks.length;
          group.lng = group.tasks.reduce((sum, item) => sum + item.lng, 0) / group.tasks.length;
          group.centerPoint = map.latLngToLayerPoint([group.lat, group.lng]);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        groups.push({
          centerPoint: point,
          lat: pt.lat,
          lng: pt.lng,
          tasks: [pt],
        });
      }
    });

    return groups.map((g, index) => ({
      id: `cluster-${index}-${g.tasks.length}`,
      lat: g.lat,
      lng: g.lng,
      tasks: g.tasks,
    }));
  }, [filteredTasks, currentZoom]);

  // Initialize Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([initialLat, initialLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Listen to zoom and move events to dynamically re-calculate clusters on zoom
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      userLocationLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user GPS dot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (!userLocationLayerRef.current) {
        const circle = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 8,
          fillColor: '#2563eb',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map);

        circle.bindTooltip('Your Current Location', {
          direction: 'top',
          offset: [0, -8],
          className: 'text-xs font-medium',
        });

        userLocationLayerRef.current = circle;
      } else {
        userLocationLayerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    } else if (userLocationLayerRef.current) {
      userLocationLayerRef.current.remove();
      userLocationLayerRef.current = null;
    }
  }, [userLocation]);

  // Render clusters and individual pins onto map
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    clusters.forEach((cluster) => {
      const isMulti = cluster.tasks.length > 1;

      if (isMulti) {
        // Multi-task cluster: badge with count number
        const marker = L.marker([cluster.lat, cluster.lng], {
          icon: createClusterBadgeIcon(cluster.tasks.length),
        });

        marker.on('click', () => {
          setClusterModalTasks(cluster.tasks.map((pt) => pt.task));
        });

        marker.bindTooltip(
          `<strong>${cluster.tasks.length} tasks here</strong><br/><span style="font-size: 10px; color: #666;">Click to view list</span>`,
          { direction: 'top', offset: [0, -20] }
        );

        marker.addTo(markersGroup);
      } else {
        // Single task pin: Clean icon without numbers
        const pt = cluster.tasks[0];
        const pinColor = pt.isDefaultedToUser ? '#f59e0b' : '#3b82f6';

        const marker = L.marker([pt.lat, pt.lng], {
          icon: createSinglePinIcon(pinColor),
        });

        marker.on('click', () => {
          setSelectedTaskForPreview(pt.task);
        });

        marker.bindTooltip(
          `<strong>${pt.task.title}</strong><br/><span style="font-size: 10px; color: #666;">${
            pt.isDefaultedToUser ? 'Around your location' : pt.task.location?.name || 'Pinned place'
          }</span>`,
          { direction: 'top', offset: [0, -18] }
        );

        marker.addTo(markersGroup);
      }
    });
  }, [clusters]);

  const handleCenterOnUser = () => {
    const loc = userLocationRef.current;
    if (mapInstanceRef.current && loc) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 15, { animate: true });
    }
    refreshLocation();
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto z-1000 flex items-center gap-2 flex-wrap pointer-events-auto">
        {/* Filter Pills */}
        <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-neutral-200/80 dark:border-neutral-800 p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs font-medium rounded-xl transition ${
              filterMode === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            All Tasks ({mappedTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('located')}
            className={`px-3 py-1 text-xs font-medium rounded-xl transition flex items-center gap-1 ${
              filterMode === 'located'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block border border-white" />
            Pinned ({mappedTasks.filter((m) => m.hasDirectLocation).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unlocated')}
            className={`px-3 py-1 text-xs font-medium rounded-xl transition flex items-center gap-1 ${
              filterMode === 'unlocated'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block border border-white" />
            Near You ({mappedTasks.filter((m) => m.isDefaultedToUser).length})
          </button>
        </div>

        {/* Center on My Location Button */}
        <button
          type="button"
          onClick={handleCenterOnUser}
          className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-neutral-200/80 dark:border-neutral-800 p-2 text-neutral-700 dark:text-neutral-300 hover:text-blue-600 transition flex items-center gap-1.5 text-xs font-medium px-3 active:scale-95"
          title="Recenter Map on Current Location"
        >
          <Navigation className="w-4 h-4 text-blue-500" />
          <span className="hidden sm:inline">My Location</span>
        </button>
      </div>

      {/* Full-Screen Map Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

      {/* Cluster Selection Modal: Allows user to pick which task when clicking a grouped number */}
      {clusterModalTasks && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {clusterModalTasks.length} Tasks in this Area
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setClusterModalTasks(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2">
              {clusterModalTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setClusterModalTasks(null);
                    setSelectedTaskForPreview(task);
                  }}
                  className="p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {task.title}
                    </h4>
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {task.location?.name || 'Near your location'}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 shrink-0">
                    Select
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Task Preview Card (Bottom Popout) */}
      {selectedTaskForPreview && (
        <div className="absolute bottom-20 left-3 right-3 sm:left-6 sm:right-auto sm:w-96 z-1000 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-neutral-200/80 dark:border-neutral-800 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span className="truncate">
                  {selectedTaskForPreview.location?.name || 'In circle around your location'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {selectedTaskForPreview.title}
              </h3>
              {selectedTaskForPreview.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                  {selectedTaskForPreview.description}
                </p>
              )}
              {selectedTaskForPreview.dueDate && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-2">
                  <Calendar className="w-3 h-3" />
                  <span>{formatAppleDate(selectedTaskForPreview.dueDate)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedTaskForPreview(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                celebrateTaskCompletion(e.currentTarget as HTMLElement);
                toggleTaskCompleted(selectedTaskForPreview.id);
                setSelectedTaskForPreview(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete
            </button>
            <button
              type="button"
              onClick={() => {
                openTaskModal(selectedTaskForPreview.id);
                setSelectedTaskForPreview(null);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl hover:opacity-90 transition"
            >
              View & Edit Task
            </button>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-md text-[11px] space-y-1 pointer-events-none hidden sm:block">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
          <span className="text-neutral-600 dark:text-neutral-300">Pinned Place</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
          <span className="text-neutral-600 dark:text-neutral-300">Circle Around You</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border border-white">
            2+
          </span>
          <span className="text-neutral-600 dark:text-neutral-300">Overlapping Group</span>
        </div>
      </div>
    </div>
  );
};
