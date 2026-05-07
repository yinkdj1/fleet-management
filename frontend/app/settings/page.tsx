"use client";

import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import api from "../../lib/api";

type TwoFaStatus = { enabled: boolean };

export default function SettingsPage() {
  const [status, setStatus] = useState<TwoFaStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Setup flow
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await api.get("/auth/me");
      const user = res.data?.data || res.data;
      setStatus({ enabled: !!user.twoFactorEnabled });
    } catch {
      setStatus({ enabled: false });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartSetup = async () => {
    setSetupError("");
    setSetupSuccess("");
    setSetupCode("");
    setSetupLoading(true);
    try {
      const res = await api.post("/auth/2fa/setup");
      setQrCode(res.data.data.qrCode);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setSetupError(msg || "Failed to generate QR code. Try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    setSetupLoading(true);
    try {
      await api.post("/auth/2fa/enable", { token: setupCode });
      setSetupSuccess("2FA enabled! You'll need your authenticator app each time you log in.");
      setQrCode(null);
      setSetupCode("");
      await fetchStatus();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setSetupError(msg || "Invalid code. Try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableError("");
    setDisableLoading(true);
    try {
      await api.post("/auth/2fa/disable", { token: disableCode });
      setShowDisable(false);
      setDisableCode("");
      await fetchStatus();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setDisableError(msg || "Invalid code. Try again.");
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900">Account Settings</h1>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-zinc-900">Two-Factor Authentication</h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Require an authenticator code every time you sign in.
              </p>
            </div>
            {!statusLoading && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  status?.enabled
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {status?.enabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>

          {setupSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              {setupSuccess}
            </p>
          )}

          {setupError && !qrCode && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {setupError}
            </p>
          )}

          {/* Not enabled — show setup */}
          {!status?.enabled && !qrCode && (
            <button
              onClick={handleStartSetup}
              disabled={setupLoading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white px-5 py-2 text-sm font-medium transition-colors"
            >
              {setupLoading ? "Generating..." : "Set Up 2FA"}
            </button>
          )}

          {/* QR code scan step */}
          {qrCode && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-700">
                Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>, then enter the 6-digit code to confirm.
              </p>
              <img src={qrCode} alt="2FA QR code" className="w-48 h-48 rounded-xl border border-zinc-200" />
              <form onSubmit={handleEnable} className="space-y-3">
                {setupError && (
                  <p className="text-sm text-red-600">{setupError}</p>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-40 rounded-xl border border-zinc-300 px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={setupLoading || setupCode.length !== 6}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white px-5 py-2 text-sm font-medium transition-colors"
                  >
                    {setupLoading ? "Activating..." : "Activate 2FA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setQrCode(null); setSetupCode(""); setSetupError(""); }}
                    className="text-sm text-zinc-500 hover:text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Enabled — show disable option */}
          {status?.enabled && !showDisable && (
            <button
              onClick={() => setShowDisable(true)}
              className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2 text-sm font-medium transition-colors"
            >
              Disable 2FA
            </button>
          )}

          {status?.enabled && showDisable && (
            <form onSubmit={handleDisable} className="space-y-3">
              <p className="text-sm text-zinc-700">Enter your current authenticator code to disable 2FA.</p>
              {disableError && <p className="text-sm text-red-600">{disableError}</p>}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="w-40 rounded-xl border border-zinc-300 px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={disableLoading || disableCode.length !== 6}
                  className="rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white px-5 py-2 text-sm font-medium transition-colors"
                >
                  {disableLoading ? "Disabling..." : "Confirm Disable"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisable(false); setDisableCode(""); setDisableError(""); }}
                  className="text-sm text-zinc-500 hover:text-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
