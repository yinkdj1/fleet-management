"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import api from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "admin@example.com", password: "Password123" });
  const [error, setError] = useState("");

  // 2FA state
  const [requires2fa, setRequires2fa] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", form);
      const payload = res.data?.data || res.data;

      if (payload.requires2fa) {
        setPendingUserId(payload.userId);
        setRequires2fa(true);
        return;
      }

      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      document.cookie = `token=${payload.token}; path=/; SameSite=Lax; max-age=604800`;
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setError(errorMessage || "Login failed");
    }
  };

  const handleTotpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setTotpLoading(true);

    try {
      const res = await api.post("/auth/2fa/confirm", { userId: pendingUserId, token: totpCode });
      const payload = res.data?.data || res.data;
      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      document.cookie = `token=${payload.token}; path=/; SameSite=Lax; max-age=604800`;
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setError(errorMessage || "Invalid code");
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <main
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-[var(--color-paper)]"
      style={{
        backgroundImage: "url('/Newhero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[var(--color-accent)]/25 blur-3xl orb-float" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-[var(--color-cyan)]/25 blur-3xl orb-float-delayed" />

      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-amber-900/15 bg-white/78 shadow-[0_28px_70px_-35px_rgba(146,64,14,0.45)] backdrop-blur-xl lg:grid-cols-2">
        <section className="hidden border-r border-amber-900/10 bg-[linear-gradient(155deg,rgba(255,250,241,0.98),rgba(247,236,214,0.96))] p-10 lg:block">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">Carsgidi</p>
          <h1 className="mt-5 text-5xl leading-tight text-zinc-900 font-[family-name:var(--font-playfair)]">Operator Access</h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-zinc-600">
            Manage bookings, dispatch operations, and fleet performance from one secure operations console.
          </p>
          <div className="mt-8 rounded-2xl border border-amber-900/15 bg-white/85 p-4 text-sm text-zinc-600">
            Tip: use your staff account credentials provided by your administrator.
          </div>
        </section>

        {requires2fa ? (
          <form onSubmit={handleTotpSubmit} className="fade-up p-7 sm:p-9">
            <h2 className="text-3xl font-semibold text-zinc-900">Two-Factor Auth</h2>
            <p className="mt-2 text-sm text-zinc-600">Open your authenticator app and enter the 6-digit code.</p>

            {error && <p className="mt-4 rounded-xl border border-red-300/45 bg-red-500/15 px-3 py-2 text-sm text-red-700">{error}</p>}

            <label className="mt-6 block text-sm text-[var(--color-paper-soft)]">Authenticator Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="form-input-modern mt-2 w-full rounded-xl px-3 py-2.5 text-zinc-900 tracking-widest text-center text-xl"
              placeholder="000000"
              autoFocus
            />

            <button
              type="submit"
              disabled={totpLoading || totpCode.length !== 6}
              className="attention-bounce mt-7 w-full rounded-xl bg-[var(--color-accent)] py-2.5 font-semibold text-[var(--color-ink)] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {totpLoading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => { setRequires2fa(false); setPendingUserId(null); setTotpCode(""); setError(""); }}
              className="mt-3 w-full text-sm text-zinc-500 hover:text-zinc-700"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="fade-up p-7 sm:p-9">
            <h2 className="text-3xl font-semibold text-zinc-900">Sign In</h2>
            <p className="mt-2 text-sm text-zinc-600">Welcome back. Access your dashboard securely.</p>

            {error && <p className="mt-4 rounded-xl border border-red-300/45 bg-red-500/15 px-3 py-2 text-sm text-red-700">{error}</p>}

            <label className="mt-6 block text-sm text-[var(--color-paper-soft)]">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="form-input-modern mt-2 w-full rounded-xl px-3 py-2.5 text-zinc-900"
              placeholder="Email"
            />

            <label className="mt-5 block text-sm text-[var(--color-paper-soft)]">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="form-input-modern mt-2 w-full rounded-xl px-3 py-2.5 text-zinc-900"
              placeholder="Password"
            />

            <button type="submit" className="attention-bounce mt-7 w-full rounded-xl bg-[var(--color-accent)] py-2.5 font-semibold text-[var(--color-ink)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-14px_rgba(245,191,98,0.8)]">
              Login
            </button>
          </form>
        )}
      </div>
    </main>
  );
}