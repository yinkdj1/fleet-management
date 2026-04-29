"use client";
import { useEffect, useState } from "react";

interface TripAlert {
  bookingId: number;
  type: string;
  message: string;
}

export default function MonitoringPage() {
  const [alerts, setAlerts] = useState<TripAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/monitor/trips");
        const data = await res.json();
        setAlerts(data.data || []);
      } catch (err) {
        setError("Failed to load trip monitoring alerts.");
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Trip Monitoring</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && alerts.length === 0 && <p>No issues detected.</p>}
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.bookingId + alert.type} className="rounded border p-4 bg-yellow-50 border-yellow-300">
            <div className="font-semibold">Booking #{alert.bookingId}</div>
            <div className="text-sm text-yellow-800">{alert.message}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
