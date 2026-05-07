"use client";

import { useEffect, useState } from "react";
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
    imageUrl: "",
  });
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!form.imageUrl.trim()) {
      setError("Vehicle image URL is required");
      return;
    }

    try {
      await api.post("/vehicles", {
        ...form,
        year: Number(form.year),
      });

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
  <input
    name="imageUrl"
    placeholder="Vehicle Image URL"
    value={form.imageUrl}
    onChange={handleChange}
    className="w-full p-3 border rounded form-input-modern"
    required
  />

  <button className="bg-black text-white px-4 py-2 rounded">
    Create Vehicle
  </button>
</form>
    </AppShell>
  );
}