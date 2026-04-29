"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import api from "../../../lib/api";
import { formatBookingId } from "../../../lib/bookingId";

type BookingInfo = {
  id: number;
  status: string;
  pickupDatetime: string;
  returnDatetime: string;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
  vehicle?: {
    make?: string;
    model?: string;
    plateNumber?: string;
  };
  documents?: Array<{
    id: number;
    documentType: string;
    fileUrl: string;
  }>;
};

type UploadState = {
  uploading: boolean;
  done: boolean;
  fileUrl: string;
  error: string;
};

const EMPTY_UPLOAD_STATE: UploadState = {
  uploading: false,
  done: false,
  fileUrl: "",
  error: "",
};

function buildImageUrl(fileUrl: string) {
  if (!fileUrl) return "";
  return `http://localhost:5000${fileUrl}`;
}

export default function GuestPrecheckoutPage() {
  const params = useParams();
  const token = useMemo(() => String(params.token || ""), [params.token]);

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [licenseUpload, setLicenseUpload] = useState<UploadState>(EMPTY_UPLOAD_STATE);
  const [selfieUpload, setSelfieUpload] = useState<UploadState>(EMPTY_UPLOAD_STATE);

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/public/precheckout/${token}`);
      const data = (res.data?.data || null) as BookingInfo | null;
      setBooking(data);

      const licenseDoc = data?.documents?.find(
        (doc) => doc.documentType === "precheckout_license"
      );
      const selfieDoc = data?.documents?.find(
        (doc) => doc.documentType === "precheckout_selfie_with_license"
      );

      setLicenseUpload((prev) => ({
        ...prev,
        done: Boolean(licenseDoc),
        fileUrl: licenseDoc?.fileUrl || "",
      }));

      setSelfieUpload((prev) => ({
        ...prev,
        done: Boolean(selfieDoc),
        fileUrl: selfieDoc?.fileUrl || "",
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || "This pre-checkout link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadBooking();
    }
  }, [token]);

  const uploadPhoto = async (file: File, documentType: "license" | "selfie") => {
    const setState = documentType === "license" ? setLicenseUpload : setSelfieUpload;

    try {
      setState({ uploading: true, done: false, fileUrl: "", error: "" });

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("documentType", documentType);

      const res = await api.post(`/public/precheckout/${token}/upload`, formData);
      const uploadedUrl = res.data?.data?.document?.fileUrl || "";

      setState({
        uploading: false,
        done: true,
        fileUrl: uploadedUrl,
        error: "",
      });
    } catch (err: any) {
      setState({
        uploading: false,
        done: false,
        fileUrl: "",
        error: err.response?.data?.message || "Upload failed. Please try again.",
      });
    }
  };

  const onLicenseChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file, "license");
    await loadBooking();
  };

  const onSelfieChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file, "selfie");
    await loadBooking();
  };

  const completed = licenseUpload.done && selfieUpload.done;

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900">Guest Pre-checkout</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Upload your driver license and a selfie while holding your license.
          </p>
        </section>

        {loading && <p className="text-sm text-zinc-700">Loading secure link...</p>}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {booking && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
            <p className="text-sm text-zinc-700">Booking {formatBookingId(booking.id)}</p>
            <p className="text-sm text-zinc-700">
              Guest: {booking.customer?.firstName} {booking.customer?.lastName}
            </p>
            <p className="text-sm text-zinc-700">
              Vehicle: {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.plateNumber})
            </p>
          </section>
        )}

        {booking && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-5">
            <div className="space-y-2">
              <p className="font-semibold text-zinc-900">1. Driver License</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onLicenseChange}
                className="block w-full text-sm"
              />
              {licenseUpload.uploading && <p className="text-sm text-zinc-600">Uploading license...</p>}
              {licenseUpload.done && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">License uploaded.</p>
                  <img
                    src={buildImageUrl(licenseUpload.fileUrl)}
                    alt="Uploaded license"
                    className="h-44 w-full rounded-xl border object-cover"
                  />
                </div>
              )}
              {licenseUpload.error && (
                <p className="text-sm text-red-700">{licenseUpload.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-zinc-900">2. Selfie Holding License</p>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={onSelfieChange}
                className="block w-full text-sm"
              />
              {selfieUpload.uploading && <p className="text-sm text-zinc-600">Uploading selfie...</p>}
              {selfieUpload.done && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">Selfie uploaded.</p>
                  <img
                    src={buildImageUrl(selfieUpload.fileUrl)}
                    alt="Uploaded selfie with license"
                    className="h-44 w-full rounded-xl border object-cover"
                  />
                </div>
              )}
              {selfieUpload.error && (
                <p className="text-sm text-red-700">{selfieUpload.error}</p>
              )}
            </div>
          </section>
        )}

        {booking && completed && (
          <section className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-green-800">
              Pre-checkout complete. Your verification photos were received in real time.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
