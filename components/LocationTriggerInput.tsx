import { useState, useEffect, useRef, useCallback } from 'react';
import { LocationTrigger } from './Job/api';
import { Input } from './ui/input';
import dynamic from 'next/dynamic';

interface LocationTriggerInputProps {
  value: LocationTrigger | null;
  onChange: (value: LocationTrigger | null) => void;
}

const RADIUS_OPTIONS = [50, 100, 200, 500, 1000, 2000];
const COOLDOWN_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '4 hours', value: 4 },
  { label: '8 hours', value: 8 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
];

const LocationMap = dynamic(() => import('./LocationMap'), { ssr: false });

export default function LocationTriggerInput({ value, onChange }: LocationTriggerInputProps) {
  const [enabled, setEnabled] = useState(value !== null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleToggle = () => {
    if (enabled) {
      onChange(null);
      setEnabled(false);
    } else {
      setEnabled(true);
      // Try to get current location immediately
      if (navigator.geolocation) {
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            onChange({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              radius: 200,
              cooldownHours: 8,
            });
            setGeoLoading(false);
          },
          () => {
            onChange({ lat: 51.5074, lon: -0.1278, radius: 200, cooldownHours: 8 });
            setGeoLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        onChange({ lat: 51.5074, lon: -0.1278, radius: 200, cooldownHours: 8 });
      }
    }
  };

  const update = useCallback((partial: Partial<LocationTrigger>) => {
    if (!value) return;
    onChange({ ...value, ...partial });
  }, [value, onChange]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleMapClick = useCallback((lat: number, lon: number) => {
    update({ lat, lon });
  }, [update]);

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="rounded border-border"
        />
        Trigger when near a location
      </label>

      {enabled && value && (
        <div className="space-y-3 ml-6 mt-2 p-3 bg-muted/50 rounded-control border border-border">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Label</label>
            <Input
              type="text"
              value={value.label || ''}
              onChange={(e) => update({ label: e.target.value || undefined })}
              placeholder="e.g., Gym, Office, Home..."
            />
          </div>

          {/* Map */}
          <div className="rounded-control overflow-hidden border border-border" style={{ height: 250 }}>
            {geoLoading ? (
              <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
                Getting your location...
              </div>
            ) : (
              <LocationMap
                lat={value.lat}
                lon={value.lon}
                radius={value.radius}
                onMapClick={handleMapClick}
              />
            )}
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geoLoading}
            className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {geoLoading ? 'Getting location...' : 'Use current location'}
          </button>
          {geoError && (
            <p className="text-xs text-destructive">{geoError}</p>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Trigger radius: {value.radius}m
            </label>
            <select
              value={value.radius}
              onChange={(e) => update({ radius: parseInt(e.target.value, 10) })}
              className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}m</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Cooldown</label>
            <select
              value={value.cooldownHours}
              onChange={(e) => update({ cooldownHours: parseInt(e.target.value, 10) })}
              className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              {COOLDOWN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {value.lat !== 0 && value.lon !== 0 && (
            <p className="text-xs text-muted-foreground">
              Will trigger within {value.radius}m of {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
              {value.cooldownHours && ` (cooldown: ${value.cooldownHours}h)`}
            </p>
          )}

          <p className="text-xs text-muted-foreground/70">
            Tap the map to set the trigger location. Location triggers work while the app is open in your browser.
          </p>
        </div>
      )}
    </div>
  );
}
