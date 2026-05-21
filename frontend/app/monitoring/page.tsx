"use client";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";

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
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log('[Monitoring] API response:', data);
        if (data.success === false) {
          throw new Error(data.error || 'Failed to load alerts');
        }
        setAlerts(data.data || []);
      } catch (err) {
        console.error('[Monitoring] Error:', err);
        setError(err instanceof Error ? err.message : "Failed to load trip monitoring alerts.");
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-zinc-900">Trip Monitoring</h1>
        {loading && <p className="text-zinc-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && alerts.length === 0 && <p className="text-zinc-600">No issues detected.</p>}
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.bookingId + alert.type} className="rounded-xl border border-yellow-300 p-4 bg-yellow-50">
              <div className="font-semibold text-zinc-900">Booking #{alert.bookingId}</div>
              <div className="text-sm text-yellow-800">{alert.message}</div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
