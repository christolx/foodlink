"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Location } from "@/lib/api";

const JAKARTA: [number, number] = [-6.2088, 106.8456];

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="transform:translate(-50%,-100%);display:inline-flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <div style="background:${color};color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:6px;white-space:nowrap;border:2px solid white;line-height:1.4">
          ${label}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -48],
  });
}

function toCoords(loc?: Location): [number, number] | null {
  if (loc?.latitude && loc?.longitude) return [loc.latitude, loc.longitude];
  return null;
}

export default function VolunteerMap({
  donorLocation,
  receiverLocation,
  donorLabel,
  receiverLabel,
}: {
  donorLocation?: Location;
  receiverLocation?: Location;
  donorLabel?: string;
  receiverLabel?: string;
}) {
  const [myCoords, setMyCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true },
    );
    const id = navigator.geolocation.watchPosition(
      (pos) => setMyCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const donorCoords = toCoords(donorLocation);
  const receiverCoords = toCoords(receiverLocation);
  const center = myCoords ?? donorCoords ?? receiverCoords ?? JAKARTA;

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {donorCoords && (
        <Marker position={donorCoords} icon={makeIcon("#2f7a46", donorLabel ?? "Donor")}>
          <Popup>{donorLabel ?? "Donor"}</Popup>
        </Marker>
      )}
      {receiverCoords && (
        <Marker position={receiverCoords} icon={makeIcon("#ffb91f", receiverLabel ?? "Receiver")}>
          <Popup>{receiverLabel ?? "Receiver"}</Popup>
        </Marker>
      )}
      {myCoords && (
        <Marker position={myCoords} icon={makeIcon("#287bd5", "You")}>
          <Popup>Your location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
