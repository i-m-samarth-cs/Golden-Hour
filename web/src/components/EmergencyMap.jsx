"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Building2, AlertCircle } from "lucide-react";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoia3Jpc3JzMTEyOCIsImEiOiJjbDYzdjJzczQya3JzM2Jtb2E0NWU1a3B3In0.Mk4-pmKi_klg3EKfTw-JbQ";

export default function EmergencyMap({
  emergencies,
  responders,
  focusEmergency,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef([]);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Load Mapbox GL JS
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js";
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.href = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    script.onload = () => {
      if (!window.mapboxgl) return;

      window.mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-73.9855, 40.758], // NYC default
        zoom: 12,
      });

      map.current.on("load", () => {
        setMapLoaded(true);
      });

      map.current.addControl(
        new window.mapboxgl.NavigationControl(),
        "top-right",
      );
    };

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !window.mapboxgl) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new window.mapboxgl.LngLatBounds();

    // Add emergency markers
    emergencies.forEach((emergency) => {
      if (!emergency.location_lat || !emergency.location_lng) return;

      const el = document.createElement("div");
      el.className = "emergency-marker";
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${emergency.severity === "critical" ? "#DC2626" : emergency.severity === "high" ? "#F59E0B" : "#FBBF24"};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          animation: pulse 2s infinite;
        ">
          ${emergency.id}
        </div>
      `;

      const popup = new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Emergency #${emergency.id}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Patient:</strong> ${emergency.patient_name}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Severity:</strong> <span style="color: ${emergency.severity === "critical" ? "#DC2626" : "#F59E0B"}; text-transform: capitalize;">${emergency.severity}</span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Status:</strong> ${emergency.status.replace("_", " ")}
          </div>
          <div style="font-size: 12px; color: #666;">
            <strong>Symptoms:</strong> ${emergency.symptoms}
          </div>
        </div>
      `);

      const marker = new window.mapboxgl.Marker(el)
        .setLngLat([emergency.location_lng, emergency.location_lat])
        .setPopup(popup)
        .addTo(map.current);

      markersRef.current.push(marker);
      bounds.extend([emergency.location_lng, emergency.location_lat]);
    });

    // Add hospital markers
    responders
      .filter((r) => r.type === "hospital")
      .forEach((hospital) => {
        if (!hospital.latitude || !hospital.longitude) return;

        const el = document.createElement("div");
        el.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: #2563EB;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
        ">
          🏥
        </div>
      `;

        const popup = new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${hospital.name}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Type:</strong> ${hospital.specialty}
          </div>
          <div style="font-size: 12px; color: #666;">
            <strong>Status:</strong> <span style="color: ${hospital.available ? "#10B981" : "#EF4444"};">${hospital.available ? "Available" : "Busy"}</span>
          </div>
        </div>
      `);

        const marker = new window.mapboxgl.Marker(el)
          .setLngLat([hospital.longitude, hospital.latitude])
          .setPopup(popup)
          .addTo(map.current);

        markersRef.current.push(marker);
        bounds.extend([hospital.longitude, hospital.latitude]);
      });

    // Add ambulance markers
    responders
      .filter((r) => r.type === "ambulance")
      .forEach((ambulance) => {
        if (!ambulance.latitude || !ambulance.longitude) return;

        const el = document.createElement("div");
        el.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${ambulance.available ? "#10B981" : "#F59E0B"};
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
        ">
          🚑
        </div>
      `;

        const popup = new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 160px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${ambulance.name}</div>
          <div style="font-size: 12px; color: #666;">
            <strong>Status:</strong> <span style="color: ${ambulance.available ? "#10B981" : "#F59E0B"};">${ambulance.available ? "Available" : "En Route"}</span>
          </div>
        </div>
      `);

        const marker = new window.mapboxgl.Marker(el)
          .setLngLat([ambulance.longitude, ambulance.latitude])
          .setPopup(popup)
          .addTo(map.current);

        markersRef.current.push(marker);
        bounds.extend([ambulance.longitude, ambulance.latitude]);
      });

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Focus on specific emergency if provided
    if (
      focusEmergency &&
      focusEmergency.location_lat &&
      focusEmergency.location_lng
    ) {
      map.current.flyTo({
        center: [focusEmergency.location_lng, focusEmergency.location_lat],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [mapLoaded, emergencies, responders, focusEmergency]);

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold mb-2">Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600" />
            <span>Critical Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-xs">
              🏥
            </div>
            <span>Hospital</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">
              🚑
            </div>
            <span>Ambulance (Available)</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
