"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import AppShell from "../../../components/AppShell";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id;

  const [mileageOut, setMileageOut] = useState("");
  const [fuelLevelOut, setFuelLevelOut] = useState("Full");
  const [notesOut, setNotesOut] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!mileageOut) {
      setError("Mileage out is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("mileageOut", mileageOut);
      formData.append("fuelLevelOut", fuelLevelOut);
      formData.append("notesOut", notesOut);

      if (photos) {
        for (let i = 0; i < photos.length; i++) {
          formData.append("photos", photos[i]);
        }
      }

      await api.post(`/bookings/${bookingId}/checkout`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      router.push("/bookings");
    } catch (err: any) {
      setError(err.response?.data?.message || "Checkout failed");
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Checkout Vehicle</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <input
          type="number"
          placeholder="Mileage Out"
          value={mileageOut}
          onChange={(e) => setMileageOut(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <select
          value={fuelLevelOut}
          onChange={(e) => setFuelLevelOut(e.target.value)}
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
          value={notesOut}
          onChange={(e) => setNotesOut(e.target.value)}
          className="w-full p-3 border rounded"
        />

        <div>
          <label className="block mb-2 font-medium">Upload Checkout Photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(e.target.files)}
            className="w-full"
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Submit Checkout
        </button>
      </form>
    </AppShell>
  );
}