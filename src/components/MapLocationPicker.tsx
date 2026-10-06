import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass } from 'lucide-react';
import { TaskLocation } from '../types/todo';

// Fix Leaflet's default icon url bug with bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapLocationPickerProps {
  value?: TaskLocation;
  onChange: (location: TaskLocation | undefined) => void;
  currentUserLocation: { lat: number; lng: number } | null;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  currentUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userLocCircleRef = useRef<L.CircleMarker | null>(null);

  // Default to user's real/current location if available, otherwise SF
  const fallbackLat = currentUserLocation ? currentUserLocation.lat : 37.7749;
  const fallbackLng = currentUserLocation ? currentUserLocation.lng : -122.4194;

  const [name, setName] = useState(value?.name || '');
  const [details, setDetails] = useState(value?.details || '');
  const [lat, setLat] = useState<number>(value?.lat || fallbackLat);
  const [lng, setLng] = useState<number>(value?.lng || fallbackLng);
  const [hasLocation, setHasLocation] = useState(!!value);

  // When user clicks "Pin Location on Map" to open the map, actively prompt for location if needed and default pin
  const handleToggleLocation = async () => {
    if (!hasLocation) {
      if (!currentUserLocation) {
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            await Geolocation.requestPermissions({ permissions: ['location'] });
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          if (pos?.coords) {
            const curLat = pos.coords.latitude;
            const curLng = pos.coords.longitude;
            setLat(curLat);
            setLng(curLng);
            if (!name) setName('My Current Location');
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([curLat, curLng], 15);
              if (markerRef.current) markerRef.current.setLatLng([curLat, curLng]);
            }
          }
        } catch {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const curLat = pos.coords.latitude;
                const curLng = pos.coords.longitude;
                setLat(curLat);
                setLng(curLng);
                if (!name) setName('My Current Location');
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([curLat, curLng], 15);
                  if (markerRef.current) markerRef.current.setLatLng([curLat, curLng]);
                }
              },
              () => {},
              { enableHighAccuracy: true, timeout: 8000 }
            );
          }
        }
      }

      const initialLat = currentUserLocation ? currentUserLocation.lat : lat;
      const initialLng = currentUserLocation ? currentUserLocation.lng : lng;
      setLat(initialLat);
      setLng(initialLng);
      if (!name) {
        setName(currentUserLocation ? 'My Current Location' : 'Pinned Location');
      }
      setHasLocation(true);
    } else {
      setHasLocation(false);
    }
  };

  // Function to place/update the user's current location pulsing blue dot indicator
  const updateUserLocationIndicator = useCallback((map: L.Map) => {
    if (!currentUserLocation) {
      if (userLocCircleRef.current) {
        userLocCircleRef.current.remove();
        userLocCircleRef.current = null;
      }
      return;
    }

    if (!userLocCircleRef.current) {
      const circle = L.circleMarker([currentUserLocation.lat, currentUserLocation.lng], {
        radius: 7,
        fillColor: '#3b82f6', // Bright iOS blue
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      circle.bindTooltip('You are here', {
        permanent: false,
        direction: 'top',
        className: 'text-xs font-sans',
      });

      userLocCircleRef.current = circle;
    } else {
      userLocCircleRef.current.setLatLng([currentUserLocation.lat, currentUserLocation.lng]);
    }
  }, [currentUserLocation]);

  // Initialize or update Leaflet map
  useEffect(() => {
    if (!hasLocation || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Render draggable target pin
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
      });

      // Clicking anywhere on map moves the pin there
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      });

      // Add user current location indicator
      updateUserLocationIndicator(map);

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    } else {
      mapInstanceRef.current.setView([lat, lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      updateUserLocationIndicator(mapInstanceRef.current);
    }
  }, [hasLocation, lat, lng, updateUserLocationIndicator]);

  // Keep user location indicator in sync if coordinates update while map is open
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateUserLocationIndicator(mapInstanceRef.current);
    }
  }, [currentUserLocation, updateUserLocationIndicator]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        userLocCircleRef.current = null;
      }
    };
  }, []);

  // Update parent when fields change
  useEffect(() => {
    if (hasLocation) {
      onChange({
        name: name.trim() || 'Custom Pinned Location',
        lat,
        lng,
        details: details.trim() || undefined,
      });
    } else {
      onChange(undefined);
    }
  }, [hasLocation, name, details, lat, lng, onChange]);

  const handleUseCurrentLocation = async () => {
    let target = currentUserLocation;
    if (!target) {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          await Geolocation.requestPermissions({ permissions: ['location'] });
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        if (pos?.coords) {
          target = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        // fallback
      }
    }

    if (target) {
      setLat(target.lat);
      setLng(target.lng);
      setName((prev) => (prev ? prev : 'My Current Location'));
      setHasLocation(true);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([target.lat, target.lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([target.lat, target.lng]);
        }
      }
    }
  };

  const handlePreset = (presetName: string, pLat: number, pLng: number) => {
    setName(presetName);
    setLat(pLat);
    setLng(pLng);
    setHasLocation(true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([pLat, pLng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([pLat, pLng]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
          Location & Proximity
        </label>
        <button
          type="button"
          onClick={handleToggleLocation}
          className={`text-xs font-medium px-2 py-0.5 rounded transition-colors cursor-pointer ${
            hasLocation
              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100'
              : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100'
          }`}
        >
          {hasLocation ? 'Remove Location' : '+ Pin Location on Map'}
        </button>
      </div>

      {hasLocation && (
        <div className="space-y-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                Place Name / Destination
              </label>
              <input
                type="text"
                placeholder="e.g. SF Headquarters, Central Park"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                Room / Gate / Desk Specifics
              </label>
              <input
                type="text"
                placeholder="e.g. 4th Floor, Conf Room C, Gate 12"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-neutral-400 text-[11px]">Presets:</span>
            {currentUserLocation && (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition"
              >
                <Navigation className="w-2.5 h-2.5 text-blue-500" />
                Current Location
              </button>
            )}
            <button
              type="button"
              onClick={() => handlePreset('Work Office', 37.7749, -122.4194)}
              className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition"
            >
              Work Office
            </button>
            <button
              type="button"
              onClick={() => handlePreset('Home Base', 37.7833, -122.4312)}
              className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition"
            >
              Home Base
            </button>
            <button
              type="button"
              onClick={() => handlePreset('Local Market', 37.769, -122.4467)}
              className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition"
            >
              Market
            </button>
          </div>

          {/* Map view */}
          <div className="relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 h-48 w-full z-0">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute top-2 right-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs px-2 py-1 rounded text-[10px] text-neutral-600 dark:text-neutral-300 shadow-xs z-1000 pointer-events-none flex items-center gap-1">
              <Compass className="w-3 h-3 text-neutral-500" />
              Click or drag pin to position
            </div>
            {/* Visual Legend */}
            {currentUserLocation && (
              <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-neutral-600 dark:text-neutral-300 shadow-xs z-1000 pointer-events-none flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white inline-block" />
                <span>Your Location</span>
              </div>
            )}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono flex items-center justify-between">
            <span>Pinned: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
            {currentUserLocation && (
              <span className="text-[10px] text-neutral-500">
                You: {currentUserLocation.lat.toFixed(4)}, {currentUserLocation.lng.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
