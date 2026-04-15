"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../../lib/api";
import AppShell from "../../../components/AppShell";

type Vehicle = {
  id: number;
  vin?: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  status: string;
  usageType?: "personal" | "rideshare" | "both" | string;
  description?: string;
  fuelType?: string;
  transmission?: string;
  passengers?: number;
  dailyMileage?: number;
  dailyRate: number;
  color?: string | null;
  mileage?: number;
};

type VehicleEditForm = {
  vin: string;
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  status: string;
  usageType: string;
  dailyRate: string;
  color: string;
  mileage: string;
  description: string;
  fuelType: string;
  transmission: string;
  passengers: string;
  dailyMileage: string;
};

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params?.id);

  const [form, setForm] = useState<VehicleEditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
        setError("Invalid vehicle id");
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/vehicles/${vehicleId}`);
        const vehicle = res.data?.data as Vehicle | undefined;

        if (!vehicle) {
          setError("Vehicle not found");
          setLoading(false);
          return;
        }

        setForm({
          vin: String(vehicle.vin || ""),
          make: String(vehicle.make || ""),
          model: String(vehicle.model || ""),
          year: String(vehicle.year || ""),
          plateNumber: String(vehicle.plateNumber || ""),
          status: String(vehicle.status || "available"),
          usageType: String((vehicle.usageType || "both")).toLowerCase(),
          dailyRate: String(vehicle.dailyRate ?? ""),
          color: String(vehicle.color || ""),
          mileage: String(vehicle.mileage ?? "0"),
          description: String(vehicle.description || ""),
          fuelType: String(vehicle.fuelType || ""),
          transmission: String(vehicle.transmission || ""),
          passengers: String(vehicle.passengers ?? ""),
          dailyMileage: String(vehicle.dailyMileage ?? ""),
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load vehicle");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!form) return;
    const { name, value } = e.target;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !Number.isFinite(vehicleId) || vehicleId <= 0) return;

    try {
      setSaving(true);
      setError("");

      await api.put(`/vehicles/${vehicleId}`, {
        vin: form.vin.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        plateNumber: form.plateNumber.trim(),
        status: form.status,
        usageType: form.usageType,
        dailyRate: Number(form.dailyRate),
        color: form.color.trim() || null,
        mileage: Number(form.mileage || 0),
        description: form.description.trim(),
        fuelType: form.fuelType.trim(),
        transmission: form.transmission.trim(),
        passengers: Number(form.passengers || 0),
        dailyMileage: Number(form.dailyMileage || 0),
      });

      router.push("/vehicles");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Edit Vehicle</h1>
        <Link href="/vehicles" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
          Back to Vehicles
        </Link>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {loading ? (
        <p className="text-gray-600">Loading vehicle details...</p>
      ) : form ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-5 shadow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input name="vin" value={form.vin} onChange={handleChange} placeholder="VIN" className="rounded border px-3 py-2" required />
            <input name="make" value={form.make} onChange={handleChange} placeholder="Make" className="rounded border px-3 py-2" required />
            <input name="model" value={form.model} onChange={handleChange} placeholder="Model" className="rounded border px-3 py-2" required />
            <input name="year" value={form.year} onChange={handleChange} placeholder="Year" className="rounded border px-3 py-2" required />
            <input name="plateNumber" value={form.plateNumber} onChange={handleChange} placeholder="Plate Number" className="rounded border px-3 py-2" required />
            <input name="dailyRate" value={form.dailyRate} onChange={handleChange} placeholder="Daily Rate" className="rounded border px-3 py-2" required />
            <input name="mileage" value={form.mileage} onChange={handleChange} placeholder="Mileage" className="rounded border px-3 py-2" />
            <input name="color" value={form.color} onChange={handleChange} placeholder="Color" className="rounded border px-3 py-2" />
            <input name="fuelType" value={form.fuelType} onChange={handleChange} placeholder="Fuel Type" className="rounded border px-3 py-2" />
            <input name="transmission" value={form.transmission} onChange={handleChange} placeholder="Transmission" className="rounded border px-3 py-2" />
            <input name="passengers" value={form.passengers} onChange={handleChange} placeholder="Passengers" className="rounded border px-3 py-2" />
            <input name="dailyMileage" value={form.dailyMileage} onChange={handleChange} placeholder="Daily Mileage" className="rounded border px-3 py-2" />
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="rounded border px-3 py-2 md:col-span-2 xl:col-span-3 min-h-24" maxLength={400} />

            <select name="status" value={form.status} onChange={handleChange} className="rounded border px-3 py-2">
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
              <option value="unavailable">Unavailable</option>
              <option value="out_of_service">Out of Service</option>
            </select>

            <select name="usageType" value={form.usageType} onChange={handleChange} className="rounded border px-3 py-2">
              <option value="both">Personal/Rideshare</option>
              <option value="personal">Personal</option>
              <option value="rideshare">Rideshare</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-black px-5 py-2 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Vehicle"}
            </button>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
