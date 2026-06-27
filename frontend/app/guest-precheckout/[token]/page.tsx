"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  identityVerified?: boolean;
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

type IdentityDocument = {
  documentType?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response?.data;
    return response?.message || fallback;
  }

  return fallback;
}

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
  const searchParams = useSearchParams();
  const token = useMemo(() => String(params.token || ""), [params.token]);

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [licenseUpload, setLicenseUpload] = useState<UploadState>(EMPTY_UPLOAD_STATE);
  const [selfieUpload, setSelfieUpload] = useState<UploadState>(EMPTY_UPLOAD_STATE);

  // Stripe Identity state
  const [identityVerified, setIdentityVerified] = useState(false);

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
      const identityDoc = data?.documents?.find(
        (doc) => doc.documentType === "stripe_identity_verified"
      );
      const identityVerifiedFromApi = Boolean(data?.identityVerified ?? identityDoc);

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

      setIdentityVerified(identityVerifiedFromApi);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "This pre-checkout link is invalid or expired."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadBooking();
    }
  }, [token]);

  // If returning from Stripe Identity redirect, poll for verified status
  useEffect(() => {
    if (searchParams.get("identity") === "done" && token) {
      const poll = setInterval(async () => {
        const res = await api.get(`/public/precheckout/${token}`).catch(() => null);
        const docs = res?.data?.data?.documents || [];
        const identityVerifiedFromPoll = Boolean(
          res?.data?.data?.identityVerified ||
            docs.find((d: IdentityDocument) => d.documentType === "stripe_identity_verified")
        );
        if (identityVerifiedFromPoll) {
          setIdentityVerified(true);
          clearInterval(poll);
        }
      }, 2000);
      // Stop polling after 30s
      setTimeout(() => clearInterval(poll), 30000);
    }
  }, [searchParams, token]);

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
    } catch (err: unknown) {
      setState({
        uploading: false,
        done: false,
        fileUrl: "",
        error: getErrorMessage(err, "Upload failed. Please try again."),
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

  const completed = identityVerified;

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900">Guest Pre-checkout</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Verify your identity before picking up your vehicle. This takes about 1 minute.
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

        {/* Stripe Identity Verification */}
        {booking && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <p className="font-semibold text-zinc-900">Identity Verification</p>

            {identityVerified ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-green-800">Identity verified successfully</p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-800">
                  Identity verification is handled earlier in the booking flow before your reservation is confirmed.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Optional manual upload (fallback) */}
        {booking && !identityVerified && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Or upload manually (if verification above fails)
            </p>

            <div className="space-y-2">
              <p className="font-semibold text-zinc-900">Driver License Photo</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onLicenseChange}
                className="block w-full text-sm"
              />
              {licenseUpload.uploading && <p className="text-sm text-zinc-600">Uploading...</p>}
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
              {licenseUpload.error && <p className="text-sm text-red-700">{licenseUpload.error}</p>}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-zinc-900">Selfie Holding License</p>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={onSelfieChange}
                className="block w-full text-sm"
              />
              {selfieUpload.uploading && <p className="text-sm text-zinc-600">Uploading...</p>}
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
              {selfieUpload.error && <p className="text-sm text-red-700">{selfieUpload.error}</p>}
            </div>
          </section>
        )}

        {completed && (
          <section className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-green-800">
              Pre-checkout complete. Your identity has been verified. See you at pickup!
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
