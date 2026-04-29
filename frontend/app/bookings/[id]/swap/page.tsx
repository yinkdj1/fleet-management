"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { formatBookingId } from "../../../../lib/bookingId";
import { formatCustomerName } from "../../../../lib/displayHelpers";
import AppShell from "../../../components/AppShell";

type BookingDetail = {
  id: number;
  status: string;
  pickupDatetime: string;
  returnDatetime: string;
  totalAmount?: number;
  vehicleId?: number;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
  vehicle?: {
    id?: number;
    make?: string;
    model?: string;
    plateNumber?: string;
    year?: number;
    dailyRate?: number;
  };
};

type VehicleOption = {
  id: number;
  make?: string;
  model?: string;
  plateNumber?: string;
  year?: number;
  dailyRate?: number;
  status?: string;
};

export default function SwapBookingVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params.id);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedVehicle = useMemo(
    () => availableVehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null,
    [availableVehicles, selectedVehicleId]
  );

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(bookingId) || bookingId <= 0) {
        setError("Invalid booking ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const bookingRes = await api.get(`/bookings/${bookingId}`);
        const bookingPayload = bookingRes.data?.data || bookingRes.data;
        const currentBooking = bookingPayload as BookingDetail;
        setBooking(currentBooking);

        const normalizedStatus = (currentBooking.status || "").toLowerCase();
        if (!["reserved", "active"].includes(normalizedStatus)) {
          setError("Only reserved or active bookings can swap vehicles.");
          setAvailableVehicles([]);
          return;
        }

        const vehiclesRes = await api.get("/vehicles/available", {
          params: {
            pickupDatetime: currentBooking.pickupDatetime,
            returnDatetime: currentBooking.returnDatetime,
            excludeBookingId: currentBooking.id,
          },
        });

        const payload = (vehiclesRes.data?.data || []) as VehicleOption[];
        const filtered = payload.filter(
          (vehicle) => Number(vehicle.id) !== Number(currentBooking.vehicle?.id || currentBooking.vehicleId)
        );

        setAvailableVehicles(filtered);
        setSelectedVehicleId(filtered.length ? filtered[0].id : null);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load booking swap data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  const handleSwap = async () => {
    if (!booking || !selectedVehicleId) {
      return;
    }

    try {
      setSwapping(true);
      setError("");
      setMessage("");

      const res = await api.patch(`/bookings/${booking.id}/swap-vehicle`, {
        vehicleId: selectedVehicleId,
      });

      const updated = (res.data?.data || null) as BookingDetail | null;
      if (updated) {
        setBooking(updated);
      }

      setMessage(
        `Vehicle swapped successfully for booking ${formatBookingId(booking.id)}.`
      );

      router.push(`/bookings/${booking.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to swap booking vehicle.");
    } finally {
      setSwapping(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Swap Booking Vehicle</h1>
        <Link href="/bookings" className="rounded border px-3 py-2 text-sm">
          Back to Bookings
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-600">Loading booking and available vehicles...</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 text-sm text-emerald-700">{message}</p>}

      {booking && (
        <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Booking {formatBookingId(booking.id)}</h2>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-gray-600">Status:</span> <span className="font-medium">{booking.status}</span>
            </p>
            <p>
              <span className="text-gray-600">Guest:</span> <span className="font-medium">{formatCustomerName(booking.customer) || "-"}</span>
            </p>
            <p>
              <span className="text-gray-600">Pickup:</span>{" "}
              <span className="font-medium">{new Date(booking.pickupDatetime).toLocaleString()}</span>
            </p>
            <p>
              <span className="text-gray-600">Return:</span>{" "}
              <span className="font-medium">{new Date(booking.returnDatetime).toLocaleString()}</span>
            </p>
            <p>
              <span className="text-gray-600">Current Vehicle:</span>{" "}
              <span className="font-medium">
                {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.plateNumber})
              </span>
            </p>
          </div>
        </section>
      )}

      {!loading && booking && !error && (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Available Vehicles For This Booking Window</h2>

          {availableVehicles.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              No alternate vehicles are available for this booking timeframe.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {availableVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedVehicleId;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-600">Plate: {vehicle.plateNumber || "-"}</p>
                    <p className="text-sm text-gray-600">Year: {vehicle.year || "-"}</p>
                    <p className="text-sm text-gray-600">
                      Daily Rate: ${Number(vehicle.dailyRate || 0).toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {selectedVehicle && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900">
                Confirm swap to <span className="font-semibold">{selectedVehicle.make} {selectedVehicle.model}</span> ({selectedVehicle.plateNumber})?
              </p>
              <button
                type="button"
                onClick={handleSwap}
                disabled={swapping}
                className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {swapping ? "Swapping..." : "Confirm Vehicle Swap"}
              </button>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
