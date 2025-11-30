"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Ambulance,
  Building2,
  Activity,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Map,
} from "lucide-react";
import EmergencyMap from "@/components/EmergencyMap";

export default function CoordinatorDashboard() {
  const [emergencies, setEmergencies] = useState([]);
  const [responders, setResponders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showMap, setShowMap] = useState(true);

  const fetchData = async () => {
    try {
      const [emergenciesRes, respondersRes] = await Promise.all([
        fetch(
          `/api/emergencies/list${selectedStatus !== "all" ? `?status=${selectedStatus}` : ""}`,
        ),
        fetch("/api/responders/list"),
      ]);

      if (!emergenciesRes.ok || !respondersRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const emergenciesData = await emergenciesRes.json();
      const respondersData = await respondersRes.json();

      setEmergencies(emergenciesData.emergencies);
      setResponders(respondersData.responders);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStatus]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedStatus]);

  const handleStatusUpdate = async (emergencyId, newStatus) => {
    try {
      const response = await fetch("/api/emergencies/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-red-500";
      case "assigned":
        return "bg-yellow-500";
      case "in_transit":
        return "bg-blue-500";
      case "at_hospital":
        return "bg-purple-500";
      case "resolved":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const statusOptions = [
    { value: "all", label: "All Cases" },
    { value: "active", label: "Active" },
    { value: "assigned", label: "Assigned" },
    { value: "in_transit", label: "In Transit" },
    { value: "at_hospital", label: "At Hospital" },
    { value: "resolved", label: "Resolved" },
  ];

  const nextStatusMap = {
    active: "assigned",
    assigned: "in_transit",
    in_transit: "at_hospital",
    at_hospital: "resolved",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity size={40} />
              <div className="ml-4">
                <h1 className="text-3xl font-bold">Golden Hour Response</h1>
                <p className="text-red-100 text-sm mt-1">
                  Emergency Coordination Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMap(!showMap)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  showMap
                    ? "bg-white text-red-600"
                    : "bg-red-700 text-white border-2 border-white"
                }`}
              >
                <Map size={20} />
                {showMap ? "Hide Map" : "Show Map"}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh
                    ? "bg-white text-red-600"
                    : "bg-red-700 text-white border-2 border-white"
                }`}
              >
                {autoRefresh ? "● Live" : "Paused"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {emergencies.filter((e) => e.status === "active").length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {emergencies.filter((e) => e.status === "assigned").length}
              </div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {emergencies.filter((e) => e.status === "in_transit").length}
              </div>
              <div className="text-sm text-gray-600">In Transit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {emergencies.filter((e) => e.status === "at_hospital").length}
              </div>
              <div className="text-sm text-gray-600">At Hospital</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {emergencies.filter((e) => e.status === "resolved").length}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Map Section */}
        {showMap && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Live Emergency Map
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Real-time tracking</span>
                </div>
              </div>
              <div style={{ height: "500px" }}>
                <EmergencyMap
                  emergencies={emergencies}
                  responders={responders}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Emergencies List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Emergency Cases
                  </h2>
                  <button
                    onClick={fetchData}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Refresh
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedStatus === option.value
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    Loading...
                  </div>
                ) : emergencies.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No emergencies found
                  </div>
                ) : (
                  emergencies.map((emergency) => (
                    <div key={emergency.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(emergency.status)}`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                #{emergency.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(emergency.severity)}`}
                              >
                                {emergency.severity}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {emergency.emotional_state && (
                                <span className="text-orange-600 font-medium">
                                  {emergency.emotional_state} •
                                </span>
                              )}{" "}
                              {new Date(
                                emergency.created_at,
                              ).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {nextStatusMap[emergency.status] && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(
                                emergency.id,
                                nextStatusMap[emergency.status],
                              )
                            }
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            →{" "}
                            {nextStatusMap[emergency.status].replace("_", " ")}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User size={16} />
                          <span className="font-medium">
                            {emergency.patient_name}
                          </span>
                          {emergency.patient_age && (
                            <span className="text-gray-500">
                              ({emergency.patient_age}y)
                            </span>
                          )}
                          {emergency.blood_type && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              {emergency.blood_type}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 text-gray-700">
                          <AlertCircle size={16} className="mt-0.5" />
                          <span>{emergency.symptoms}</span>
                        </div>

                        {emergency.ambulance_name && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Ambulance size={16} />
                            <span>{emergency.ambulance_name}</span>
                          </div>
                        )}

                        {emergency.hospital_name && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 size={16} />
                            <span>{emergency.hospital_name}</span>
                          </div>
                        )}

                        {emergency.estimated_arrival_time &&
                          emergency.status !== "resolved" && (
                            <div className="flex items-center gap-2 text-blue-600 font-medium">
                              <Clock size={16} />
                              <span>
                                ETA:{" "}
                                {new Date(
                                  emergency.estimated_arrival_time,
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Responders Panel */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Available Resources
                </h2>
              </div>

              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {responders
                  .filter((r) => r.type === "hospital")
                  .map((hospital) => (
                    <div
                      key={hospital.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Building2 size={20} className="text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {hospital.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {hospital.specialty}
                          </div>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${hospital.available ? "bg-green-500" : "bg-red-500"}`}
                        />
                      </div>

                      {hospital.resources.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {hospital.resources.map((resource, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-gray-600">
                                {resource.type.replace("_", " ")}
                              </span>
                              <span
                                className={`font-medium ${resource.available > 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {resource.available}/{resource.total}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Ambulances
                  </div>
                  {responders
                    .filter((r) => r.type === "ambulance")
                    .map((ambulance) => (
                      <div
                        key={ambulance.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Ambulance size={18} className="text-red-600" />
                          <span className="text-sm text-gray-900">
                            {ambulance.name}
                          </span>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${ambulance.available ? "bg-green-500" : "bg-yellow-500"}`}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
