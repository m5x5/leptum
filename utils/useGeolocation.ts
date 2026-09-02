import { useEffect, useRef, useState } from 'react';

export interface GeolocationState {
  position: { lat: number; lon: number } | null;
  error: GeolocationPositionError | null;
  supported: boolean;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 120000, // 2 minutes - saves battery
  timeout: 30000,
};

export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !state.supported) return;

    const onSuccess = (pos: GeolocationPosition) => {
      setState(prev => ({
        ...prev,
        position: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        error: null,
      }));
    };

    const onError = (err: GeolocationPositionError) => {
      setState(prev => ({ ...prev, error: err }));
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, GEO_OPTIONS);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, state.supported]);

  return state;
}
