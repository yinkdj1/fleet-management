"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import AppShell from "../../../components/AppShell";

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id;

  const [mileageIn, setMileageIn] = useState("");
  const [fuelLevelIn, setFuelLevelIn] = useState("Full");
  const [notesIn, setNotesIn] = useState("");
  const [damageFee, setDamageFee] = useState("0");
  const [lateFee, setLateFee] = useState("0");
  const [cleaningFee, setCleaningFee] = useState("0");
  const [sendToMaintenance, setSendToMaintenance] = useState(false);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!mileageIn) {
      setError("Mileage in is required");
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

      if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          formData.append("photos", photos[i]);
        }
      }

      await api.post(`/bookings/${bookingId}/checkin`, formData);

      router.push("/bookings");
    } catch (err: any) {
      setError(err.response?.data?.message || "Checkin failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Checkin Vehicle</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <input
          type="number"
          placeholder="Mileage In"
          value={mileageIn}
          onChange={(e) => setMileageIn(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <select
          value={fuelLevelIn}
          onChange={(e) => setFuelLevelIn(e.target.value)}
          className="w-full p-3 border rounded"
        >
          <option value="Full">Full</option>
          <option value="3/4">3/4</option>
          <option value="1/2">1/2</option>
          <option value="1/4">1/4</option>
          <option value="Empty">Empty</option>
        </select>

        <textarea
          placeholder="Notes"
          value={notesIn}
          onChange={(e) => setNotesIn(e.target.value)}
          className="w-full p-3 border rounded"
          rows={4}
        />

        <input
          type="number"
          placeholder="Damage Fee"
          value={damageFee}
          onChange={(e) => setDamageFee(e.target.value)}
          className="w-full p-3 border rounded"
          min="0"
          step="0.01"
        />

        <input
          type="number"
          placeholder="Late Fee"
          value={lateFee}
          onChange={(e) => setLateFee(e.target.value)}
          className="w-full p-3 border rounded"
          min="0"
          step="0.01"
        />

        <input
          type="number"
          placeholder="Cleaning Fee"
          value={cleaningFee}
          onChange={(e) => setCleaningFee(e.target.value)}
          className="w-full p-3 border rounded"
          min="0"
          step="0.01"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={sendToMaintenance}
            onChange={(e) => setSendToMaintenance(e.target.checked)}
          />
          Send vehicle to maintenance after checkin
        </label>

        <div>
          <label className="block mb-2 font-medium">Upload Checkin Photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(e.target.files)}
            className="w-full"
          />

          {photos && photos.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              {Array.from(photos).map((file) => (
                <p key={file.name}>{file.name}</p>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Checkin"}
        </button>
      </form>
    </AppShell>
  );
}