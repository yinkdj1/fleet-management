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
  <input
    name="vin"
    placeholder="VIN"
    onChange={handleChange}
    className="w-full p-3 border rounded"
  />
  <input
    name="make"
    placeholder="Make"
    onChange={handleChange}
    className="w-full p-3 border rounded"
  />
  <input
    name="model"
    placeholder="Model"
    onChange={handleChange}
    className="w-full p-3 border rounded"
  />
  <input
    name="year"
    placeholder="Year"
    onChange={handleChange}
    className="w-full p-3 border rounded"
  />
  <input
    name="plateNumber"
    placeholder="Plate Number"
    onChange={handleChange}
    className="w-full p-3 border rounded"
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
    onChange={handleChange}
    className="w-full p-3 border rounded min-h-24"
    maxLength={400}
  />
  <input
    name="dailyMileage"
    placeholder="Daily Mileage"
    onChange={handleChange}
    className="w-full p-3 border rounded"
  />
  <input
    name="imageUrl"
    placeholder="Vehicle Image URL"
    onChange={handleChange}
    className="w-full p-3 border rounded"
    required
  />

  <button className="bg-black text-white px-4 py-2 rounded">
    Create Vehicle
  </button>
</form>
    </AppShell>
  );
}