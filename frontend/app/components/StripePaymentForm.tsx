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

  const startCheckout = useCallback(async () => {
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

      const resp = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bookingId,
          customerEmail,
          successUrl: checkoutSuccessUrl || `${defaultReturnUrl}&stripeCheckout=success`,
          cancelUrl: checkoutCancelUrl || `${defaultReturnUrl}&stripeCheckout=cancelled`,
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

      {loading && <p className="text-sm text-blue-600">Redirecting to Stripe Checkout...</p>}
    </div>
  );
}
