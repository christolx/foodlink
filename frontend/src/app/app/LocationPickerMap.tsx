"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const JAKARTA: [number, number] = [-6.2088, 106.8456];

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:inline-flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35))">
      <div style="background:#0b5b2b;width:20px;height:20px;border-radius:50%;border:3px solid white"></div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #0b5b2b;margin-top:-2px"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({
  initialCenter,
  onConfirm,
  onClose,
}: {
  initialCenter: [number, number];
  onConfirm: (coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}) {
  const [marker, setMarker] = useState<[number, number]>(
    initialCenter ?? JAKARTA,
  );

  return (
    <div className="flex h-full flex-col">
      <MapContainer
        center={marker}
        zoom={15}
        style={{ flex: 1, minHeight: 0 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onMapClick={(lat, lng) => setMarker([lat, lng])} />
        <Marker
          position={marker}
          icon={pinIcon()}
          draggable
          eventHandlers={{
            dragend(e) {
              const pos = (e.target as L.Marker).getLatLng();
              setMarker([pos.lat, pos.lng]);
            },
          }}
        />
      </MapContainer>
      <div className="flex items-center justify-between gap-3 border-t border-[#ded7c9] bg-[#fffdf8] px-4 py-3">
        <span className="font-mono text-xs font-bold text-[#46534a]">
          {marker[0].toFixed(6)}, {marker[1].toFixed(6)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#cfc8ba] px-4 py-2 text-xs font-black text-[#46534a] hover:bg-[#f4f0e8]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#0b5b2b] px-4 py-2 text-xs font-black text-white hover:bg-[#064c25]"
            onClick={() => onConfirm({ lat: marker[0], lng: marker[1] })}
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>
  );
}
