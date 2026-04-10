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
  customer?: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  vehicle?: {
    make: string | null;
    model: string | null;
  } | null;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get("/bookings");
      setBookings(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load bookings");
    }
  };

  const filteredBookings = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return bookings.filter((booking) => {
      const customerName = `${booking.customer?.firstName || ""} ${
        booking.customer?.lastName || ""
      }`
        .toLowerCase()
        .trim();

      const vehicleName = `${booking.vehicle?.make || ""} ${
        booking.vehicle?.model || ""
      }`
        .toLowerCase()
        .trim();

      const bookingStatus = (booking.status || "").toLowerCase();
      const bookingId = booking.id.toString();

      const matchesSearch =
        customerName.includes(search) ||
        vehicleName.includes(search) ||
        bookingStatus.includes(search) ||
        bookingId.includes(search);

      const matchesStatus =
        statusFilter === "all" || bookingStatus === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

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
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">ID</th>
              <th className="text-left p-4">Customer</th>
              <th className="text-left p-4">Vehicle</th>
              <th className="text-left p-4">Pickup</th>
              <th className="text-left p-4">Return</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-t">
                  <td className="p-4">{booking.id}</td>

                  <td className="p-4">
                    {`${booking.customer?.firstName || ""} ${
                      booking.customer?.lastName || ""
                    }`.trim() || "-"}
                  </td>

                  <td className="p-4">
                    {`${booking.vehicle?.make || ""} ${
                      booking.vehicle?.model || ""
                    }`.trim() || "-"}
                  </td>

                  <td className="p-4">
                    {booking.pickupDatetime
                      ? new Date(booking.pickupDatetime).toLocaleString()
                      : "-"}
                  </td>

                  <td className="p-4">
                    {booking.returnDatetime
                      ? new Date(booking.returnDatetime).toLocaleString()
                      : "-"}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                        booking.status
                      )}`}
                    >
                      {booking.status || "-"}
                    </span>
                  </td>

                  <td className="p-4 space-x-2">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="bg-gray-700 text-white px-3 py-1 rounded inline-block"
                    >
                      View
                    </Link>

                    {booking.status === "reserved" && (
                      <Link
                        href={`/bookings/${booking.id}/checkout`}
                        className="bg-blue-600 text-white px-3 py-1 rounded inline-block"
                      >
                        Checkout
                      </Link>
                    )}

                    {booking.status === "active" && (
                      <Link
                        href={`/bookings/${booking.id}/checkin`}
                        className="bg-green-600 text-white px-3 py-1 rounded inline-block"
                      >
                        Checkin
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center p-6 text-gray-500">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}