"use client";

import { useState, useEffect } from "react";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

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
};

type CheckoutFormProps = {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
};

function CheckoutForm({ amount, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/reserve`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
        setMessage(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
        setMessage("Payment successful!");
      } else {
        onError("Payment was not completed");
        setMessage("Payment was not completed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      onError(errorMessage);
      setMessage(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {message && (
        <div className={`text-sm ${message.includes("successful") ? "text-emerald-700" : "text-red-600"}`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="attention-bounce w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function StripePaymentForm({
  amount,
  onSuccess,
  onError,
  customerEmail,
  customerName,
  bookingId,
  disabled = false,
}: PaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch payment config and initialize Stripe
    const initializeStripe = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/payments/config`);
        const data = await response.json();

        if (!data.success || !data.data.stripeConfigured) {
          setError("Stripe is not configured. Please contact support.");
          setLoading(false);
          return;
        }

        const publishableKey = data.data.stripePublishableKey;
        if (!publishableKey) {
          setError("Stripe publishable key not found.");
          setLoading(false);
          return;
        }

        setStripePromise(loadStripe(publishableKey));
      } catch (err) {
        setError("Failed to initialize payment system.");
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  useEffect(() => {
    // Create payment intent when amount changes
    if (!stripePromise || amount <= 0) return;

    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            bookingId,
            customerEmail,
            customerName,
          }),
        });

        const data = await response.json();

        if (!data.success || !data.data.clientSecret) {
          setError(data.message || "Failed to initialize payment");
          setLoading(false);
          return;
        }

        setClientSecret(data.data.clientSecret);
        setError(null);
      } catch (err) {
        setError("Failed to create payment intent");
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, bookingId, customerEmail, customerName, stripePromise]);

  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
        <p className="text-sm text-slate-600">
          Complete all required fields to enable payment.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/12 p-4">
        <p className="text-sm text-emerald-900">Loading payment form...</p>
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

  if (!stripePromise || !clientSecret) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">Payment system not ready. Please try again.</p>
      </div>
    );
  }

  const appearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#10b981",
      colorBackground: "#ffffff",
      colorText: "#18181b",
      colorDanger: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      spacingUnit: "4px",
      borderRadius: "12px",
    },
  };

  return (
    <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/12 p-4 space-y-3">
      <p className="text-sm font-semibold text-emerald-900">
        Secure Payment
      </p>
      <p className="text-xs text-emerald-800">
        Your payment information is encrypted and secure.
      </p>
      
      <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
        <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
}
