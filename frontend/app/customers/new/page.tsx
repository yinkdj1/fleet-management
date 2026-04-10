"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import AppShell from "../../components/AppShell";

export default function NewCustomerPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    driversLicenseNo: "",
    licenseExpiry: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e: any) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: any) => {
  e.preventDefault();
  setError("");

  // 🔴 Required fields check
  if (
    !form.firstName ||
    !form.lastName ||
    !form.email ||
    !form.phone ||
    !form.driversLicenseNo ||
    !form.licenseExpiry
  ) {
    setError("All fields are required");
    return;
  }

  // 🔴 Email validation
  if (!form.email.includes("@")) {
    setError("Invalid email address");
    return;
  }

  // 🔴 Phone validation (basic)
  if (form.phone.length < 10) {
    setError("Phone number must be at least 10 digits");
    return;
  }

  try {
    await api.post("/customers", form);
    router.push("/customers");
  } catch (err: any) {
    setError(err.response?.data?.message || "Failed to create customer");
  }
};

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Add Customer</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <input
          name="firstName"
          placeholder="First Name"
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        />
        <input
          name="lastName"
          placeholder="Last Name"
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        />
        <input
          name="email"
          type= "email"
          placeholder="Email"
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone"
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        />
        <input
          name="driversLicenseNo"
          placeholder="Driver License Number"
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        />
        <input
          name="licenseExpiry"
          type="date"
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        />

        <button className="bg-black text-white px-4 py-2 rounded">
          Create Customer
        </button>
      </form>
    </AppShell>
  );
}