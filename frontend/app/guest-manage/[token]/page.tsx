"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import api from "../../../lib/api";

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
    make?: string;
    model?: string;
    plateNumber?: string;
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
  const params = useParams();
  const searchParams = useSearchParams();

  const token = String(params.token || "");
  const initialAction = searchParams.get("action") || "";
  const isModifyFlow = initialAction === "modify";
  const isCancelFlow = initialAction === "cancel";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [returnDatetime, setReturnDatetime] = useState("");
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired booking link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadBooking();
    }
  }, [token]);

  useEffect(() => {
    if (isCancelFlow) {
      setMessage("This link opened the cancel flow. Review and confirm below.");
    }
    if (isModifyFlow) {
      setMessage("This link opened the modify flow. Update dates and save your reservation.");
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

    try {
      setSaving(true);
      await api.patch(`/public/manage/${token}/modify`, {
        pickupDatetime: new Date(pickupDatetime).toISOString(),
        returnDatetime: new Date(returnDatetime).toISOString(),
      });
      setMessage(
        "Booking updated successfully. Your reservation remains active with the new dates."
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
      const emailMessage = res.data?.data?.cancellationEmail?.message;
      setMessage(
        emailMessage
          ? `Booking cancelled successfully. ${emailMessage}`
          : "Booking cancelled successfully."
      );
      await loadBooking();
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900">Manage Your Booking</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Use this secure link to modify your reservation dates or cancel your booking.
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

        {booking && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
            <p className="text-sm text-zinc-700">Booking #{booking.id}</p>
            <p className="text-sm text-zinc-700">Status: <span className="font-semibold">{booking.status}</span></p>
            <p className="text-sm text-zinc-700">
              Vehicle: {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.plateNumber})
            </p>
            <p className="text-sm text-zinc-700">Total: ${Number(booking.totalAmount || 0).toFixed(2)}</p>
          </section>
        )}

        {booking && canEdit && !isCancelFlow && (
          <form onSubmit={handleModify} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Modify Reservation</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Pickup</label>
              <input
                type="datetime-local"
                value={pickupDatetime}
                onChange={(e) => setPickupDatetime(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Return</label>
              <input
                type="datetime-local"
                value={returnDatetime}
                onChange={(e) => setReturnDatetime(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              />
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
            <h2 className="text-lg font-semibold text-zinc-900">Cancel Reservation</h2>
            <p className="text-sm text-zinc-600">
              Need to cancel? This action will mark your booking as cancelled immediately.
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
              This booking can no longer be modified or cancelled from this link.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
