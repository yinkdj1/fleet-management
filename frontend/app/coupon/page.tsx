"use client";

import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";

type SendModal = {
  open: boolean;
  couponId: string;
  couponCode: string;
  method: "email" | "sms";
  recipient: string;
  loading: boolean;
  result: string | null;
};

const DEFAULT_MODAL: SendModal = {
  open: false,
  couponId: "",
  couponCode: "",
  method: "email",
  recipient: "",
  loading: false,
  result: null,
};

export default function CouponPage() {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [sendModal, setSendModal] = useState<SendModal>(DEFAULT_MODAL);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch {
      setCoupons([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!code || !type || !value || !expiry) {
      setMessage("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, type, value, expiry }),
      });
      if (!res.ok) throw new Error("Failed to create coupon");
      setMessage("Coupon created successfully!");
      setCode("");
      setType("percent");
      setValue("");
      setExpiry("");
      fetchCoupons();
    } catch {
      setMessage("Failed to create coupon.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      fetchCoupons();
    } catch {}
  };

  const handleAutoGenerate = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let generated = "";
    for (let i = 0; i < 8; i++) {
      generated += charset[Math.floor(Math.random() * charset.length)];
    }
    setCode(generated);
    setType("percent");
    setValue("10");
    setExpiry(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setMessage("Auto-generated coupon. Adjust details if needed and click Create Coupon.");
  };

  const handleSend = async () => {
    setSendModal((m) => ({ ...m, loading: true, result: null }));
    try {
      const res = await fetch("/api/coupons/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: sendModal.couponId,
          method: sendModal.method,
          recipient: sendModal.recipient,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send");
      setSendModal((m) => ({ ...m, loading: false, result: data.message }));
    } catch (err: any) {
      setSendModal((m) => ({
        ...m,
        loading: false,
        result: "Error: " + (err.message || "Failed to send"),
      }));
    }
  };

  return (
    <AppShell>
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Coupons</h1>
        <button
          type="button"
          onClick={handleAutoGenerate}
          className="bg-black text-white px-4 py-2 rounded w-fit font-semibold hover:bg-zinc-800 transition"
        >
          + Auto Generate
        </button>
      </div>

      {/* Create coupon form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Create Coupon</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Coupon Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={20}
              required
              placeholder="e.g. SAVE10"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Discount Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="percent">Percentage (%)</option>
              <option value="amount">Dollar Amount ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Discount Value</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={1}
              step="any"
              required
              placeholder="e.g. 10"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Expiry Date</label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Creating..." : "Create Coupon"}
            </button>
            {message && (
              <p className={`text-sm ${message.includes("success") ? "text-emerald-600" : message.includes("Auto") ? "text-blue-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Coupons table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">Active Coupons</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    No coupons yet. Create one above.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-900">{coupon.code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        coupon.type === "percent"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {coupon.type === "percent" ? "Percent" : "Dollar"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {coupon.type === "percent" ? `${coupon.value}%` : `$${coupon.value}`}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{coupon.expiry}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setSendModal({
                              ...DEFAULT_MODAL,
                              open: true,
                              couponId: coupon.id,
                              couponCode: coupon.code,
                            })
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
                        >
                          Send
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Coupon Modal */}
      {sendModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSendModal(DEFAULT_MODAL)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Send Coupon</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Code:{" "}
              <span className="font-mono font-semibold text-zinc-800">
                {sendModal.couponCode}
              </span>
            </p>
            <div className="mb-3">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Send via</label>
              <select
                value={sendModal.method}
                onChange={(e) =>
                  setSendModal((m) => ({
                    ...m,
                    method: e.target.value as "email" | "sms",
                    recipient: "",
                    result: null,
                  }))
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {sendModal.method === "email"
                  ? "Email Address"
                  : "Phone Number (e.g. +14045550123)"}
              </label>
              <input
                type={sendModal.method === "email" ? "email" : "tel"}
                value={sendModal.recipient}
                onChange={(e) =>
                  setSendModal((m) => ({ ...m, recipient: e.target.value, result: null }))
                }
                placeholder={
                  sendModal.method === "email" ? "customer@email.com" : "+14045550123"
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {sendModal.result && (
              <p
                className={`mb-3 text-sm rounded-lg px-3 py-2 ${
                  sendModal.result.startsWith("Error")
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {sendModal.result}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSendModal(DEFAULT_MODAL)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-zinc-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                onClick={handleSend}
                disabled={sendModal.loading || !sendModal.recipient}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {sendModal.loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
