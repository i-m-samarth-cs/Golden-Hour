"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  MapPin,
  Activity,
  Clock,
  FileText,
  CheckSquare,
  Map as MapIcon,
} from "lucide-react";
import EmergencyMap from "@/components/EmergencyMap";

export default function EmergencyDetailPage({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        const response = await fetch(`/api/emergencies/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch emergency");
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching emergency:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergency();
    const interval = setInterval(fetchEmergency, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Emergency not found</div>
      </div>
    );
  }

  const { emergency, agentLogs, followUpTasks } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <a
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </a>
          <h1 className="text-3xl font-bold text-gray-900">
            Emergency Case #{emergency.id}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Map Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <MapIcon size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Emergency Location
              </h2>
            </div>
            <div style={{ height: "400px" }}>
              <EmergencyMap
                emergencies={[emergency]}
                responders={[
                  emergency.ambulance_name && emergency.ambulance_lat
                    ? {
                        id: "ambulance",
                        type: "ambulance",
                        name: emergency.ambulance_name,
                        latitude: emergency.ambulance_lat,
                        longitude: emergency.ambulance_lng,
                        available: false,
                      }
                    : null,
                  emergency.hospital_name && emergency.hospital_lat
                    ? {
                        id: "hospital",
                        type: "hospital",
                        name: emergency.hospital_name,
                        specialty: "Emergency",
                        latitude: emergency.hospital_lat,
                        longitude: emergency.hospital_lng,
                        available: true,
                      }
                    : null,
                ].filter(Boolean)}
                focusEmergency={emergency}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Patient Information
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-semibold text-gray-900">
                    {emergency.patient_name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Age</div>
                  <div className="font-semibold text-gray-900">
                    {emergency.patient_age || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Blood Type</div>
                  <div className="font-semibold text-gray-900">
                    {emergency.blood_type || "Unknown"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Allergies</div>
                  <div className="font-semibold text-gray-900">
                    {emergency.allergies || "None reported"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">
                    Medical Conditions
                  </div>
                  <div className="font-semibold text-gray-900">
                    {emergency.medical_conditions || "None reported"}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={24} className="text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Emergency Details
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Severity</div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      emergency.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : emergency.severity === "high"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {emergency.severity}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Emotional State</div>
                  <div className="font-semibold text-gray-900">
                    {emergency.emotional_state || "Not detected"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Symptoms</div>
                  <div className="font-semibold text-gray-900">
                    {emergency.symptoms}
                  </div>
                </div>
                {emergency.voice_transcript && (
                  <div>
                    <div className="text-sm text-gray-500">
                      Voice Transcript
                    </div>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-700 italic">
                      "{emergency.voice_transcript}"
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="flex items-center gap-2 text-gray-900">
                    <MapPin size={16} />
                    <span>
                      {emergency.location_lat?.toFixed(4)},{" "}
                      {emergency.location_lng?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Activity Log */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={24} className="text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Agent Activity Log
                </h2>
                <span className="text-sm text-gray-500">
                  (Blockchain-backed)
                </span>
              </div>
              <div className="space-y-3">
                {agentLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">
                        {log.agent_type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {log.action.replace(/_/g, " ")}
                    </div>
                    {log.details && (
                      <div className="mt-1 text-xs text-gray-500 font-mono">
                        Hash: {log.current_hash.substring(0, 16)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={24} className="text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Status</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Current Status</div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {emergency.status.replace("_", " ")}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="text-gray-900">
                    {new Date(emergency.created_at).toLocaleString()}
                  </div>
                </div>
                {emergency.estimated_arrival_time && (
                  <div>
                    <div className="text-sm text-gray-500">
                      Estimated Arrival
                    </div>
                    <div className="text-gray-900 font-semibold">
                      {new Date(
                        emergency.estimated_arrival_time,
                      ).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Resources */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Assigned Resources
              </h2>
              <div className="space-y-3">
                {emergency.ambulance_name && (
                  <div>
                    <div className="text-sm text-gray-500">Ambulance</div>
                    <div className="font-semibold text-gray-900">
                      {emergency.ambulance_name}
                    </div>
                  </div>
                )}
                {emergency.hospital_name && (
                  <div>
                    <div className="text-sm text-gray-500">Hospital</div>
                    <div className="font-semibold text-gray-900">
                      {emergency.hospital_name}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up Tasks */}
            {followUpTasks.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare size={24} className="text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Follow-up Tasks
                  </h2>
                </div>
                <div className="space-y-3">
                  {followUpTasks.map((task) => (
                    <div
                      key={task.id}
                      className="border-l-4 border-green-500 pl-3 py-2"
                    >
                      <div className="font-semibold text-sm text-gray-900">
                        {task.task_type.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.status} •{" "}
                        {new Date(task.scheduled_date).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
