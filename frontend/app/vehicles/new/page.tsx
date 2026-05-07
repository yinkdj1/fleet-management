"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import AppShell from "../../components/AppShell";

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
];

export default function NewVehiclePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: "",
    plateNumber: "",
    status: "available",
    category: "compact",
    usageType: "both",
    description: "",
    dailyMileage: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [categoryPricing, setCategoryPricing] = useState<CategoryPricingSettings>({
    rates: {
      compact: 45,
      midsize: 55,
      suv: 65,
      luxury: 85,
    },
  });

  const [error, setError] = useState("");

  const activeCategoryRate =
    form.category === "unassigned"
      ? null
      : categoryPricing.rates[
          (form.category as "compact" | "midsize" | "suv" | "luxury") || "compact"
        ];

  const loadCategoryPricing = async () => {
    try {
      const res = await api.get("/vehicles/category-pricing");
      if (res.data?.data?.rates) {
        setCategoryPricing({ rates: res.data.data.rates });
      }
    } catch {
      // Non-blocking: fallback defaults are already present.
    }
  };

  useEffect(() => {
    loadCategoryPricing();
  }, []);

  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");

  const handleVinLookup = async (vin: string) => {
    if (vin.length !== 17) return;
    setVinLoading(true);
    setVinError("");
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
      );
      const data = await res.json();
      const results: { Variable: string; Value: string | null }[] = data.Results || [];

      const get = (label: string) =>
        results.find((r) => r.Variable === label)?.Value || "";

      const make = get("Make");
      const model = get("Model");
      const year = get("Model Year");

      if (!make && !model) {
        setVinError("VIN not recognised. Please fill in details manually.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        make: make || prev.make,
        model: model || prev.model,
        year: year || prev.year,
      }));
    } catch {
      setVinError("VIN lookup failed. Please fill in details manually.");
    } finally {
      setVinLoading(false);
    }
  };

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!imageFile) {
      setError("Vehicle image is required");
      return;
    }

    try {
      // Step 1: create the vehicle
      const createRes = await api.post("/vehicles", {
        ...form,
        year: Number(form.year),
      });
      const vehicleId = createRes.data?.data?.id;

      // Step 2: upload the image
      if (vehicleId) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await api.post(`/vehicles/${vehicleId}/image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      router.push("/vehicles");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create vehicle");
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Add Vehicle</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
  <div className="space-y-1">
    <div className="relative">
      <input
        name="vin"
        placeholder="VIN (17 characters)"
        value={form.vin}
        onChange={(e) => {
          const val = e.target.value.toUpperCase();
          setForm((prev) => ({ ...prev, vin: val }));
          setVinError("");
          if (val.length === 17) handleVinLookup(val);
        }}
        maxLength={17}
        className="w-full p-3 border rounded pr-10 form-input-modern"
      />
      {vinLoading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 animate-pulse">
          Looking up...
        </span>
      )}
    </div>
    {vinError && <p className="text-xs text-red-500">{vinError}</p>}
    {!vinError && form.vin.length === 17 && !vinLoading && form.make && (
      <p className="text-xs text-green-600">&#10003; Details auto-filled from VIN</p>
    )}
  </div>
  <input
    name="make"
    placeholder="Make"
    value={form.make}
    onChange={handleChange}
    className="w-full p-3 border rounded form-input-modern"
  />
  <input
    name="model"
    placeholder="Model"
    value={form.model}
    onChange={handleChange}
    className="w-full p-3 border rounded form-input-modern"
  />
  <input
    name="year"
    placeholder="Year"
    value={form.year}
    onChange={handleChange}
    className="w-full p-3 border rounded form-input-modern"
  />
  <input
    name="plateNumber"
    placeholder="Plate Number"
    value={form.plateNumber}
    onChange={handleChange}
    className="w-full p-3 border rounded form-input-modern"
  />
  <select
    name="category"
    value={form.category}
    onChange={handleChange}
    className="w-full p-3 border rounded"
  >
    {CATEGORY_OPTIONS.map((option) => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
  <input
    value={
      activeCategoryRate === null
        ? "Category Daily Rate: N/A (Unassigned)"
        : `Category Daily Rate: $${Number(activeCategoryRate || 0).toFixed(2)}`
    }
    className="w-full p-3 border rounded bg-gray-100 text-gray-600"
    readOnly
  />

  <select
    name="usageType"
    value={form.usageType}
    onChange={handleChange}
    className="w-full p-3 border rounded"
  >
    <option value="both">Personal/Rideshare</option>
    <option value="personal">Personal</option>
    <option value="rideshare">Rideshare</option>
  </select>
  <textarea
    name="description"
    placeholder="Vehicle description"
    value={form.description}
    onChange={handleChange}
    className="w-full p-3 border rounded min-h-24 form-input-modern"
    maxLength={400}
  />
  <input
    name="dailyMileage"
    placeholder="Daily Mileage"
    value={form.dailyMileage}
    onChange={handleChange}
    className="w-full p-3 border rounded form-input-modern"
  />
  {/* Image upload */}
  <div className="space-y-2">
    <p className="text-sm font-medium text-zinc-700">Vehicle Image</p>
    <div className="flex gap-3">
      {/* Gallery / file picker */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-blue-400 hover:bg-blue-50 px-4 py-3 text-sm text-zinc-600 hover:text-blue-700 transition-colors"
      >
        📁 Choose from device
      </button>
      {/* Live camera */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="flex-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-green-400 hover:bg-green-50 px-4 py-3 text-sm text-zinc-600 hover:text-green-700 transition-colors"
      >
        📷 Take photo
      </button>
    </div>
    {/* Hidden inputs */}
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); }}
    />
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); }}
    />
    {/* Preview */}
    {imagePreview && (
      <div className="relative">
        <img
          src={imagePreview}
          alt="Vehicle preview"
          className="w-full max-h-48 rounded-xl border border-zinc-200 object-cover"
        />
        <button
          type="button"
          onClick={() => { setImageFile(null); setImagePreview(null); }}
          className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-xs px-2 py-1 hover:bg-black/80"
        >
          ✕ Remove
        </button>
      </div>
    )}
  </div>

  <button className="bg-black text-white px-4 py-2 rounded">
    Create Vehicle
  </button>
</form>
    </AppShell>
  );
}