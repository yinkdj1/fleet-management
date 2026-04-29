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
  category?: "compact" | "midsize" | "suv" | "luxury" | "unassigned" | string;
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
  category: string;
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

type CategoryPricingSettings = {
  rates: {
    compact: number;
    midsize: number;
    suv: number;
    luxury: number;
  };
};

const CATEGORY_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "midsize", label: "Midsize" },
  { value: "suv", label: "SUV" },
  { value: "luxury", label: "Luxury" },
  { value: "unassigned", label: "Unassigned" },
] as const;

type CategoryKey = (typeof CATEGORY_OPTIONS)[number]["value"];
const PRICED_CATEGORY_OPTIONS = ["compact", "midsize", "suv", "luxury"] as const;
type PricedCategoryKey = (typeof PRICED_CATEGORY_OPTIONS)[number];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingUsageId, setSavingUsageId] = useState<number | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<VehicleEditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingCategoryPricing, setSavingCategoryPricing] = useState(false);
  const [assigningVehicleToCategory, setAssigningVehicleToCategory] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("compact");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryKey>("all");
  const [selectedVehicleToAssign, setSelectedVehicleToAssign] = useState("");
  const [categoryPricing, setCategoryPricing] = useState<CategoryPricingSettings>({
    rates: {
      compact: 45,
      midsize: 55,
      suv: 65,
      luxury: 85,
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  useEffect(() => {
    fetchVehicles();
    fetchCategoryPricing();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get("/vehicles");
      setVehicles(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load vehicles");
    }
  };

  const fetchCategoryPricing = async () => {
    try {
      const res = await api.get("/vehicles/category-pricing");
      if (res.data?.data?.rates) {
        setCategoryPricing({ rates: res.data.data.rates });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load vehicle category pricing");
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

    const matchesCategory =
      categoryFilter === "all" ||
      String(vehicle.category || "compact").toLowerCase() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });
}, [vehicles, searchTerm, statusFilter, categoryFilter]);

  const vehiclesInActiveCategory = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          String(vehicle.category || "compact").toLowerCase() === activeCategory
      ),
    [vehicles, activeCategory]
  );

  const vehiclesNotInActiveCategory = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          String(vehicle.category || "compact").toLowerCase() !== activeCategory
      ),
    [vehicles, activeCategory]
  );



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

  const getCategoryLabel = (category?: string) => {
    const normalized = String(category || "compact").toLowerCase();
    const match = CATEGORY_OPTIONS.find((item) => item.value === normalized);
    return match?.label || "Unassigned";
  };

  const isPricedCategory = (category: CategoryKey): category is PricedCategoryKey =>
    PRICED_CATEGORY_OPTIONS.includes(category as PricedCategoryKey);

  const handleCategoryRateChange = (
    category: PricedCategoryKey,
    value: string
  ) => {
    const parsed = Number(value);
    setCategoryPricing((prev) => ({
      ...prev,
      rates: {
        ...prev.rates,
        [category]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  const handleSaveCategoryPricing = async () => {
    try {
      setSavingCategoryPricing(true);
      setError("");
      await api.put("/vehicles/category-pricing", categoryPricing.rates);
      await fetchVehicles();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update category pricing");
    } finally {
      setSavingCategoryPricing(false);
    }
  };

  const handleAssignVehicleToActiveCategory = async () => {
    if (!selectedVehicleToAssign) return;

    try {
      setAssigningVehicleToCategory(true);
      setError("");
      await api.put(`/vehicles/${selectedVehicleToAssign}`, { category: activeCategory });
      setSelectedVehicleToAssign("");
      await fetchVehicles();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add car to category");
    } finally {
      setAssigningVehicleToCategory(false);
    }
  };

  const handleRemoveVehicleFromCategory = async (vehicleId: number) => {
    try {
      setSavingCategoryId(vehicleId);
      setError("");
      await api.put(`/vehicles/${vehicleId}`, { category: "unassigned" });
      await fetchVehicles();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove car from category");
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleVehicleCategoryChange = async (vehicleId: number, category: string) => {
    try {
      setSavingCategoryId(vehicleId);
      await api.put(`/vehicles/${vehicleId}`, { category });
      await fetchVehicles();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update vehicle category");
    } finally {
      setSavingCategoryId(null);
    }
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
        category: String((vehicle.category || "compact")).toLowerCase(),
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
        category: editForm.category,
        usageType: editForm.usageType,
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

  const handleDeleteVehicle = async (vehicleId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vehicle? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingVehicleId(vehicleId);
      setError("");
      await api.delete(`/vehicles/${vehicleId}`);
      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete vehicle");
    } finally {
      setDeletingVehicleId(null);
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

      <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Vehicle Categories</h2>
          <button
            type="button"
            onClick={handleSaveCategoryPricing}
            disabled={savingCategoryPricing}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {savingCategoryPricing ? "Saving..." : "Save Category Changes"}
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_OPTIONS.map((category) => {
            const count = vehicles.filter(
              (vehicle) =>
                String(vehicle.category || "compact").toLowerCase() === category.value
            ).length;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                className={`admin-hover-darken rounded-lg border p-3 text-left transition ${
                  activeCategory === category.value
                    ? "border-black bg-gray-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{category.label}</p>
                <p className="mt-1 text-sm text-gray-700">{count} vehicles</p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                  {isPricedCategory(category.value)
                    ? `$${Number(categoryPricing.rates[category.value] || 0).toFixed(2)}/day`
                    : "No category pricing"}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active Category</p>
              <h3 className="text-lg font-semibold text-gray-900">
                {CATEGORY_OPTIONS.find((option) => option.value === activeCategory)?.label}
              </h3>
            </div>

            <label className="block w-full md:max-w-xs">
              <span className="mb-1 block text-sm font-medium text-gray-700">Category Daily Rate</span>
              {isPricedCategory(activeCategory) ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={categoryPricing.rates[activeCategory]}
                  onChange={(e) => handleCategoryRateChange(activeCategory, e.target.value)}
                  className="w-full rounded border bg-white px-3 py-2"
                />
              ) : (
                <input
                  value="N/A"
                  readOnly
                  className="w-full rounded border bg-gray-100 px-3 py-2 text-gray-600"
                />
              )}
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Cars in this category</p>
              {vehiclesInActiveCategory.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {vehiclesInActiveCategory.map((vehicle) => (
                    <li key={vehicle.id} className="flex items-center justify-between gap-3 rounded border bg-white px-3 py-2 text-sm text-gray-700">
                      <span className="truncate">
                        {vehicle.make} {vehicle.model} ({vehicle.plateNumber})
                      </span>
                      {String(vehicle.category || "compact").toLowerCase() !== "unassigned" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicleFromCategory(vehicle.id)}
                          disabled={savingCategoryId === vehicle.id}
                          className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {savingCategoryId === vehicle.id ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No cars currently assigned.</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Add car to this category</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedVehicleToAssign}
                  onChange={(e) => setSelectedVehicleToAssign(e.target.value)}
                  className="w-full rounded border bg-white px-3 py-2"
                >
                  <option value="">Select vehicle</option>
                  {vehiclesNotInActiveCategory.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.plateNumber})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignVehicleToActiveCategory}
                  disabled={!selectedVehicleToAssign || assigningVehicleToCategory}
                  className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
                >
                  {assigningVehicleToCategory ? "Adding..." : "Add Car"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full px-3 py-1 text-sm ${
              categoryFilter === "all"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Categories
          </button>
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setCategoryFilter(category.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                categoryFilter === category.value
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

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
              <select name="category" value={editForm.category} onChange={handleEditChange} className="rounded border px-3 py-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input name="dailyRate" value={editForm.dailyRate} placeholder="Daily Rate" className="rounded border bg-gray-100 px-3 py-2 text-gray-600" readOnly />
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
              <th className="text-left p-4">Category</th>
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
                  <td className="p-4">
                    <select
                      value={(vehicle.category || "compact").toLowerCase()}
                      onChange={(e) => handleVehicleCategoryChange(vehicle.id, e.target.value)}
                      disabled={savingCategoryId === vehicle.id}
                      className="rounded-lg border px-2 py-1 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{getCategoryLabel(vehicle.category)}</p>
                    {(vehicle.category || "compact").toLowerCase() !== "unassigned" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicleFromCategory(vehicle.id)}
                        disabled={savingCategoryId === vehicle.id}
                        className="mt-1 rounded border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {savingCategoryId === vehicle.id ? "Removing..." : "Remove from category"}
                      </button>
                    )}
                  </td>
                  <td className="p-4">${Number(vehicle.dailyRate || 0).toFixed(2)}</td>
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
                        disabled={uploadingImageId === vehicle.id || deletingVehicleId === vehicle.id}
                        className="rounded border px-3 py-1 text-sm hover:bg-blue-50 text-blue-600 border-blue-200 disabled:opacity-60"
                      >
                        {uploadingImageId === vehicle.id ? "Uploading…" : vehicle.imageUrl ? "Change Image" : "Upload Image"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        disabled={deletingVehicleId === vehicle.id}
                        className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingVehicleId === vehicle.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="text-center p-6 text-gray-500">
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