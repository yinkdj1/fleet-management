"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../../lib/api";

type User = {
  name?: string;
};

type Summary = {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  totalCustomers: number;
  totalBookings: number;
  activeBookings: number;
  reservedBookings: number;
  completedBookings: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/dashboard/summary");
      setSummary(res.data?.data || res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard summary");
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="mb-8 text-gray-600">
        Welcome {user?.name || "User"}
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Total Vehicles</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.totalVehicles ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Available Vehicles</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.availableVehicles ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Rented Vehicles</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.rentedVehicles ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">In Maintenance</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.maintenanceVehicles ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Total Customers</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.totalCustomers ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Total Bookings</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.totalBookings ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Active Bookings</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.activeBookings ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Reserved Bookings</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.reservedBookings ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg">Completed Bookings</h2>
          <p className="text-3xl font-bold mt-3">
            {summary?.completedBookings ?? 0}
          </p>
        </div>
      </div>
    </AppShell>
  );
}