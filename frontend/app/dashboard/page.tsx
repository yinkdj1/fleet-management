"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import api from "../../lib/api";
import { formatBookingId } from "../../lib/bookingId";

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

type DashboardBookingStatus = "active" | "reserved" | "completed";

type BookingDetail = {
  id: number;
  status: string;
  pickupDatetime: string;
  returnDatetime: string;
  totalAmount?: number;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
  vehicle?: {
    make?: string;
    model?: string;
    plateNumber?: string;
  };
};

function readStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = localStorage.getItem("user");

  if (!storedUser || storedUser === "undefined" || storedUser === "null") {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

type DiscountSettings = {
  threeDayPercentage: number;
  sevenDayPercentage: number;
  fourteenDayPercentage: number;
  pickupLocation: string;
  tiers: Array<{
    minDays: number;
    percentage: number;
  }>;
  updatedAt?: string | null;
};

const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = {
  threeDayPercentage: 5,
  sevenDayPercentage: 10,
  fourteenDayPercentage: 15,
  pickupLocation: "Main Office",
  tiers: [
    { minDays: 14, percentage: 15 },
    { minDays: 7, percentage: 10 },
    { minDays: 3, percentage: 5 },
  ],
  updatedAt: null,
};

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => readStoredUser());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(
    DEFAULT_DISCOUNT_SETTINGS
  );
  const [discountForm, setDiscountForm] = useState({
    threeDayPercentage: DEFAULT_DISCOUNT_SETTINGS.threeDayPercentage,
    sevenDayPercentage: DEFAULT_DISCOUNT_SETTINGS.sevenDayPercentage,
    fourteenDayPercentage: DEFAULT_DISCOUNT_SETTINGS.fourteenDayPercentage,
    pickupLocation: DEFAULT_DISCOUNT_SETTINGS.pickupLocation,
  });
  const [discountMessage, setDiscountMessage] = useState("");
  const [pickupLocationMessage, setPickupLocationMessage] = useState("");
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [savingPickupLocation, setSavingPickupLocation] = useState(false);
  const [selectedBookingStatus, setSelectedBookingStatus] = useState<DashboardBookingStatus | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetail[]>([]);
  const [loadingBookingDetails, setLoadingBookingDetails] = useState(false);
  const [bookingDetailsError, setBookingDetailsError] = useState("");

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, discountRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/discount-settings"),
      ]);

      const nextSummary = summaryRes.data?.data || summaryRes.data;
      const nextDiscountSettings = discountRes.data?.data || DEFAULT_DISCOUNT_SETTINGS;

      setSummary(nextSummary);
      setDiscountSettings(nextDiscountSettings);
      setDiscountForm({
        threeDayPercentage: Number(nextDiscountSettings.threeDayPercentage || 0),
        sevenDayPercentage: Number(nextDiscountSettings.sevenDayPercentage || 0),
        fourteenDayPercentage: Number(nextDiscountSettings.fourteenDayPercentage || 0),
        pickupLocation: String(nextDiscountSettings.pickupLocation || DEFAULT_DISCOUNT_SETTINGS.pickupLocation),
      });
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setError(errorMessage || "Failed to load dashboard summary");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDiscountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setDiscountForm((prev) => ({
      ...prev,
      [name]: name === "pickupLocation" ? value : value === "" ? 0 : Number(value),
    }));
    setDiscountMessage("");
  };

  const handleDiscountSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSavingDiscounts(true);
      setDiscountMessage("");

      const res = await api.put("/dashboard/discount-settings", discountForm);
      const nextSettings = res.data?.data || DEFAULT_DISCOUNT_SETTINGS;

      setDiscountSettings(nextSettings);
      setDiscountForm({
        threeDayPercentage: Number(nextSettings.threeDayPercentage || 0),
        sevenDayPercentage: Number(nextSettings.sevenDayPercentage || 0),
        fourteenDayPercentage: Number(nextSettings.fourteenDayPercentage || 0),
        pickupLocation: String(nextSettings.pickupLocation || DEFAULT_DISCOUNT_SETTINGS.pickupLocation),
      });
      setDiscountMessage(res.data?.message || "Discount settings updated");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setDiscountMessage(errorMessage || "Failed to update discount settings");
    } finally {
      setSavingDiscounts(false);
    }
  };

  const handlePickupLocationSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSavingPickupLocation(true);
      setPickupLocationMessage("");

      const res = await api.put("/dashboard/discount-settings", discountForm);
      const nextSettings = res.data?.data || DEFAULT_DISCOUNT_SETTINGS;

      setDiscountSettings(nextSettings);
      setDiscountForm({
        threeDayPercentage: Number(nextSettings.threeDayPercentage || 0),
        sevenDayPercentage: Number(nextSettings.sevenDayPercentage || 0),
        fourteenDayPercentage: Number(nextSettings.fourteenDayPercentage || 0),
        pickupLocation: String(nextSettings.pickupLocation || DEFAULT_DISCOUNT_SETTINGS.pickupLocation),
      });
      setPickupLocationMessage("Pickup location updated");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setPickupLocationMessage(errorMessage || "Failed to update pickup location");
    } finally {
      setSavingPickupLocation(false);
    }
  };

  const handleOpenBookingDetails = async (status: DashboardBookingStatus) => {
    try {
      setSelectedBookingStatus(status);
      setLoadingBookingDetails(true);
      setBookingDetailsError("");

      const res = await api.get("/bookings", {
        params: {
          status,
          page: 1,
          limit: 100,
        },
      });

      const payload = res.data?.data?.data || res.data?.data || [];
      setBookingDetails(Array.isArray(payload) ? payload : []);
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setBookingDetailsError(errorMessage || "Failed to load booking details");
      setBookingDetails([]);
    } finally {
      setLoadingBookingDetails(false);
    }
  };

  const selectedStatusLabel =
    selectedBookingStatus === "active"
      ? "Active"
      : selectedBookingStatus === "reserved"
        ? "Reserved"
        : selectedBookingStatus === "completed"
          ? "Completed"
          : "";

  return (
    <AppShell>
      <div className="dashboard-page-hero rounded-3xl p-3 md:p-4">
      <div className="fade-up flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-zinc-600">Welcome {user?.name || "User"}</p>
        </div>
      </div>

      {error && <p className="mt-5 rounded-xl border border-red-300/35 bg-red-500/15 px-4 py-3 text-red-100">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <section className="glass-card rounded-2xl border-2 border-amber-300/60 p-6 shadow-[0_18px_40px_-28px_rgba(245,158,11,0.65)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Pricing Controls</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900">Long-Stay Discounts</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Adjust the percentage discounts applied automatically to longer bookings.
              </p>
            </div>
            {discountSettings.updatedAt && (
              <p className="text-sm text-zinc-500">
                Updated {new Date(discountSettings.updatedAt).toLocaleString()}
              </p>
            )}
          </div>

          {discountMessage && (
            <p className="mt-4 rounded-xl border border-zinc-300 bg-white/70 px-4 py-3 text-sm text-zinc-700">
              {discountMessage}
            </p>
          )}
          <form onSubmit={handleDiscountSave} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">3+ day discount</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                name="threeDayPercentage"
                value={discountForm.threeDayPercentage}
                onChange={handleDiscountChange}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-0 transition focus:border-zinc-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">7+ day discount</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                name="sevenDayPercentage"
                value={discountForm.sevenDayPercentage}
                onChange={handleDiscountChange}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-0 transition focus:border-zinc-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">14+ day discount</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                name="fourteenDayPercentage"
                value={discountForm.fourteenDayPercentage}
                onChange={handleDiscountChange}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-0 transition focus:border-zinc-500"
              />
            </label>

            <div className="md:col-span-3 flex items-center justify-between gap-4 pt-2">
              <p className="text-sm text-zinc-500">
                Set a tier to 0 to disable it without removing lower-tier discounts.
              </p>
              <button
                type="submit"
                disabled={savingDiscounts}
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingDiscounts ? "Saving..." : "Save Discounts"}
              </button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Pickup Location</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Set the location shown on the reservation card for customer pickups.
            </p>

            {pickupLocationMessage && (
              <p className="mt-4 rounded-xl border border-zinc-300 bg-white/70 px-4 py-3 text-sm text-zinc-700">
                {pickupLocationMessage}
              </p>
            )}

            <form onSubmit={handlePickupLocationSave} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-700">Pickup location</span>
                <input
                  type="text"
                  name="pickupLocation"
                  value={discountForm.pickupLocation}
                  onChange={handleDiscountChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-0 transition focus:border-zinc-500"
                  placeholder="123 Main Street, Springfield"
                />
              </label>

              <div className="rounded-xl border border-zinc-200 bg-white/70 px-4 py-4">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Current location</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">{discountSettings.pickupLocation}</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPickupLocation}
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPickupLocation ? "Saving..." : "Save Pickup Location"}
                </button>
              </div>
            </form>
          </section>

          <section className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Active Discount Ladder</h2>
            <p className="mt-1 text-sm text-zinc-600">
              These values are used by both staff bookings and the public reservation flow.
            </p>

            <div className="mt-6 space-y-3">
              {discountSettings.tiers.map((tier) => (
                <div
                  key={tier.minDays}
                  className="rounded-xl border border-zinc-200 bg-white/70 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                        {tier.minDays}+ days
                      </p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">
                        {tier.percentage}% off vehicle rate
                      </p>
                    </div>
                    <div className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-white">
                      {tier.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => router.push("/vehicles")}
          style={{ "--anim-delay": "40ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left pulse-glow transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Total Vehicles</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.totalVehicles ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/vehicles")}
          style={{ "--anim-delay": "110ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Available Vehicles</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.availableVehicles ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/vehicles")}
          style={{ "--anim-delay": "180ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Rented Vehicles</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.rentedVehicles ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/vehicles")}
          style={{ "--anim-delay": "250ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">In Maintenance</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.maintenanceVehicles ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/customers")}
          style={{ "--anim-delay": "320ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Total Customers</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.totalCustomers ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/bookings")}
          style={{ "--anim-delay": "390ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Total Bookings</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.totalBookings ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleOpenBookingDetails("active")}
          style={{ "--anim-delay": "460ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Active Bookings</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.activeBookings ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleOpenBookingDetails("reserved")}
          style={{ "--anim-delay": "530ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Reserved Bookings</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.reservedBookings ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleOpenBookingDetails("completed")}
          style={{ "--anim-delay": "600ms" } as CSSProperties}
          className="animate-stagger lift-card glass-card w-full rounded-2xl p-6 text-left transition hover:ring-2 hover:ring-amber-300/55"
        >
          <h2 className="text-lg font-semibold text-zinc-600">Completed Bookings</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {summary?.completedBookings ?? 0}
          </p>
        </button>
      </div>

      {selectedBookingStatus && (
        <section className="mt-8 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">{selectedStatusLabel} Booking Details</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Showing bookings currently marked as {selectedStatusLabel.toLowerCase()}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBookingStatus(null)}
              className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-white/70"
            >
              Close
            </button>
          </div>

          {bookingDetailsError && (
            <p className="mt-4 rounded-xl border border-red-300/35 bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {bookingDetailsError}
            </p>
          )}

          {loadingBookingDetails ? (
            <p className="mt-4 text-sm text-zinc-600">Loading booking details...</p>
          ) : bookingDetails.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No {selectedStatusLabel.toLowerCase()} bookings found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white/70">
              <table className="w-full min-w-[780px]">
                <thead className="bg-zinc-100/70">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-zinc-700">Booking</th>
                    <th className="p-3 text-left text-sm font-semibold text-zinc-700">Customer</th>
                    <th className="p-3 text-left text-sm font-semibold text-zinc-700">Vehicle</th>
                    <th className="p-3 text-left text-sm font-semibold text-zinc-700">Pickup</th>
                    <th className="p-3 text-left text-sm font-semibold text-zinc-700">Return</th>
                    <th className="p-3 text-left text-sm font-semibold text-zinc-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingDetails.map((booking) => (
                    <tr key={booking.id} className="border-t border-zinc-200/80">
                      <td className="p-3 text-sm font-medium text-zinc-800">{formatBookingId(booking.id)}</td>
                      <td className="p-3 text-sm text-zinc-700">
                        {(booking.customer?.firstName || "").trim()} {(booking.customer?.lastName || "").trim()}
                      </td>
                      <td className="p-3 text-sm text-zinc-700">
                        {booking.vehicle?.make || ""} {booking.vehicle?.model || ""}
                        {booking.vehicle?.plateNumber ? ` (${booking.vehicle.plateNumber})` : ""}
                      </td>
                      <td className="p-3 text-sm text-zinc-700">
                        {booking.pickupDatetime ? new Date(booking.pickupDatetime).toLocaleString() : "-"}
                      </td>
                      <td className="p-3 text-sm text-zinc-700">
                        {booking.returnDatetime ? new Date(booking.returnDatetime).toLocaleString() : "-"}
                      </td>
                      <td className="p-3 text-sm text-zinc-700">
                        ${Number(booking.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      </div>
    </AppShell>
  );
}