"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { formatBookingId } from "../../../../lib/bookingId";
import AppShell from "../../../components/AppShell";

type BookingSummary = {
  id: number;
  status: string;
  pickupDatetime: string;
  returnDatetime: string;
  totalAmount?: number;
  checkout?: { mileageOut?: number; fuelLevelOut?: string } | null;
  customer?: { firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  vehicle?: { make?: string; model?: string; plateNumber?: string; year?: number } | null;
};

type DamageMarker = { x: number; y: number; label: string };

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Empty"];


function CarDiagram({
  markers,
  onAddMarker,
}: {
  markers: DamageMarker[];
  onAddMarker: (m: DamageMarker) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 220 / rect.width;
    const scaleY = 460 / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setPendingPos({ x, y });
    setPendingLabel("");
  };

  const confirmMarker = () => {
    if (!pendingPos) return;
    onAddMarker({ ...pendingPos, label: pendingLabel.trim() || "Damage" });
    setPendingPos(null);
    setPendingLabel("");
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Click on the diagram to mark any damage found on return.</p>
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 py-2">
        <svg
          ref={svgRef}
          viewBox="0 0 220 460"
          className="mx-auto w-full max-w-[200px] cursor-crosshair"
          onClick={handleSvgClick}
        >
          {/* Wheels */}
          <ellipse cx="12" cy="112" rx="13" ry="22" fill="#1f2937" />
          <ellipse cx="12" cy="112" rx="6" ry="12" fill="#4b5563" />
          <ellipse cx="208" cy="112" rx="13" ry="22" fill="#1f2937" />
          <ellipse cx="208" cy="112" rx="6" ry="12" fill="#4b5563" />
          <ellipse cx="12" cy="358" rx="13" ry="22" fill="#1f2937" />
          <ellipse cx="12" cy="358" rx="6" ry="12" fill="#4b5563" />
          <ellipse cx="208" cy="358" rx="13" ry="22" fill="#1f2937" />
          <ellipse cx="208" cy="358" rx="6" ry="12" fill="#4b5563" />
          {/* Main body */}
          <path d="M75,18 C60,14 40,22 34,46 L28,90 L26,185 L26,295 L28,368 C34,398 52,414 72,417 L148,417 C168,414 186,398 192,368 L194,295 L194,185 L192,90 L186,46 C180,22 160,14 145,18 Z" fill="#d1d5db" stroke="#6b7280" strokeWidth="1.5" />
          {/* Side mirrors */}
          <path d="M26,200 L15,204 L15,218 L26,220 Z" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
          <path d="M194,200 L205,204 L205,218 L194,220 Z" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
          {/* Headlights */}
          <rect x="34" y="44" width="22" height="12" rx="3" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
          <rect x="164" y="44" width="22" height="12" rx="3" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
          {/* Front bumper */}
          <path d="M36,30 Q110,18 184,30" fill="none" stroke="#9ca3af" strokeWidth="1.2" />
          {/* Hood panel */}
          <path d="M48,60 L172,60 L172,156 L48,156 Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" fillOpacity="0.5" />
          <line x1="84" y1="60" x2="82" y2="156" stroke="#9ca3af" strokeWidth="0.8" />
          <line x1="136" y1="60" x2="138" y2="156" stroke="#9ca3af" strokeWidth="0.8" />
          {/* Front windshield */}
          <path d="M50,160 L60,200 L160,200 L170,160 Z" fill="#bfdbfe" stroke="#6b7280" strokeWidth="1" fillOpacity="0.9" />
          <line x1="78" y1="166" x2="142" y2="170" stroke="#6b7280" strokeWidth="1" strokeLinecap="round" />
          {/* A-pillars */}
          <line x1="50" y1="203" x2="42" y2="163" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="170" y1="203" x2="178" y2="163" stroke="#6b7280" strokeWidth="1.5" />
          {/* Cabin roof */}
          <rect x="43" y="203" width="134" height="94" rx="3" fill="#cbd5e1" stroke="#6b7280" strokeWidth="1" />
          {/* Door divider */}
          <line x1="28" y1="252" x2="192" y2="252" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4,3" />
          {/* C-pillars */}
          <line x1="50" y1="297" x2="42" y2="337" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="170" y1="297" x2="178" y2="337" stroke="#6b7280" strokeWidth="1.5" />
          {/* Rear windshield */}
          <path d="M50,301 L60,339 L160,339 L170,301 Z" fill="#bfdbfe" stroke="#6b7280" strokeWidth="1" fillOpacity="0.9" />
          {/* Trunk panel */}
          <path d="M48,342 L172,342 L172,400 L48,400 Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" fillOpacity="0.5" />
          <line x1="84" y1="342" x2="82" y2="400" stroke="#9ca3af" strokeWidth="0.8" />
          <line x1="136" y1="342" x2="138" y2="400" stroke="#9ca3af" strokeWidth="0.8" />
          {/* Taillights */}
          <rect x="34" y="390" width="22" height="14" rx="3" fill="#fca5a5" stroke="#dc2626" strokeWidth="1" />
          <rect x="164" y="390" width="22" height="14" rx="3" fill="#fca5a5" stroke="#dc2626" strokeWidth="1" />
          {/* Rear bumper */}
          <path d="M36,412 Q110,424 184,412" fill="none" stroke="#9ca3af" strokeWidth="1.2" />
          {/* Labels */}
          <text x="110" y="11" textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="600">FRONT</text>
          <text x="110" y="452" textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="600">REAR</text>
          {/* Damage markers */}
          {markers.map((m, i) => (
            <g key={i}>
              <circle cx={m.x} cy={m.y} r="9" fill="#ef4444" fillOpacity="0.85" stroke="#fff" strokeWidth="2" />
              <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">{i + 1}</text>
            </g>
          ))}
          {pendingPos && (
            <circle cx={pendingPos.x} cy={pendingPos.y} r="9" fill="#f59e0b" fillOpacity="0.7" stroke="#fff" strokeWidth="2" strokeDasharray="3 2" />
          )}
        </svg>
      </div>

      {pendingPos && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <input
            type="text"
            value={pendingLabel}
            onChange={(e) => setPendingLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmMarker()}
            placeholder="Describe damage (e.g. scratch, dent)"
            className="flex-1 rounded border px-2 py-1 text-sm"
            autoFocus
          />
          <button type="button" onClick={confirmMarker} className="rounded bg-amber-500 px-3 py-1 text-sm text-white">Add</button>
          <button type="button" onClick={() => setPendingPos(null)} className="rounded border px-3 py-1 text-sm text-gray-600">Cancel</button>
        </div>
      )}

      {markers.length > 0 && (
        <ol className="space-y-1 text-sm text-gray-700">
          {markers.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{i + 1}</span>
              {m.label}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id;

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);

  const [mileageIn, setMileageIn] = useState("");
  const [fuelLevelIn, setFuelLevelIn] = useState("Full");
  const [notesIn, setNotesIn] = useState("");
  const [damageFee, setDamageFee] = useState("0");
  const [lateFee, setLateFee] = useState("0");
  const [cleaningFee, setCleaningFee] = useState("0");
  const [sendToMaintenance, setSendToMaintenance] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data?.data || null))
      .catch(() => {})
      .finally(() => setLoadingBooking(false));
  }, [bookingId]);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => {
      const next = [...prev, ...files];
      setPreviewUrls(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setPreviewUrls(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  };

  const totalFees =
    (Number(damageFee) || 0) + (Number(lateFee) || 0) + (Number(cleaningFee) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!mileageIn || Number(mileageIn) <= 0) {
      setError("A valid mileage in is required.");
      return;
    }

    if (booking?.checkout?.mileageOut && Number(mileageIn) < booking.checkout.mileageOut) {
      setError(`Mileage in (${mileageIn}) cannot be less than mileage out (${booking.checkout.mileageOut}).`);
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("mileageIn", mileageIn);
      formData.append("fuelLevelIn", fuelLevelIn);
      formData.append("notesIn", notesIn);
      formData.append("damageFee", damageFee);
      formData.append("lateFee", lateFee);
      formData.append("cleaningFee", cleaningFee);
      formData.append("sendToMaintenance", String(sendToMaintenance));
      formData.append("damageMarkersJson", JSON.stringify(damageMarkers));
      photos.forEach((photo) => formData.append("photos", photo));

      await api.post(`/bookings/${bookingId}/checkin`, formData);
      router.push(`/bookings/${bookingId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Checkin failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vehicle Check-In</h1>
          <p className="mt-1 text-gray-500">Record mileage, fuel, photos, damage, and any fees during vehicle check-in.</p>
        </div>
        <Link href="/bookings" className="rounded bg-zinc-800 px-4 py-2 text-sm text-white">
          ← Back to Bookings
        </Link>
      </div>

      {/* Booking summary */}
      {!loadingBooking && booking && (
        <div className="mb-6 rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="mb-2 text-sm font-semibold text-green-900">Booking {formatBookingId(booking.id)}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-green-800 md:grid-cols-4">
            <p><span className="font-medium">Customer:</span> {booking.customer?.firstName} {booking.customer?.lastName}</p>
            <p><span className="font-medium">Vehicle:</span> {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.plateNumber})</p>
            <p><span className="font-medium">Pickup:</span> {new Date(booking.pickupDatetime).toLocaleString()}</p>
            <p><span className="font-medium">Return due:</span> {new Date(booking.returnDatetime).toLocaleString()}</p>
          </div>
          {booking.checkout?.mileageOut != null && (
            <p className="mt-2 text-sm text-green-700">
              <span className="font-medium">Mileage at drop-off:</span> {booking.checkout.mileageOut} mi &nbsp;|&nbsp;
              <span className="font-medium">Fuel at drop-off:</span> {booking.checkout.fuelLevelOut || "-"}
            </p>
          )}
        </div>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">

        {/* Section 1 — Check-in details */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Check-In Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mileage In <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 13120"
                value={mileageIn}
                onChange={(e) => setMileageIn(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5"
                required
              />
              {booking?.checkout?.mileageOut != null && (
                <p className="mt-1 text-xs text-gray-500">Drop-off was {booking.checkout.mileageOut} mi</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fuel Level <span className="text-red-500">*</span></label>
              <select
                value={fuelLevelIn}
                onChange={(e) => setFuelLevelIn(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5"
              >
                {FUEL_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Comments / Notes</label>
              <textarea
                rows={3}
                placeholder="Any notes about the vehicle condition at return…"
                value={notesIn}
                onChange={(e) => setNotesIn(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>
          </div>
        </section>

        {/* Section 2 — Damage diagram */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Damage Diagram</h2>
          <p className="mb-4 text-sm text-gray-500">Click the vehicle to mark damage found on return.</p>
          <CarDiagram
            markers={damageMarkers}
            onAddMarker={(m) => setDamageMarkers((prev) => [...prev, m])}
          />
          {damageMarkers.length > 0 && (
            <button
              type="button"
              onClick={() => setDamageMarkers([])}
              className="mt-3 text-sm text-red-600 underline"
            >
              Clear all markers
            </button>
          )}
        </section>

        {/* Section 3 — Photos */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Check-In Photos</h2>
          <p className="mb-4 text-sm text-gray-500">Upload check-in photos of all sides of the vehicle, including any damage.</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 hover:border-green-400 hover:text-green-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 12V4m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Click to add photos (multiple allowed)
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
          </label>
          {previewUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {previewUrls.map((url, i) => (
                <div key={i} className="group relative">
                  <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-lg border object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 hidden rounded-full bg-red-500 p-0.5 text-white group-hover:flex"
                    aria-label="Remove photo"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4 — Fees */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Additional Fees</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Damage Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={damageFee}
                onChange={(e) => setDamageFee(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Late Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={lateFee}
                onChange={(e) => setLateFee(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cleaning Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cleaningFee}
                onChange={(e) => setCleaningFee(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>
          </div>
          {totalFees > 0 && (
            <p className="mt-3 text-sm font-semibold text-gray-800">
              Total additional fees: ${totalFees.toFixed(2)}
            </p>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={sendToMaintenance}
              onChange={(e) => setSendToMaintenance(e.target.checked)}
              className="rounded"
            />
            Send vehicle to maintenance queue after return
          </label>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Submitting Return…" : "Complete Checkin"}
          </button>
          <Link href="/bookings" className="text-sm text-gray-500 underline">Cancel</Link>
        </div>
      </form>
    </AppShell>
  );
}