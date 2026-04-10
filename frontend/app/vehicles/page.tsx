"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import AppShell from "../components/AppShell";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  status: string;
  dailyRate: number;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get("/vehicles");
      setVehicles(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load vehicles");
    }
  };

  const filteredVehicles = useMemo(() => {
  return vehicles.filter((vehicle) => {
    const search = searchTerm.toLowerCase().trim();
    const normalizedStatus = (vehicle.status || "").toLowerCase();

    const matchesSearch =
      (vehicle.make || "").toLowerCase().includes(search) ||
      (vehicle.model || "").toLowerCase().includes(search) ||
      (vehicle.plateNumber || "").toLowerCase().includes(search) ||
      vehicle.year.toString().includes(search);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "booked" &&
        (normalizedStatus === "booked" || normalizedStatus === "rented")) ||
      normalizedStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });
}, [vehicles, searchTerm, statusFilter]);



  const getStatusBadge = (status: string) => {
  const normalized = (status || "").toLowerCase();

  if (normalized === "available") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "booked" || normalized === "rented") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (normalized === "maintenance") {
    return "bg-red-100 text-red-700";
  }

  if (normalized === "unavailable") {
    return "bg-gray-200 text-gray-700";
  }

  return "bg-blue-100 text-blue-700";
};

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Vehicles</h1>

        <Link
          href="/vehicles/new"
          className="bg-black text-white px-4 py-2 rounded w-fit"
        >
          + Add Vehicle
        </Link>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by make, model, plate, or year"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-80"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-56"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Make</th>
              <th className="text-left p-4">Model</th>
              <th className="text-left p-4">Year</th>
              <th className="text-left p-4">Plate</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Rate</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-t">
                  <td className="p-4">{vehicle.make}</td>
                  <td className="p-4">{vehicle.model}</td>
                  <td className="p-4">{vehicle.year}</td>
                  <td className="p-4">{vehicle.plateNumber}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                        vehicle.status
                      )}`}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="p-4">${vehicle.dailyRate}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  No vehicles found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}