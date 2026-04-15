"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "../../../lib/api";
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

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Booking #{booking?.id}</h1>
        <div className="space-x-2">
          <Link
            href="/bookings"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Back to Bookings
          </Link>
        </div>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

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
                <p>
                  {booking.customer?.firstName} {booking.customer?.lastName}
                </p>
                <p>{booking.customer?.email}</p>
                <p>{booking.customer?.phone}</p>
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
            <h2 className="text-xl font-semibold mb-4">Checkout Details</h2>
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
            <h2 className="text-xl font-semibold mb-4">Checkin Details</h2>
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
    </AppShell>
  );
}