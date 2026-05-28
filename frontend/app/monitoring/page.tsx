"use client";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../../lib/api";

interface TripAlert {
  bookingId: number;
  type: string;
  message: string;
  hoursOverdue?: number;
  lateFeeStatus?: string | null;
  extraDayFeeStatus?: string | null;
  amountDue?: number;
  booking?: {
    id: number;
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    vehicle?: {
      make?: string;
      model?: string;
    };
    returnDatetime?: string;
  };
}

export default function MonitoringPage() {
  const [alerts, setAlerts] = useState<TripAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingFees, setProcessingFees] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAlerts();
  }, []);

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

  async function handleChargeFee(bookingId: number, feeType: 'late' | 'extraDay') {
    if (processingFees.has(bookingId)) return;
    
    setProcessingFees(prev => new Set(prev).add(bookingId));
    
    try {
      const endpoint =
        feeType === 'late'
          ? `/bookings/${bookingId}/charge-late-fee`
          : `/bookings/${bookingId}/charge-extra-day-fee`;
      await api.post(endpoint);
      
      // Refresh alerts after charging fee
      await fetchAlerts();
    } catch (err) {
      console.error(`Failed to charge ${feeType} fee:`, err);
      alert(`Failed to charge ${feeType} fee. Please try again.`);
    } finally {
      setProcessingFees(prev => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  async function handleSkipLateFee(bookingId: number) {
    if (processingFees.has(bookingId)) return;
    
    setProcessingFees(prev => new Set(prev).add(bookingId));
    
    try {
      await api.post(`/bookings/${bookingId}/skip-late-fee`);
      
      // Refresh alerts after skipping fee
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to skip late fee:', err);
      alert('Failed to skip late fee. Please try again.');
    } finally {
      setProcessingFees(prev => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-zinc-900">Trip Monitoring</h1>
        {loading && <p className="text-zinc-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && alerts.length === 0 && <p className="text-zinc-600">No issues detected.</p>}
        <ul className="space-y-4">
          {alerts.map((alert) => {
            const isOverdue = alert.type === 'overdue';
            const customer = alert.booking?.customer;
            const vehicle = alert.booking?.vehicle;
            const guestName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Guest';
            const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : 'Unknown Vehicle';
            
            return (
              <li key={alert.bookingId + alert.type} className="rounded-xl border border-yellow-300 p-5 bg-yellow-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg text-zinc-900">Booking #{alert.bookingId}</div>
                    {isOverdue && (
                      <>
                        <div className="text-sm text-zinc-700 mt-1">Guest: {guestName}</div>
                        <div className="text-sm text-zinc-600">Vehicle: {vehicleName}</div>
                        {alert.hoursOverdue && (
                          <div className="text-sm text-red-600 font-medium mt-1">
                            {alert.hoursOverdue} hours overdue
                          </div>
                        )}
                        {typeof alert.amountDue === 'number' && (
                          <div className="text-sm text-zinc-700 mt-1">
                            Amount due: ${alert.amountDue.toFixed(2)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {isOverdue && (
                    <div className="flex flex-col gap-2">
                      {alert.lateFeeStatus === 'eligible' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleChargeFee(alert.bookingId, 'late')}
                            disabled={processingFees.has(alert.bookingId)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingFees.has(alert.bookingId) ? 'Processing...' : 'Charge $20 Late Fee'}
                          </button>
                          <button
                            onClick={() => handleSkipLateFee(alert.bookingId)}
                            disabled={processingFees.has(alert.bookingId)}
                            className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                      {alert.lateFeeStatus === 'charged' && (
                        <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
                          Late Fee Charged
                        </span>
                      )}
                      {alert.lateFeeStatus === 'skipped' && (
                        <span className="px-3 py-1.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg">
                          Late Fee Skipped
                        </span>
                      )}
                      
                      {alert.extraDayFeeStatus === 'eligible' && (
                        <button
                          onClick={() => handleChargeFee(alert.bookingId, 'extraDay')}
                          disabled={processingFees.has(alert.bookingId)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingFees.has(alert.bookingId) ? 'Processing...' : 'Charge Extra Day Fee'}
                        </button>
                      )}
                      {alert.extraDayFeeStatus === 'charged' && (
                        <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
                          Extra Day Fee Charged
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-yellow-800">{alert.message}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
