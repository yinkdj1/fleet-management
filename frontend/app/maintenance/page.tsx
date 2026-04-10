"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";
import AppShell from "../components/AppShell";

type MaintenanceRecord = {
  id: number;
  serviceType: string;
  description?: string;
  status: string;
  cost?: number;
  vehicle?: {
    make: string;
    model: string;
    plateNumber: string;
  };
};

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await api.get("/maintenance");
      setRecords(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load maintenance");
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Maintenance</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Vehicle</th>
              <th className="text-left p-4">Plate</th>
              <th className="text-left p-4">Service</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Cost</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-t">
                <td className="p-4">
                  {record.vehicle?.make} {record.vehicle?.model}
                </td>
                <td className="p-4">{record.vehicle?.plateNumber}</td>
                <td className="p-4">{record.serviceType}</td>
                <td className="p-4">{record.status}</td>
                <td className="p-4">${record.cost ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}