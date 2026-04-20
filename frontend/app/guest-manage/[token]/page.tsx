"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { formatBookingId } from "../../../lib/bookingId";

type BookingInfo = {
  id: number;
  status: string;
  pickupDatetime: string;
  returnDatetime: string;
  totalAmount?: number;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  vehicle?: {
    id?: number;
    make?: string;
    model?: string;
    plateNumber?: string;
  };
};

type VehicleOption = {
  id: number;
  make?: string;
  model?: string;
  plateNumber?: string;
  dailyRate?: number;
};

type CancelledSummary = {
  id: number;
  status: string;
  pickupDatetime?: string;
  returnDatetime?: string;
  totalAmount?: number;
  cancelledAt?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  vehicle?: {
    make?: string;
    model?: string;
    plateNumber?: string;
  };
  cancellationEmail?: {
    message?: string;
  };
};

function toInputDatetime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function GuestManageBookingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const token = String(params.token || "");
  const initialAction = searchParams.get("action") || "";
  const isModifyFlow = initialAction === "modify";
  const isCancelFlow = initialAction === "cancel";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [returnDatetime, setReturnDatetime] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>(
    [],
  );
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [cancelledSummary, setCancelledSummary] =
    useState<CancelledSummary | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canEdit = useMemo(() => booking?.status === "reserved", [booking]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/public/manage/${token}`);
      const data = res.data?.data || null;
      setBooking(data);
      setPickupDatetime(toInputDatetime(data?.pickupDatetime || ""));
      setReturnDatetime(toInputDatetime(data?.returnDatetime || ""));
      setSelectedVehicleId(String(data?.vehicle?.id || ""));
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid or expired booking link.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadBooking();
    }
  }, [token]);

  const loadAvailableVehicles = async (
    pickupValue: string,
    returnValue: string,
    bookingId?: number,
    fallbackVehicleId?: number,
  ) => {
    if (!pickupValue || !returnValue || !bookingId) {
      setAvailableVehicles([]);
      return;
    }

    try {
      setLoadingVehicles(true);
      const res = await api.get("/public/vehicles/available", {
        params: {
          pickupDatetime: new Date(pickupValue).toISOString(),
          returnDatetime: new Date(returnValue).toISOString(),
          excludeBookingId: bookingId,
        },
      });

      const vehicles: VehicleOption[] = res.data?.data || [];
      setAvailableVehicles(vehicles);

      if (vehicles.length === 0) {
        if (fallbackVehicleId) {
          setSelectedVehicleId(String(fallbackVehicleId));
        }
        return;
      }

      const selectedStillAvailable = vehicles.some(
        (vehicle) => String(vehicle.id) === String(selectedVehicleId),
      );

      if (!selectedStillAvailable) {
        const fallbackStillAvailable = fallbackVehicleId
          ? vehicles.some(
              (vehicle) => String(vehicle.id) === String(fallbackVehicleId),
            )
          : false;

        if (fallbackStillAvailable && fallbackVehicleId) {
          setSelectedVehicleId(String(fallbackVehicleId));
        } else {
          setSelectedVehicleId(String(vehicles[0].id));
        }
      }
    } catch {
      setAvailableVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    if (!booking || !canEdit) {
      return;
    }

    loadAvailableVehicles(
      pickupDatetime,
      returnDatetime,
      booking.id,
      booking.vehicle?.id,
    );
  }, [booking?.id, pickupDatetime, returnDatetime, canEdit]);

  useEffect(() => {
    if (isCancelFlow) {
      setMessage("This link opened the cancel flow. Review and confirm below.");
    }
    if (isModifyFlow) {
      setMessage(
        "This link opened the modify flow. Update dates and save your reservation.",
      );
    }
  }, [isCancelFlow, isModifyFlow]);

  const handleModify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!pickupDatetime || !returnDatetime) {
      setError("Pickup and return date/time are required.");
      return;
    }

    if (new Date(returnDatetime) <= new Date(pickupDatetime)) {
      setError("Return must be after pickup.");
      return;
    }

    if (!selectedVehicleId) {
      setError("Please select an available vehicle.");
      return;
    }

    try {
      setSaving(true);
      await api.patch(`/public/manage/${token}/modify`, {
        pickupDatetime: new Date(pickupDatetime).toISOString(),
        returnDatetime: new Date(returnDatetime).toISOString(),
        vehicleId: Number(selectedVehicleId),
      });
      setMessage(
        "Booking updated successfully. Your reservation remains active with the new dates.",
      );
      await loadBooking();
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to modify booking.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setError("");
    setMessage("");

    try {
      setCancelling(true);
      const res = await api.post(`/public/manage/${token}/cancel`);
      const payload = (res.data?.data || null) as CancelledSummary | null;
      const emailMessage = payload?.cancellationEmail?.message;
      setCancelledSummary(payload);
      setMessage(
        emailMessage
          ? `Booking cancelled successfully. ${emailMessage}`
          : "Booking cancelled successfully.",
      );
      setBooking(null);
      setRedirectSeconds(8);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (redirectSeconds === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (redirectSeconds <= 1) {
        setRedirectSeconds(null);
        router.push("/reserve");
        return;
      }

      setRedirectSeconds((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [redirectSeconds, router]);

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900">
            Manage Your Booking
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Use this secure link to modify your reservation dates or cancel your
            booking.
          </p>
        </section>

        {loading && <p className="text-sm text-zinc-700">Loading booking...</p>}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}

        {cancelledSummary && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-2">
            <h2 className="text-lg font-semibold text-emerald-900">
              Reservation Cancelled
            </h2>
            <p className="text-sm text-emerald-800">
              Trip {formatBookingId(cancelledSummary.id)} has been cancelled and
              removed from active bookings.
            </p>
            <p className="text-sm text-emerald-800">
              Vehicle: {cancelledSummary.vehicle?.make}{" "}
              {cancelledSummary.vehicle?.model} (
              {cancelledSummary.vehicle?.plateNumber})
            </p>
            <p className="text-sm text-emerald-800">
              Pickup:{" "}
              {cancelledSummary.pickupDatetime
                ? new Date(cancelledSummary.pickupDatetime).toLocaleString()
                : "-"}
            </p>
            <p className="text-sm text-emerald-800">
              Return:{" "}
              {cancelledSummary.returnDatetime
                ? new Date(cancelledSummary.returnDatetime).toLocaleString()
                : "-"}
            </p>
            <p className="text-sm text-emerald-800">
              Cancelled at:{" "}
              {cancelledSummary.cancelledAt
                ? new Date(cancelledSummary.cancelledAt).toLocaleString()
                : "-"}
            </p>
            {redirectSeconds !== null && (
              <p className="text-sm font-medium text-emerald-900">
                Redirecting to new reservation in {redirectSeconds}s...
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setRedirectSeconds(null);
                router.push("/reserve");
              }}
              className="mt-2 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Book Another Trip
            </button>
          </section>
        )}

        {booking && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
            <p className="text-sm text-zinc-700">
              Booking {formatBookingId(booking.id)}
            </p>
            <p className="text-sm text-zinc-700">
              Status: <span className="font-semibold">{booking.status}</span>
            </p>
            <p className="text-sm text-zinc-700">
              Vehicle: {booking.vehicle?.make} {booking.vehicle?.model} (
              {booking.vehicle?.plateNumber})
            </p>
            <p className="text-sm text-zinc-700">
              Total: ${Number(booking.totalAmount || 0).toFixed(2)}
            </p>
          </section>
        )}

        {booking && canEdit && !isCancelFlow && (
          <form
            onSubmit={handleModify}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-semibold text-zinc-900">
              Modify Reservation
            </h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Pickup
              </label>
              <input
                type="datetime-local"
                value={pickupDatetime}
                onChange={(e) => setPickupDatetime(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Return
              </label>
              <input
                type="datetime-local"
                value={returnDatetime}
                onChange={(e) => setReturnDatetime(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Vehicle
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              >
                {loadingVehicles ? (
                  <option value="">Loading available vehicles...</option>
                ) : availableVehicles.length === 0 ? (
                  <option value="">
                    No available vehicles for selected dates
                  </option>
                ) : (
                  availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.plateNumber}) - $
                      {Number(vehicle.dailyRate || 0).toFixed(2)}/day
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Choose any available vehicle for the selected pickup and return
                window.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Updating..." : "Save New Dates"}
            </button>
          </form>
        )}

        {booking && canEdit && !isModifyFlow && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">
              Cancel Reservation
            </h2>
            <p className="text-sm text-zinc-600">
              Need to cancel? This action will cancel and remove your booking
              immediately.
            </p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          </section>
        )}

        {booking && !canEdit && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-700">
              This booking can no longer be modified or cancelled from this
              link.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
