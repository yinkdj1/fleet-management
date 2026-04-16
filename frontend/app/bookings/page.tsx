"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { formatBookingId } from "../../lib/bookingId";
import { formatCustomerName } from "../../lib/displayHelpers";
import AppShell from "../components/AppShell";

type Booking = {
  id: number;
  pickupDatetime: string;
  returnDatetime: string;
  status: string | null;
  paymentStatus?: string | null;
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
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");
  const [otherSearch, setOtherSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusSortDirection, setStatusSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [otherPage, setOtherPage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [completedTotalPages, setCompletedTotalPages] = useState(1);
  const [otherTotalPages, setOtherTotalPages] = useState(1);
  const [activeLoading, setActiveLoading] = useState(false);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherBookings, setOtherBookings] = useState<Booking[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [sendingPrecheckoutId, setSendingPrecheckoutId] = useState<number | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editPickupDatetime, setEditPickupDatetime] = useState("");
  const [editReturnDatetime, setEditReturnDatetime] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("unpaid");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setPage(1);
    setActivePage(1);
    setCompletedPage(1);
    setOtherPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => { setActivePage(1); }, [activeSearch]);
  useEffect(() => { setCompletedPage(1); }, [completedSearch]);
  useEffect(() => { setOtherPage(1); }, [otherSearch]);

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    if (statusFilter !== "all") return;
    fetchActiveBookings();
  }, [activePage, statusFilter, activeSearch]);

  useEffect(() => {
    if (statusFilter !== "all") return;
    fetchCompletedBookings();
  }, [completedPage, statusFilter, completedSearch]);

  useEffect(() => {
    if (statusFilter !== "all") return;
    fetchOtherBookings();
  }, [otherPage, statusFilter, otherSearch]);

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

  const refreshBookings = async () => {
    if (statusFilter === "all") {
      await Promise.all([fetchBookings(), fetchActiveBookings(), fetchCompletedBookings(), fetchOtherBookings()]);
    } else {
      await fetchBookings();
    }
  };

  const sendPrecheckoutPrompt = async (bookingId: number) => {
    setActionMessage("");
    setActionError("");

    const confirmed = window.confirm(
      `Send pre-checkout prompt to guest for booking ${formatBookingId(bookingId)}?`
    );

    if (!confirmed) return;

    try {
      setSendingPrecheckoutId(bookingId);
      const res = await api.post(`/bookings/${bookingId}/precheckout-link`);
      const payload = res.data?.data || {};
      setActionMessage(payload.message || `Pre-checkout prompt sent for booking ${formatBookingId(bookingId)}.`);
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
      return "bg-emerald-100 text-emerald-700";
    }

    if (normalized === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "cancelled") {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const normalizedStatus = (status: string | null) => (status || "").toLowerCase();

  const sortBookingsByStatus = (list: Booking[]) => {
    return [...list].sort((a, b) => {
      const aStatus = normalizedStatus(a.status);
      const bStatus = normalizedStatus(b.status);
      if (statusSortDirection === "asc") {
        return aStatus.localeCompare(bStatus);
      }
      return bStatus.localeCompare(aStatus);
    });
  };

  const fetchActiveBookings = async () => {
    try {
      setActiveLoading(true);
      const res = await api.get("/bookings", {
        params: {
          status: "active",
          page: activePage,
          limit,
          search: activeSearch.trim() || undefined,
        },
      });

      const payload = res.data || {};
      const nextData = payload.data || [];
      const pagination = payload.pagination || {};

      setActiveBookings(nextData);
      setActiveTotalPages(Number(pagination.totalPages || 1));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load active bookings");
    } finally {
      setActiveLoading(false);
    }
  };

  const fetchCompletedBookings = async () => {
    try {
      setCompletedLoading(true);
      const res = await api.get("/bookings", {
        params: {
          status: "completed",
          page: completedPage,
          limit,
          search: completedSearch.trim() || undefined,
        },
      });

      const payload = res.data || {};
      const nextData = payload.data || [];
      const pagination = payload.pagination || {};

      setCompletedBookings(nextData);
      setCompletedTotalPages(Number(pagination.totalPages || 1));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load completed bookings");
    } finally {
      setCompletedLoading(false);
    }
  };

  const fetchOtherBookings = async () => {
    try {
      setOtherLoading(true);
        const res = await api.get("/bookings", {
          params: {
            status: "other",
            page: otherPage,
            limit,
            search: otherSearch.trim() || undefined,
          },
        });

      const payload = res.data || {};
      const nextData = payload.data || [];
      const pagination = payload.pagination || {};

      setOtherBookings(nextData);
      setOtherTotalPages(Number(pagination.totalPages || 1));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load other bookings");
    } finally {
      setOtherLoading(false);
    }
  };

  const toLocalDatetimeValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const showSplitSections = statusFilter === "all";

  const renderBookingRows = (bookingList: Booking[], isLoading = false) => {
    if (bookingList.length === 0) {
      return (
        <tr>
          <td colSpan={12} className="text-center p-6 text-gray-500">
            {isLoading ? "Loading bookings..." : "No bookings found"}
          </td>
        </tr>
      );
    }

    return bookingList.map((booking) => (
      <tr
        key={booking.id}
        className="border-t transition-colors hover:bg-blue-50 cursor-pointer"
        onClick={() => router.push(`/bookings/${booking.id}`)}
      >
        <td className="px-2 py-1.5 whitespace-nowrap">{formatBookingId(booking.id)}</td>

        <td className="px-2 py-1.5 whitespace-nowrap">
          {formatCustomerName(booking.customer) || "-"}
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

        <td className="px-2 py-1.5 whitespace-nowrap">
          ${Number(booking.totalAmount || 0).toFixed(2)}
        </td>

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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sendPrecheckoutPrompt(booking.id);
                }}
                disabled={sendingPrecheckoutId === booking.id}
                className="bg-purple-600 text-white px-3 py-1 rounded inline-block disabled:opacity-60"
              >
                {sendingPrecheckoutId === booking.id
                  ? "Sending..."
                  : "Send Pre-checkout"}
              </button>

              {(["active", "reserved"].includes((booking.status || "").toLowerCase())) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/bookings/${booking.id}/swap`);
                  }}
                  className="bg-emerald-600 text-white px-3 py-1 rounded inline-block"
                >
                  Swap Vehicle
                </button>
              )}
            </div>
        </td>

      </tr>
    ));
  };

  const renderBookingTable = (
    title: string,
    bookingList: Booking[],
    isLoading = false,
    currentPage?: number,
    pageCount?: number,
    onPrev?: () => void,
    onNext?: () => void,
    showStatusFilter = false,
    searchValue?: string,
    onSearchChange?: (value: string) => void
  ) => {
    const sortedBookingList = sortBookingsByStatus(bookingList);
    return (
      <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="border-b bg-gray-50 px-4 py-3 flex flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-gray-600">
              {bookingList.length} booking{bookingList.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {onSearchChange !== undefined && (
          <input
            type="text"
            placeholder="Search by ID, customer, or vehicle..."
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full md:w-80"
          />
        )}
      </div>

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
            <th className="text-left px-2 py-1.5 whitespace-nowrap">
              <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span>Status</span>
                <select
                  value={statusSortDirection}
                  onChange={(e) => setStatusSortDirection(e.target.value as "asc" | "desc")}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
              {showStatusFilter && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="all">All</option>
                  <option value="reserved">Reserved</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              )}
            </div>
            </th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>{renderBookingRows(sortedBookingList, isLoading)}</tbody>
      </table>

      {currentPage !== undefined && pageCount !== undefined && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {Math.max(pageCount, 1)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev || currentPage <= 1 || isLoading}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext || currentPage >= pageCount || isLoading}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
  };

  const activeSection = renderBookingTable(
    "Active Rentals",
    activeBookings,
    activeLoading,
    activePage,
    activeTotalPages,
    () => setActivePage((prev) => Math.max(prev - 1, 1)),
    () => setActivePage((prev) => (prev < activeTotalPages ? prev + 1 : prev)),
    true,
    activeSearch,
    setActiveSearch
  );
  const completedSection = renderBookingTable(
    "Completed Rentals",
    completedBookings,
    completedLoading,
    completedPage,
    completedTotalPages,
    () => setCompletedPage((prev) => Math.max(prev - 1, 1)),
    () => setCompletedPage((prev) => (prev < completedTotalPages ? prev + 1 : prev)),
    true,
    completedSearch,
    setCompletedSearch
  );
  const otherSection =
    otherBookings.length > 0 || otherSearch.trim() !== ""
      ? renderBookingTable(
          "Reserved & Cancelled",
          otherBookings,
          otherLoading,
          otherPage,
          otherTotalPages,
          () => setOtherPage((prev) => Math.max(prev - 1, 1)),
          () => setOtherPage((prev) => (prev < otherTotalPages ? prev + 1 : prev)),
          true,
          otherSearch,
          setOtherSearch
        )
      : null;

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingBooking(null);
    setEditPickupDatetime("");
    setEditReturnDatetime("");
    setEditPaymentStatus("unpaid");
    setEditError("");
  };

  const saveBookingEdit = async () => {
    if (!editingBooking) return;

    setEditError("");
    setActionError("");
    setActionMessage("");

    if (!editPickupDatetime || !editReturnDatetime) {
      setEditError("Pickup and return date/time are required.");
      return;
    }

    const pickup = new Date(editPickupDatetime);
    const ret = new Date(editReturnDatetime);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) {
      setEditError("Please provide valid pickup and return date/time.");
      return;
    }

    const minReturn = pickup.getTime() + 24 * 60 * 60 * 1000;
    if (ret.getTime() < minReturn) {
      setEditError("Return date/time must be at least 24 hours after pickup.");
      return;
    }

    try {
      setSavingEdit(true);
      await api.patch(`/bookings/${editingBooking.id}`, {
        pickupDatetime: pickup.toISOString(),
        returnDatetime: ret.toISOString(),
        paymentStatus: editPaymentStatus,
      });

      setActionMessage(`Booking ${formatBookingId(editingBooking.id)} updated successfully.`);
      closeEditModal();
      await refreshBookings();
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Failed to update booking.");
    } finally {
      setSavingEdit(false);
    }
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

      {showSplitSections ? (
        <div className="space-y-6">
          <div className="space-y-4">
            {activeSection}
            {otherSection}
          </div>
          {completedSection}
        </div>
      ) : (
        renderBookingTable(
          "Bookings",
          bookings,
          loading,
          page,
          totalPages,
          () => setPage((prev) => Math.max(prev - 1, 1)),
          () => setPage((prev) => (prev < totalPages ? prev + 1 : prev)),
          true
        )
      )}

      {!showSplitSections && (
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
      )}

      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold">Edit Booking {formatBookingId(editingBooking.id)}</h2>
            <p className="mt-1 text-sm text-gray-600">
              Update pickup/return schedule and payment status.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Pickup</label>
                <input
                  type="datetime-local"
                  value={editPickupDatetime}
                  onChange={(e) => setEditPickupDatetime(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Return</label>
                <input
                  type="datetime-local"
                  value={editReturnDatetime}
                  min={
                    editPickupDatetime
                      ? new Date(new Date(editPickupDatetime).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .slice(0, 16)
                      : undefined
                  }
                  onChange={(e) => setEditReturnDatetime(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Payment Status</label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>

            {editError && <p className="mt-3 text-sm text-red-600">{editError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="rounded border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBookingEdit}
                disabled={savingEdit}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}