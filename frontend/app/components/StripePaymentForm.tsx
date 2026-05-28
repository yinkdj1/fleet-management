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
  onPaymentReady?: (confirmPayment: () => Promise<void>) => void;
};

type CheckoutFormProps = {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onPaymentReady?: (confirmPayment: () => Promise<void>) => void;
};

function CheckoutForm({ amount, onSuccess, onError, onPaymentReady }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const confirmPayment = async () => {
    if (!stripe || !elements) {
      const errorMsg = "Payment system not ready";
      onError(errorMsg);
      setMessage(errorMsg);
      setProcessing(false);
      throw new Error(errorMsg);
    }

    // Prevent double confirmation
    if (processing) {
      console.log('[StripePayment] Already processing, skipping duplicate confirmation');
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
        // Check if error is because payment already succeeded
        if (error.type === 'invalid_request_error' && 
            error.message?.includes('already succeeded')) {
          console.log('[StripePayment] Payment already succeeded, treating as success');
          // Extract payment intent ID from error if available
          const piMatch = error.message.match(/pi_[a-zA-Z0-9]+/);
          if (piMatch) {
            onSuccess(piMatch[0]);
            setMessage("Payment successful!");
            setProcessing(false);
            return;
          }
        }
        
        const errorMsg = error.message || "Payment failed";
        onError(errorMsg);
        setMessage(errorMsg);
        setProcessing(false);
        throw new Error(errorMsg);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
        setMessage("Payment successful!");
        setProcessing(false);
        // Success - don't throw, just return
        return;
      } else {
        const errorMsg = "Payment was not completed";
        onError(errorMsg);
        setMessage(errorMsg);
        setProcessing(false);
        throw new Error(errorMsg);
      }
    } catch (err) {
      // Only handle errors that haven't been handled above
      if (err instanceof Error && !err.message.includes("Payment")) {
        const errorMessage = "An unexpected error occurred";
        onError(errorMessage);
        setMessage(errorMessage);
      }
      setProcessing(false);
      throw err;
    }
  };

  // Expose confirmPayment function to parent
  useEffect(() => {
    if (stripe && elements && onPaymentReady) {
      onPaymentReady(confirmPayment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, elements]);

  return (
    <div className="space-y-4">
      <PaymentElement />
      
      {message && (
        <div className={`text-sm ${message.includes("successful") ? "text-emerald-700" : "text-red-600"}`}>
          {message}
        </div>
      )}

      {processing && (
        <div className="text-sm text-blue-600">
          Processing payment...
        </div>
      )}
    </div>
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
  onPaymentReady,
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
      
      <div className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            try {
              const resp = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, bookingId, customerEmail }),
              });

              const data = await resp.json();
              if (data && data.success && data.url) {
                window.location.href = data.url;
              } else {
                const msg = data && data.message ? data.message : 'Failed to create checkout session';
                onError(msg);
              }
            } catch (err) {
              onError('Failed to initiate Checkout session');
            }
          }}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 text-white"
        >
          Pay with Stripe Checkout
        </button>

        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} onPaymentReady={onPaymentReady} />
        </Elements>
      </div>
    </div>
  );
}
