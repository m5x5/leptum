import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack/next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  lat: number;
  lon: number;
  radius: number;
  onMapClick: (lat: number, lon: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lon });

  useEffect(() => {
    if (prevRef.current.lat !== lat || prevRef.current.lon !== lon) {
      map.setView([lat, lon], map.getZoom());
      prevRef.current = { lat, lon };
    }
  }, [lat, lon, map]);

  return null;
}

export default function LocationMap({ lat, lon, radius, onMapClick }: LocationMapProps) {
  const position: [number, number] = [lat, lon];
  const hasPosition = lat !== 0 || lon !== 0;

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      <MapCenterUpdater lat={lat} lon={lon} />
      {hasPosition && (
        <>
          <Marker position={position} icon={defaultIcon} />
          <Circle
            center={position}
            radius={radius}
            pathOptions={{
              color: 'hsl(262, 83%, 58%)',
              fillColor: 'hsl(262, 83%, 58%)',
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
