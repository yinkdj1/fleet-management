"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "../../../lib/api";
import { formatBookingId } from "../../../lib/bookingId";
import { formatCustomerName } from "../../../lib/displayHelpers";
import AppShell from "../../components/AppShell";

type DocumentItem = {
  id: number;
  documentType: string;
  fileUrl: string;
};

type BookingDetail = {
  id: number;
  pickupDatetime: string;
  returnDatetime: string;
  status: string;
  paymentStatus?: string;
  subtotal?: number;
  tax?: number;
  deposit?: number;
  totalAmount?: number;
  customer?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  vehicle?: {
    make: string;
    model: string;
    plateNumber: string;
    year?: number;
  };
  checkout?: {
    mileageOut: number;
    fuelLevelOut?: string;
    notesOut?: string;
    checkoutTime?: string;
  } | null;
  checkin?: {
    mileageIn: number;
    fuelLevelIn?: string;
    notesIn?: string;
    damageFee?: number;
    lateFee?: number;
    cleaningFee?: number;
    checkinTime?: string;
  } | null;
  documents?: DocumentItem[];
};

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState("");
  const [precheckoutMessage, setPrecheckoutMessage] = useState("");
  const [precheckoutLink, setPrecheckoutLink] = useState("");
  const [sendingPrecheckoutLink, setSendingPrecheckoutLink] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPickupDatetime, setEditPickupDatetime] = useState("");
  const [editReturnDatetime, setEditReturnDatetime] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("unpaid");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");

  // Checkout edit state
  const [isEditCheckoutOpen, setIsEditCheckoutOpen] = useState(false);
  const [editCheckoutMileage, setEditCheckoutMileage] = useState("");
  const [editCheckoutFuel, setEditCheckoutFuel] = useState("");
  const [editCheckoutNotes, setEditCheckoutNotes] = useState("");
  const [savingCheckout, setSavingCheckout] = useState(false);
  const [checkoutEditError, setCheckoutEditError] = useState("");

  // Checkin edit state
  const [isEditCheckinOpen, setIsEditCheckinOpen] = useState(false);
  const [editCheckinMileage, setEditCheckinMileage] = useState("");
  const [editCheckinFuel, setEditCheckinFuel] = useState("");
  const [editCheckinNotes, setEditCheckinNotes] = useState("");
  const [editDamageFee, setEditDamageFee] = useState("");
  const [editLateFee, setEditLateFee] = useState("");
  const [editCleaningFee, setEditCleaningFee] = useState("");
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [checkinEditError, setCheckinEditError] = useState("");

  useEffect(() => {
    fetchBooking();
  }, []);

  const fetchBooking = async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data?.data || res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load booking");
    }
  };

  const checkoutPhotos =
    booking?.documents?.filter((doc) => doc.documentType === "checkout_photo") || [];

  const checkinPhotos =
    booking?.documents?.filter((doc) => doc.documentType === "checkin_photo") || [];

  const precheckoutLicenseDocs =
    booking?.documents?.filter((doc) => doc.documentType === "precheckout_license") || [];

  const precheckoutSelfieDocs =
    booking?.documents?.filter((doc) => doc.documentType === "precheckout_selfie_with_license") || [];

  const sendPrecheckoutLink = async () => {
    setPrecheckoutMessage("");
    setPrecheckoutLink("");

    try {
      setSendingPrecheckoutLink(true);
      const res = await api.post(`/bookings/${bookingId}/precheckout-link`);
      const data = res.data?.data;

      setPrecheckoutMessage(data?.message || "Pre-checkout link created.");

      if (data?.link) {
        setPrecheckoutLink(data.link);
        if (navigator?.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(data.link);
          } catch {
            // Ignore clipboard failures in unsupported contexts.
          }
        }
      }
    } catch (err: any) {
      setPrecheckoutMessage(
        err.response?.data?.message || "Unable to create pre-checkout link"
      );
    } finally {
      setSendingPrecheckoutLink(false);
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

  const openEditModal = () => {
    if (!booking) return;
    setEditMessage("");
    setEditError("");
    setEditPickupDatetime(toLocalDatetimeValue(booking.pickupDatetime));
    setEditReturnDatetime(toLocalDatetimeValue(booking.returnDatetime));
    setEditPaymentStatus(booking.paymentStatus || "unpaid");
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setIsEditOpen(false);
    setEditError("");
  };

  const saveEditBooking = async () => {
    if (!booking) return;

    setEditError("");
    setEditMessage("");

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

    if (ret.getTime() < pickup.getTime() + 24 * 60 * 60 * 1000) {
      setEditError("Return date/time must be at least 24 hours after pickup.");
      return;
    }

    try {
      setSavingEdit(true);
      await api.patch(`/bookings/${booking.id}`, {
        pickupDatetime: pickup.toISOString(),
        returnDatetime: ret.toISOString(),
        paymentStatus: editPaymentStatus,
      });

      setEditMessage(`Booking ${formatBookingId(booking.id)} updated successfully.`);
      setIsEditOpen(false);
      await fetchBooking();
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Failed to update booking.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openEditCheckout = () => {
    if (!booking?.checkout) return;
    setEditCheckoutMileage(String(booking.checkout.mileageOut ?? ""));
    setEditCheckoutFuel(booking.checkout.fuelLevelOut ?? "");
    setEditCheckoutNotes(booking.checkout.notesOut ?? "");
    setCheckoutEditError("");
    setIsEditCheckoutOpen(true);
  };

  const saveCheckoutEdit = async () => {
    setSavingCheckout(true);
    setCheckoutEditError("");
    try {
      await api.patch(`/bookings/${bookingId}/checkout`, {
        mileageOut: editCheckoutMileage,
        fuelLevelOut: editCheckoutFuel,
        notesOut: editCheckoutNotes,
      });
      setIsEditCheckoutOpen(false);
      fetchBooking();
    } catch (err: any) {
      setCheckoutEditError(err.response?.data?.message || "Failed to update checkout.");
    } finally {
      setSavingCheckout(false);
    }
  };

  const openEditCheckin = () => {
    if (!booking?.checkin) return;
    setEditCheckinMileage(String(booking.checkin.mileageIn ?? ""));
    setEditCheckinFuel(booking.checkin.fuelLevelIn ?? "");
    setEditCheckinNotes(booking.checkin.notesIn ?? "");
    setEditDamageFee(String(booking.checkin.damageFee ?? 0));
    setEditLateFee(String(booking.checkin.lateFee ?? 0));
    setEditCleaningFee(String(booking.checkin.cleaningFee ?? 0));
    setCheckinEditError("");
    setIsEditCheckinOpen(true);
  };

  const saveCheckinEdit = async () => {
    setSavingCheckin(true);
    setCheckinEditError("");
    try {
      await api.patch(`/bookings/${bookingId}/checkin`, {
        mileageIn: editCheckinMileage,
        fuelLevelIn: editCheckinFuel,
        notesIn: editCheckinNotes,
        damageFee: editDamageFee,
        lateFee: editLateFee,
        cleaningFee: editCleaningFee,
      });
      setIsEditCheckinOpen(false);
      fetchBooking();
    } catch (err: any) {
      setCheckinEditError(err.response?.data?.message || "Failed to update checkin.");
    } finally {
      setSavingCheckin(false);
    }
  };

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Booking {formatBookingId(booking?.id)}</h1>
        <div className="space-x-2">
          {booking && booking.status === "reserved" && (
            <>
              <Link
                href={`/bookings/${booking.id}/checkout`}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Checkout
              </Link>
              <Link
                href={`/bookings/${booking.id}/checkin`}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Checkin
              </Link>
            </>
          )}
          {booking && booking.status === "active" && (
            <Link
              href={`/bookings/${booking.id}/checkin`}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Checkin
            </Link>
          )}
          {booking &&
            !["active", "completed", "cancelled", "no_show"].includes(
              booking.status
            ) && (
              <button
                type="button"
                onClick={openEditModal}
                className="bg-amber-500 text-white px-4 py-2 rounded"
              >
                Edit Booking
              </button>
            )}
          <Link
            href="/bookings"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Back to Bookings
          </Link>
        </div>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {editMessage && <p className="text-green-700 mb-4">{editMessage}</p>}

      {!booking ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p>
                <span className="font-semibold">Status:</span> {booking.status}
              </p>
              <p>
                <span className="font-semibold">Pickup:</span>{" "}
                {new Date(booking.pickupDatetime).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Return:</span>{" "}
                {new Date(booking.returnDatetime).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Total:</span> $
                {booking.totalAmount ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Customer & Vehicle</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-2">Customer</p>
                <p>{formatCustomerName(booking.customer) || "-"}</p>
                <p>{booking.customer?.email || "-"}</p>
                <p>{booking.customer?.phone || "-"}</p>
              </div>

              <div>
                <p className="font-semibold mb-2">Vehicle</p>
                <p>
                  {booking.vehicle?.make} {booking.vehicle?.model}
                </p>
                <p>{booking.vehicle?.plateNumber}</p>
                <p>{booking.vehicle?.year}</p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">Guest Pre-checkout</p>
                  <p className="text-sm text-zinc-600">
                    Send a secure link for guest license + selfie verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendPrecheckoutLink}
                  disabled={sendingPrecheckoutLink}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-60"
                >
                  {sendingPrecheckoutLink ? "Sending..." : "Send Pre-checkout Link"}
                </button>
              </div>

              {precheckoutMessage && (
                <p className="mt-3 text-sm text-zinc-700">{precheckoutMessage}</p>
              )}

              {precheckoutLink && (
                <a
                  href={precheckoutLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-sm text-blue-700 underline"
                >
                  {precheckoutLink}
                </a>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Pre-checkout Verification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="font-semibold mb-3">License Upload</p>
                {precheckoutLicenseDocs.length === 0 ? (
                  <p className="text-gray-500">No license uploaded.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {precheckoutLicenseDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={`http://localhost:5000${doc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`http://localhost:5000${doc.fileUrl}`}
                          alt="License"
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold mb-3">Selfie With License</p>
                {precheckoutSelfieDocs.length === 0 ? (
                  <p className="text-gray-500">No selfie uploaded.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {precheckoutSelfieDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={`http://localhost:5000${doc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`http://localhost:5000${doc.fileUrl}`}
                          alt="Selfie with license"
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div id="checkout-details" className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Checkout Details</h2>
              {booking.checkout && (
                <button
                  type="button"
                  onClick={openEditCheckout}
                  className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
                >
                  Edit
                </button>
              )}
            </div>
            {booking.checkout ? (
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Mileage Out:</span>{" "}
                  {booking.checkout.mileageOut}
                </p>
                <p>
                  <span className="font-semibold">Fuel Level Out:</span>{" "}
                  {booking.checkout.fuelLevelOut || "-"}
                </p>
                <p>
                  <span className="font-semibold">Notes:</span>{" "}
                  {booking.checkout.notesOut || "-"}
                </p>

                <div className="mt-4">
                  <p className="font-semibold mb-3">Checkout Photos</p>
                  {checkoutPhotos.length === 0 ? (
                    <p className="text-gray-500">No checkout photos uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {checkoutPhotos.map((photo) => (
                        <a
                          key={photo.id}
                          href={`http://localhost:5000${photo.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={`http://localhost:5000${photo.fileUrl}`}
                            alt="Checkout"
                            className="w-full h-40 object-cover rounded-lg border"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No checkout record yet.</p>
            )}
          </div>

          <div id="checkin-details" className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Checkin Details</h2>
              {booking.checkin && (
                <button
                  type="button"
                  onClick={openEditCheckin}
                  className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
                >
                  Edit
                </button>
              )}
            </div>
            {booking.checkin ? (
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Mileage In:</span>{" "}
                  {booking.checkin.mileageIn}
                </p>
                <p>
                  <span className="font-semibold">Fuel Level In:</span>{" "}
                  {booking.checkin.fuelLevelIn || "-"}
                </p>
                <p>
                  <span className="font-semibold">Notes:</span>{" "}
                  {booking.checkin.notesIn || "-"}
                </p>

                <div className="mt-4">
                  <p className="font-semibold mb-3">Checkin Photos</p>
                  {checkinPhotos.length === 0 ? (
                    <p className="text-gray-500">No checkin photos uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {checkinPhotos.map((photo) => (
                        <a
                          key={photo.id}
                          href={`http://localhost:5000${photo.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={`http://localhost:5000${photo.fileUrl}`}
                            alt="Checkin"
                            className="w-full h-40 object-cover rounded-lg border"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No checkin record yet.</p>
            )}
          </div>
        </div>
      )}

      {isEditOpen && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold">Edit Booking {formatBookingId(booking.id)}</h2>
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
                onClick={saveEditBooking}
                disabled={savingEdit}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Checkout Modal */}
      {isEditCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Edit Checkout Details</h2>
            {checkoutEditError && <p className="text-red-600 text-sm">{checkoutEditError}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">Mileage Out</label>
              <input type="number" value={editCheckoutMileage} onChange={(e) => setEditCheckoutMileage(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fuel Level</label>
              <select value={editCheckoutFuel} onChange={(e) => setEditCheckoutFuel(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                {["Full","3/4","1/2","1/4","Empty"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={editCheckoutNotes} onChange={(e) => setEditCheckoutNotes(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEditCheckoutOpen(false)} className="rounded px-4 py-2 text-sm border">Cancel</button>
              <button type="button" onClick={saveCheckoutEdit} disabled={savingCheckout} className="rounded bg-amber-500 px-4 py-2 text-sm text-white disabled:opacity-60">
                {savingCheckout ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Checkin Modal */}
      {isEditCheckinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Edit Checkin Details</h2>
            {checkinEditError && <p className="text-red-600 text-sm">{checkinEditError}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">Mileage In</label>
              <input type="number" value={editCheckinMileage} onChange={(e) => setEditCheckinMileage(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fuel Level</label>
              <select value={editCheckinFuel} onChange={(e) => setEditCheckinFuel(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                {["Full","3/4","1/2","1/4","Empty"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={editCheckinNotes} onChange={(e) => setEditCheckinNotes(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Damage Fee ($)</label>
                <input type="number" value={editDamageFee} onChange={(e) => setEditDamageFee(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Late Fee ($)</label>
                <input type="number" value={editLateFee} onChange={(e) => setEditLateFee(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cleaning Fee ($)</label>
                <input type="number" value={editCleaningFee} onChange={(e) => setEditCleaningFee(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" min="0" step="0.01" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEditCheckinOpen(false)} className="rounded px-4 py-2 text-sm border">Cancel</button>
              <button type="button" onClick={saveCheckinEdit} disabled={savingCheckin} className="rounded bg-amber-500 px-4 py-2 text-sm text-white disabled:opacity-60">
                {savingCheckin ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}