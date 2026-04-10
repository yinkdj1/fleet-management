"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import AppShell from "../../components/AppShell";

export default function NewVehiclePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: "",
    plateNumber: "",
    status: "available",
    dailyRate: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      await api.post("/vehicles", {
        ...form,
        year: Number(form.year),
        dailyRate: Number(form.dailyRate),
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
  <input
    name="dailyRate"
    placeholder="Daily Rate"
    onChange={handleChange}
    className="w-full p-3 border rounded"
  />

  <button className="bg-black text-white px-4 py-2 rounded">
    Create Vehicle
  </button>
</form>
    </AppShell>
  );
}