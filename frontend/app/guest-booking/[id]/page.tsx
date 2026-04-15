"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import api from "../../../lib/api";
import { formatBookingId } from "../../../lib/bookingId";

type BookingSummary = {
  id: number;
  status: string;
  pickupDatetime: string;
  returnDatetime: string;
  vehicle?: {
    make?: string;
    model?: string;
    plateNumber?: string;
    imageUrl?: string | null;
  };
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
  };
};

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Empty"];

function toDatetimeLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function GuestBookingWorkflowPage() {
  const params = useParams();
  const bookingId = String(params.id || "");

  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const [mileageOut, setMileageOut] = useState("");
  const [fuelLevelOut, setFuelLevelOut] = useState("Full");
  const [notesOut, setNotesOut] = useState("");
  const [checkoutPhotos, setCheckoutPhotos] = useState<FileList | null>(null);

  const [mileageIn, setMileageIn] = useState("");
  const [fuelLevelIn, setFuelLevelIn] = useState("Full");
  const [notesIn, setNotesIn] = useState("");
  const [checkinPhotos, setCheckinPhotos] = useState<FileList | null>(null);
  const [extendReturnDatetime, setExtendReturnDatetime] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canCheckout = useMemo(() => booking?.status === "reserved", [booking]);
  const canCheckin = useMemo(() => booking?.status === "active", [booking]);

  const loadBooking = async () => {
    setError("");
    setSuccess("");
    setBooking(null);

    if (!lastName.trim() || (!email.trim() && !phone.trim())) {
      setError("Enter last name and either email or phone to continue.");
      return;
    }

    try {
      setLoadingBooking(true);
      const res = await api.get(`/public/bookings/${bookingId}`, {
        params: {
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      });

      const nextBooking = res.data?.data || null;
      setBooking(nextBooking);

      if (nextBooking?.returnDatetime) {
        setExtendReturnDatetime(toDatetimeLocalInput(nextBooking.returnDatetime));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to verify booking.");
    } finally {
      setLoadingBooking(false);
    }
  };

  const submitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!mileageOut.trim()) {
      setError("Mileage is required.");
      return;
    }

    if (!checkoutPhotos || checkoutPhotos.length === 0) {
      setError("At least one checkout photo is required.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("mileageOut", mileageOut.trim());
      formData.append("fuelLevelOut", fuelLevelOut);
      formData.append("notesOut", notesOut.trim());

      for (let i = 0; i < checkoutPhotos.length; i += 1) {
        formData.append("photos", checkoutPhotos[i]);
      }

      await api.post(`/public/bookings/${bookingId}/checkout`, formData);

      setSuccess("Checkout completed successfully.");
      await loadBooking();
    } catch (err: any) {
      setError(err.response?.data?.message || "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!mileageIn.trim()) {
      setError("Mileage is required.");
      return;
    }

    if (!checkinPhotos || checkinPhotos.length === 0) {
      setError("At least one checkin photo is required.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("mileageIn", mileageIn.trim());
      formData.append("fuelLevelIn", fuelLevelIn);
      formData.append("notesIn", notesIn.trim());

      for (let i = 0; i < checkinPhotos.length; i += 1) {
        formData.append("photos", checkinPhotos[i]);
      }

      await api.post(`/public/bookings/${bookingId}/checkin`, formData);

      setSuccess("Checkin completed successfully.");
      await loadBooking();
    } catch (err: any) {
      setError(err.response?.data?.message || "Checkin failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExtendTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!booking) {
      setError("Verify your booking first.");
      return;
    }

    if (!extendReturnDatetime) {
      setError("Select a new return date/time.");
      return;
    }

    const currentReturn = new Date(booking.returnDatetime);
    const nextReturn = new Date(extendReturnDatetime);

    if (nextReturn <= currentReturn) {
      setError("New return date/time must be later than current return date/time.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/public/bookings/${bookingId}/extend`, {
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        returnDatetime: nextReturn.toISOString(),
      });

      const extensionCharge = res.data?.data?.extensionCharge;

      setSuccess(
        extensionCharge
          ? `Trip extended successfully. Extension charge: Rental $${Number(
              extensionCharge.rentalSubtotal || 0
            ).toFixed(2)}, Service $${Number(
              extensionCharge.serviceCharge || 0
            ).toFixed(2)}, Subtotal $${Number(
              extensionCharge.subtotal || 0
            ).toFixed(2)}, Tax $${Number(extensionCharge.tax || 0).toFixed(
              2
            )}, Total $${Number(extensionCharge.total || 0).toFixed(2)}.`
          : "Trip extended successfully."
      );
      await loadBooking();
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.vehicleId ||
          err.response?.data?.message ||
          "Unable to extend trip."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900">Guest Mobile Checkin/Checkout</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Verify your booking, then record mileage, fuel level, and upload photos from your phone camera.
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (or phone)"
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (or email)"
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            />
            <button
              type="button"
              onClick={loadBooking}
              disabled={loadingBooking}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loadingBooking ? "Verifying..." : "Verify Booking"}
            </button>
          </div>
        </section>

        {booking && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm text-zinc-700">Booking ID: {formatBookingId(booking.id)}</p>
            <p className="text-sm text-zinc-700">Status: <span className="font-semibold">{booking.status}</span></p>
            <p className="text-sm text-zinc-700">
              Vehicle: {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.plateNumber})
            </p>
          </section>
        )}

        {canCheckout && (
          <form onSubmit={submitCheckout} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">Guest Checkout</h2>
            <input
              type="number"
              value={mileageOut}
              onChange={(e) => setMileageOut(e.target.value)}
              placeholder="Mileage Out"
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
              required
            />
            <select
              value={fuelLevelOut}
              onChange={(e) => setFuelLevelOut(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            >
              {FUEL_LEVELS.map((fuel) => (
                <option key={fuel} value={fuel}>{fuel}</option>
              ))}
            </select>
            <textarea
              value={notesOut}
              onChange={(e) => setNotesOut(e.target.value)}
              placeholder="Optional note"
              rows={3}
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            />
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-700">Take Car Photos (required)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => setCheckoutPhotos(e.target.files)}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Checkout"}
            </button>
          </form>
        )}

        {canCheckin && (
          <form onSubmit={submitCheckin} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">Guest Checkin</h2>
            <input
              type="number"
              value={mileageIn}
              onChange={(e) => setMileageIn(e.target.value)}
              placeholder="Mileage In"
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
              required
            />
            <select
              value={fuelLevelIn}
              onChange={(e) => setFuelLevelIn(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            >
              {FUEL_LEVELS.map((fuel) => (
                <option key={fuel} value={fuel}>{fuel}</option>
              ))}
            </select>
            <textarea
              value={notesIn}
              onChange={(e) => setNotesIn(e.target.value)}
              placeholder="Optional note"
              rows={3}
              className="w-full rounded-xl border border-zinc-300 bg-white p-3"
            />
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-700">Take Car Photos (required)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => setCheckinPhotos(e.target.files)}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Checkin"}
            </button>
          </form>
        )}

        {booking && (booking.status === "reserved" || booking.status === "active") && (
          <form onSubmit={submitExtendTrip} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">Extend Trip</h2>
            <p className="text-sm text-zinc-600">
              Need more days? Pick a later return date/time. Extension is allowed only if this car is available.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Current Return</label>
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                {new Date(booking.returnDatetime).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">New Return</label>
              <input
                type="datetime-local"
                value={extendReturnDatetime}
                onChange={(e) => setExtendReturnDatetime(e.target.value)}
                min={toDatetimeLocalInput(booking.returnDatetime)}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Trip Extension"}
            </button>
          </form>
        )}

        {booking && !canCheckout && !canCheckin && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-700">
              This booking is not currently eligible for guest checkout/checkin.
            </p>
          </section>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        )}
      </div>
    </main>
  );
}
