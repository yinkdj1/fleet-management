"use client";

import { useState, useEffect, useCallback } from "react";

// Get API base URL from environment variable or default to /api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

type PaymentFormProps = {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  customerEmail?: string;
  customerName?: string;
  bookingId?: number;
  disabled?: boolean;
  onPaymentReady?: (confirmPayment: () => Promise<void>) => void;
  checkoutSuccessUrl?: string;
  checkoutCancelUrl?: string;
  onBeforeCheckoutRedirect?: () => void;
};

export default function StripePaymentForm({
  amount,
  onError,
  customerEmail,
  bookingId,
  disabled = false,
  onPaymentReady,
  checkoutSuccessUrl,
  checkoutCancelUrl,
  onBeforeCheckoutRedirect,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStripeTestMode, setIsStripeTestMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStripeMode = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/payments/config`);
        const data = await response.json();
        const publishableKey = String(data?.data?.stripePublishableKey || "");
        if (isMounted) {
          setIsStripeTestMode(publishableKey.startsWith("pk_test_"));
        }
      } catch {
        if (isMounted) {
          setIsStripeTestMode(false);
        }
      }
    };

    loadStripeMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const startCheckout = useCallback(async (testScenario?: "success" | "decline") => {
    if (disabled) {
      const msg = "Complete all required fields to enable payment.";
      setError(msg);
      onError(msg);
      throw new Error(msg);
    }

    if (!amount || amount <= 0) {
      const msg = "Payment amount is not ready yet.";
      setError(msg);
      onError(msg);
      throw new Error(msg);
    }

    try {
      setLoading(true);
      setError(null);
      onBeforeCheckoutRedirect?.();

      const origin = window.location.origin;
      const defaultReturnUrl =
        bookingId && Number(bookingId) > 0
          ? `${origin}/reserve?identity=done&bookingId=${bookingId}`
          : `${origin}/reserve`;

      const successUrl = checkoutSuccessUrl || `${defaultReturnUrl}&stripeCheckout=success`;
      const cancelUrl = checkoutCancelUrl || `${defaultReturnUrl}&stripeCheckout=cancelled`;
      const withScenario = (url: string) => {
        if (!testScenario) return url;
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}stripeTestCase=${testScenario}`;
      };

      const resp = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bookingId,
          customerEmail,
          successUrl: withScenario(successUrl),
          cancelUrl: withScenario(cancelUrl),
        }),
      });

      const data = await resp.json();

      if (data && data.success && data.url) {
        window.location.href = data.url;
        return;
      }

      const msg = data && data.message ? data.message : "Failed to create checkout session";
      setError(msg);
      onError(msg);
      throw new Error(msg);
    } catch (err) {
      if (err instanceof Error && err.message) {
        if (err.message !== "Failed to create checkout session") {
          setError(err.message);
          onError(err.message);
        }
        throw err;
      }

      const msg = "Failed to initiate checkout session";
      setError(msg);
      onError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    bookingId,
    checkoutCancelUrl,
    checkoutSuccessUrl,
    customerEmail,
    disabled,
    onBeforeCheckoutRedirect,
    onError,
  ]);

  useEffect(() => {
    if (onPaymentReady) {
      onPaymentReady(startCheckout);
    }
  }, [onPaymentReady, startCheckout]);

  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
        <p className="text-sm text-slate-600">
          Complete all required fields to enable payment.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-900">Payment Error</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/12 p-4 space-y-3">
      <p className="text-sm font-semibold text-emerald-900">
        Secure Payment
      </p>
      <p className="text-xs text-emerald-800">
        You will be redirected to Stripe Checkout to securely complete payment.
      </p>

      {isStripeTestMode && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-900">Sandbox test options</p>
          <p className="text-xs text-blue-800">Choose a scenario, then use the matching test card in Stripe Checkout.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                startCheckout("success").catch(() => {
                  // Error state is already surfaced via onError and local error state.
                });
              }}
              disabled={loading || disabled}
              className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Simulate Success
            </button>
            <button
              type="button"
              onClick={() => {
                startCheckout("decline").catch(() => {
                  // Error state is already surfaced via onError and local error state.
                });
              }}
              disabled={loading || disabled}
              className="rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Simulate Decline
            </button>
          </div>
          <div className="text-[11px] text-blue-900 space-y-0.5">
            <p>Success card: 4242 4242 4242 4242</p>
            <p>Decline card: 4000 0000 0000 0002</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          startCheckout().catch(() => {
            // Error state is already surfaced via onError and local error state.
          });
        }}
        disabled={loading || disabled}
        className="w-full rounded-md bg-emerald-700 px-4 py-2 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Redirecting..." : "Continue to Stripe Checkout"}
      </button>

      {loading && <p className="text-sm text-blue-600">Redirecting to Stripe Checkout...</p>}
    </div>
  );
}
