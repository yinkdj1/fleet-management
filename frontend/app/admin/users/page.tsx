"use client";

import { useState } from "react";
import AppShell from "../../components/AppShell";
import api from "../../../lib/api";

type FormState = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff";
};

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "staff" };

export default function CreateUserPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.name || !form.email || !form.password) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }
    if (form.password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", form);
      setMessage({ type: "success", text: `Account created for ${form.email}.` });
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setMessage({ type: "error", text: msg || "Failed to create account." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold text-zinc-900">Create Staff Account</h1>
        <p className="mt-1 text-sm text-zinc-500">New accounts can access the admin dashboard based on their role.</p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-amber-900/15 bg-white p-6 shadow-sm"
        >
          {message && (
            <div
              className={`mb-5 rounded-xl px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border border-green-300/40 bg-green-50 text-green-800"
                  : "border border-red-300/40 bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <label className="block text-sm font-medium text-zinc-700">Full Name</label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="Jane Doe"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />

          <label className="mt-4 block text-sm font-medium text-zinc-700">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="staff@carsgidi.com"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />

          <label className="mt-4 block text-sm font-medium text-zinc-700">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />

          <label className="mt-4 block text-sm font-medium text-zinc-700">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
