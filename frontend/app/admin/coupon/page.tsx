"use client";

import { useState } from "react";

export default function CouponPage() {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!code || !type || !value || !expiry) {
      setMessage("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise((r) => setTimeout(r, 600)); // Simulate network
      setMessage("Coupon created successfully!");
      setCode("");
      setType("percent");
      setValue("");
      setExpiry("");
    } catch (err) {
      setMessage("Failed to create coupon.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-8 mt-10">
      <h2 className="text-2xl font-bold mb-6 text-blue-900">Create Coupon</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Coupon Code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={20}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Discount Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="percent">Percentage (%)</option>
            <option value="amount">Dollar Amount ($)</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Discount Value</label>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            min={1}
            step="any"
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Expiry Date</label>
          <input
            type="date"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded font-semibold disabled:bg-blue-300"
        >
          {loading ? "Creating..." : "Create Coupon"}
        </button>
        {message && (
          <div className={message.includes("success") ? "text-green-600 mt-2" : "text-red-600 mt-2"}>{message}</div>
        )}
      </form>
    </div>
  );
}
