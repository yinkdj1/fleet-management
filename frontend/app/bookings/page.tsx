"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import AppShell from "../components/AppShell";

type Booking = {
  id: number;
  pickupDatetime: string;
  returnDatetime: string;
  status: string | null;
  totalAmount?: number | null;
  checkout?: { id: number } | null;
  checkin?: { id: number } | null;
  customer?: {
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  vehicle?: {
    make: string | null;
    model: string | null;
    plateNumber?: string | null;
    year?: number | null;
  } | null;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [sendingPrecheckoutId, setSendingPrecheckoutId] = useState<number | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/bookings", {
        params: {
          page,
          limit,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchTerm.trim() || undefined,
        },
      });

      const payload = res.data || {};
      const nextData = payload.data || [];
      const pagination = payload.pagination || {};

      setBookings(nextData);
      setTotal(Number(pagination.total || 0));
      setTotalPages(Number(pagination.totalPages || 1));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const sendPrecheckoutPrompt = async (bookingId: number) => {
    setActionMessage("");
    setActionError("");

    const confirmed = window.confirm(
      `Send pre-checkout prompt to guest for booking #${bookingId}?`
    );

    if (!confirmed) return;

    try {
      setSendingPrecheckoutId(bookingId);
      const res = await api.post(`/bookings/${bookingId}/precheckout-link`);
      const payload = res.data?.data || {};
      setActionMessage(payload.message || `Pre-checkout prompt sent for booking #${bookingId}.`);
    } catch (err: any) {
      setActionError(
        err.response?.data?.message ||
          `Unable to send pre-checkout prompt for booking #${bookingId}.`
      );
    } finally {
      setSendingPrecheckoutId(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const normalized = (status || "").toLowerCase();

    if (normalized === "reserved") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (normalized === "active") {
      return "bg-blue-100 text-blue-700";
    }

    if (normalized === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "cancelled") {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Bookings</h1>

        <Link
          href="/bookings/new"
          className="bg-black text-white px-4 py-2 rounded w-fit"
        >
          + Add Booking
        </Link>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {actionError && <p className="text-red-600 mb-4">{actionError}</p>}
      {actionMessage && <p className="text-green-700 mb-4">{actionMessage}</p>}

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by ID, customer, vehicle, or status"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-96"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-56"
        >
          <option value="all">All Statuses</option>
          <option value="reserved">Reserved</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">ID</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Customer</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Email</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Phone</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Vehicle</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Plate</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Year</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Total</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Pickup</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Return</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Status</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Pre-checkout</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">View Checkout</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">View Checkin</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Checkout</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Checkin</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-t">
                  <td className="px-2 py-1.5 whitespace-nowrap">{booking.id}</td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {`${booking.customer?.firstName || ""} ${
                      booking.customer?.lastName || ""
                    }`.trim() || "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">{booking.customer?.email || "-"}</td>

                  <td className="px-2 py-1.5 whitespace-nowrap">{booking.customer?.phone || "-"}</td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {`${booking.vehicle?.make || ""} ${
                      booking.vehicle?.model || ""
                    }`.trim() || "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">{booking.vehicle?.plateNumber || "-"}</td>

                  <td className="px-2 py-1.5 whitespace-nowrap">{booking.vehicle?.year || "-"}</td>

                  <td className="px-2 py-1.5 whitespace-nowrap">${Number(booking.totalAmount || 0).toFixed(2)}</td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {booking.pickupDatetime
                      ? new Date(booking.pickupDatetime).toLocaleString()
                      : "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {booking.returnDatetime
                      ? new Date(booking.returnDatetime).toLocaleString()
                      : "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                        booking.status
                      )}`}
                    >
                      {booking.status || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => sendPrecheckoutPrompt(booking.id)}
                      disabled={sendingPrecheckoutId === booking.id}
                      className="bg-purple-600 text-white px-3 py-1 rounded inline-block disabled:opacity-60"
                    >
                      {sendingPrecheckoutId === booking.id
                          ? "Sending..."
                        : "Send Pre-checkout"}
                    </button>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {booking.checkout ? (
                      <Link
                        href={`/bookings/${booking.id}#checkout-details`}
                        className="bg-gray-700 text-white px-3 py-1 rounded inline-block"
                      >
                        View Checkout Details
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {booking.checkin ? (
                      <Link
                        href={`/bookings/${booking.id}#checkin-details`}
                        className="bg-gray-700 text-white px-3 py-1 rounded inline-block"
                      >
                        View Checkin Details
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {booking.status === "reserved" ? (
                      <Link
                        href={`/bookings/${booking.id}/checkout`}
                        className="bg-blue-600 text-white px-3 py-1 rounded inline-block"
                      >
                        Checkout
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {booking.status === "active" ? (
                      <Link
                        href={`/bookings/${booking.id}/checkin`}
                        className="bg-green-600 text-white px-3 py-1 rounded inline-block"
                      >
                        Checkin
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={16} className="text-center p-6 text-gray-500">
                  {loading ? "Loading bookings..." : "No bookings found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600">
          Showing page {page} of {Math.max(totalPages, 1)} ({total} total bookings)
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1 || loading}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => (prev < totalPages ? prev + 1 : prev))}
            disabled={page >= totalPages || loading}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </AppShell>
  );
}