"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import AppShell from "../components/AppShell";

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
  imageUrl?: string;
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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingUsageId, setSavingUsageId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<VehicleEditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get("/vehicles");
      setVehicles(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load vehicles");
    }
  };

  const filteredVehicles = useMemo(() => {
  return vehicles.filter((vehicle) => {
    const search = searchTerm.toLowerCase().trim();
    const normalizedStatus = (vehicle.status || "").toLowerCase();

    const matchesSearch =
      (vehicle.make || "").toLowerCase().includes(search) ||
      (vehicle.model || "").toLowerCase().includes(search) ||
      (vehicle.plateNumber || "").toLowerCase().includes(search) ||
      vehicle.year.toString().includes(search);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "booked" &&
        (normalizedStatus === "booked" || normalizedStatus === "rented")) ||
      normalizedStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });
}, [vehicles, searchTerm, statusFilter]);



  const getStatusBadge = (status: string) => {
  const normalized = (status || "").toLowerCase();

  if (normalized === "available") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "booked" || normalized === "rented") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (normalized === "maintenance") {
    return "bg-red-100 text-red-700";
  }

  if (normalized === "unavailable") {
    return "bg-gray-200 text-gray-700";
  }

  return "bg-blue-100 text-blue-700";
};

  const getUsageLabel = (usageType?: string) => {
    const normalized = (usageType || "both").toLowerCase();
    if (normalized === "personal") return "Personal";
    if (normalized === "rideshare") return "Rideshare";
    return "Personal/Rideshare";
  };

  const handleUsageTypeChange = async (vehicleId: number, usageType: string) => {
    try {
      setSavingUsageId(vehicleId);
      await api.put(`/vehicles/${vehicleId}`, { usageType });

      setVehicles((prev) =>
        prev.map((vehicle) =>
          vehicle.id === vehicleId ? { ...vehicle, usageType } : vehicle
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update vehicle usage type");
    } finally {
      setSavingUsageId(null);
    }
  };

  const handleOpenEdit = async (vehicleId: number) => {
    try {
      setError("");
      const res = await api.get(`/vehicles/${vehicleId}`);
      const vehicle = res.data?.data as Vehicle | undefined;

      if (!vehicle) {
        setError("Vehicle not found");
        return;
      }

      setEditingVehicleId(vehicleId);
      setEditForm({
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
      setError(err.response?.data?.message || "Failed to load vehicle details");
    }
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editForm) return;
    const { name, value } = e.target;
    setEditForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicleId || !editForm) return;

    try {
      setSavingEdit(true);
      setError("");

      const payload = {
        vin: editForm.vin.trim(),
        make: editForm.make.trim(),
        model: editForm.model.trim(),
        year: Number(editForm.year),
        plateNumber: editForm.plateNumber.trim(),
        status: editForm.status,
        usageType: editForm.usageType,
        dailyRate: Number(editForm.dailyRate),
        color: editForm.color.trim() || null,
        mileage: Number(editForm.mileage || 0),
        description: editForm.description.trim(),
        fuelType: editForm.fuelType.trim(),
        transmission: editForm.transmission.trim(),
        passengers: Number(editForm.passengers || 0),
        dailyMileage: Number(editForm.dailyMileage || 0),
      };

      const res = await api.put(`/vehicles/${editingVehicleId}`, payload);
      const updatedVehicle = res.data?.data as Vehicle;

      setVehicles((prev) =>
        prev.map((vehicle) =>
          vehicle.id === editingVehicleId ? { ...vehicle, ...updatedVehicle } : vehicle
        )
      );

      setEditingVehicleId(null);
      setEditForm(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update vehicle");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingVehicleId(null);
    setEditForm(null);
  };

  const handleUploadImageClick = (vehicleId: number) => {
    uploadTargetId.current = vehicleId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const vehicleId = uploadTargetId.current;
    if (!file || !vehicleId) return;

    // Reset the input so the same file can be re-selected if needed
    e.target.value = "";

    try {
      setUploadingImageId(vehicleId);
      setError("");
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post(`/vehicles/${vehicleId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl: string = res.data?.data?.imageUrl ?? "";
      setVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, imageUrl } : v))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingImageId(null);
      uploadTargetId.current = null;
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Vehicles</h1>

        <Link
          href="/vehicles/new"
          className="bg-black text-white px-4 py-2 rounded w-fit"
        >
          + Add Vehicle
        </Link>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by make, model, plate, or year"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-80"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-56"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {editingVehicleId && editForm && (
          <form onSubmit={handleSaveEdit} className="border-b bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Vehicle #{editingVehicleId}</h2>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded border px-3 py-1 text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input name="vin" value={editForm.vin} onChange={handleEditChange} placeholder="VIN" className="rounded border px-3 py-2" required />
              <input name="make" value={editForm.make} onChange={handleEditChange} placeholder="Make" className="rounded border px-3 py-2" required />
              <input name="model" value={editForm.model} onChange={handleEditChange} placeholder="Model" className="rounded border px-3 py-2" required />
              <input name="year" value={editForm.year} onChange={handleEditChange} placeholder="Year" className="rounded border px-3 py-2" required />
              <input name="plateNumber" value={editForm.plateNumber} onChange={handleEditChange} placeholder="Plate Number" className="rounded border px-3 py-2" required />
              <input name="dailyRate" value={editForm.dailyRate} onChange={handleEditChange} placeholder="Daily Rate" className="rounded border px-3 py-2" required />
              <input name="mileage" value={editForm.mileage} onChange={handleEditChange} placeholder="Mileage" className="rounded border px-3 py-2" />
              <input name="color" value={editForm.color} onChange={handleEditChange} placeholder="Color" className="rounded border px-3 py-2" />
              <input name="fuelType" value={editForm.fuelType} onChange={handleEditChange} placeholder="Fuel Type" className="rounded border px-3 py-2" />
              <input name="transmission" value={editForm.transmission} onChange={handleEditChange} placeholder="Transmission" className="rounded border px-3 py-2" />
              <input name="passengers" value={editForm.passengers} onChange={handleEditChange} placeholder="Passengers" className="rounded border px-3 py-2" />
              <input name="dailyMileage" value={editForm.dailyMileage} onChange={handleEditChange} placeholder="Daily Mileage" className="rounded border px-3 py-2" />
              <textarea name="description" value={editForm.description} onChange={handleEditChange} placeholder="Description" className="rounded border px-3 py-2 md:col-span-2 xl:col-span-4 min-h-20" maxLength={400} />

              <select name="status" value={editForm.status} onChange={handleEditChange} className="rounded border px-3 py-2">
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
                <option value="unavailable">Unavailable</option>
                <option value="out_of_service">Out of Service</option>
              </select>

              <select name="usageType" value={editForm.usageType} onChange={handleEditChange} className="rounded border px-3 py-2">
                <option value="both">Personal/Rideshare</option>
                <option value="personal">Personal</option>
                <option value="rideshare">Rideshare</option>
              </select>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Image</th>
              <th className="text-left p-4">Make</th>
              <th className="text-left p-4">Model</th>
              <th className="text-left p-4">Year</th>
              <th className="text-left p-4">Plate</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Usage</th>
              <th className="text-left p-4">Rate</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-t">
                  <td className="p-4">
                    {vehicle.imageUrl ? (
                      <img
                        src={`http://localhost:5000${vehicle.imageUrl}`}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="h-12 w-16 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="p-4">{vehicle.make}</td>
                  <td className="p-4">{vehicle.model}</td>
                  <td className="p-4">{vehicle.year}</td>
                  <td className="p-4">{vehicle.plateNumber}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                        vehicle.status
                      )}`}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={(vehicle.usageType || "both").toLowerCase()}
                      onChange={(e) => handleUsageTypeChange(vehicle.id, e.target.value)}
                      disabled={savingUsageId === vehicle.id}
                      className="rounded-lg border px-2 py-1 text-sm"
                    >
                      <option value="both">Personal/Rideshare</option>
                      <option value="personal">Personal</option>
                      <option value="rideshare">Rideshare</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{getUsageLabel(vehicle.usageType)}</p>
                  </td>
                  <td className="p-4">${vehicle.dailyRate}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(vehicle.id)}
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      >
                        Quick Edit
                      </button>
                      <Link
                        href={`/vehicles/${vehicle.id}/edit`}
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      >
                        Full Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUploadImageClick(vehicle.id)}
                        disabled={uploadingImageId === vehicle.id}
                        className="rounded border px-3 py-1 text-sm hover:bg-blue-50 text-blue-600 border-blue-200 disabled:opacity-60"
                      >
                        {uploadingImageId === vehicle.id ? "Uploading…" : vehicle.imageUrl ? "Change Image" : "Upload Image"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="text-center p-6 text-gray-500">
                  No vehicles found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}