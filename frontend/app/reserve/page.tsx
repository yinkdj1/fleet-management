"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
};

type ReservationForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicenseNo: string;
  dateOfBirth: string;
  pickupDatetime: string;
  returnDatetime: string;
  vehicleId: string;
  paymentReference: string;
  paymentConfirmed: boolean;
};

type PaymentForm = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type FieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "contact"
    | "driversLicenseNo"
    | "dateOfBirth"
    | "pickupDatetime"
    | "returnDatetime"
    | "vehicleId"
    | "paymentReference"
    | "paymentStatus"
    | "paymentConfirmed",
    string
  >
>;

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateRentalDays(pickupDatetime: string, returnDatetime: string) {
  const pickup = new Date(pickupDatetime);
  const dropoff = new Date(returnDatetime);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) {
    return 0;
  }

  const diffMs = dropoff.getTime() - pickup.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1);
}

export default function ReservePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const [form, setForm] = useState<ReservationForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    driversLicenseNo: "",
    dateOfBirth: "",
    pickupDatetime: "",
    returnDatetime: "",
    vehicleId: "",
    paymentReference: "",
    paymentConfirmed: false,
  });

  useEffect(() => {
    if (!form.pickupDatetime || !form.returnDatetime) {
      setVehicles([]);
      setForm((prev) => ({ ...prev, vehicleId: "" }));
      return;
    }

    const fetchVehicles = async () => {
      setError("");
      if (new Date(form.returnDatetime) <= new Date(form.pickupDatetime)) {
        setError("Return date/time must be after pickup date/time");
        setVehicles([]);
        setForm((prev) => ({ ...prev, vehicleId: "" }));
        return;
      }

      try {
        setLoadingVehicles(true);
        const res = await api.get("/public/vehicles/available", {
          params: {
            pickupDatetime: new Date(form.pickupDatetime).toISOString(),
            returnDatetime: new Date(form.returnDatetime).toISOString(),
          },
        });

        const payload = res.data?.data || [];
        setVehicles(payload);

        setForm((prev) => ({
          ...prev,
          vehicleId: payload.some((v: Vehicle) => String(v.id) === prev.vehicleId)
            ? prev.vehicleId
            : "",
        }));
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch available vehicles");
        setVehicles([]);
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, [form.pickupDatetime, form.returnDatetime]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === form.vehicleId),
    [vehicles, form.vehicleId]
  );

  const pricePreview = useMemo(() => {
    if (!selectedVehicle || !form.pickupDatetime || !form.returnDatetime) {
      return null;
    }

    const days = calculateRentalDays(form.pickupDatetime, form.returnDatetime);
    if (days <= 0) {
      return null;
    }

    const dailyRate = Number(selectedVehicle.dailyRate || 0);
    const subtotal = roundToTwo(dailyRate * days);
    const tax = roundToTwo(subtotal * 0.07);
    const deposit = 100;
    const total = roundToTwo(subtotal + tax + deposit);

    return { days, dailyRate, subtotal, tax, deposit, total };
  }, [selectedVehicle, form.pickupDatetime, form.returnDatetime]);

  const resetPaymentState = () => {
    setForm((prev) => ({
      ...prev,
      paymentReference: "",
      paymentConfirmed: false,
    }));
    setPaymentMessage("");
    setFieldErrors((prev) => ({
      ...prev,
      paymentReference: "",
      paymentConfirmed: "",
      paymentStatus: "",
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    const value =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setForm((prev) => ({
      ...prev,
      [name]: value as never,
    }));

    if (["pickupDatetime", "returnDatetime", "vehicleId"].includes(name)) {
      resetPaymentState();
    }

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
      contact: name === "email" || name === "phone" ? "" : prev.contact,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors.paymentReference || fieldErrors.paymentConfirmed || fieldErrors.paymentStatus) {
      setFieldErrors((prev) => ({
        ...prev,
        paymentReference: "",
        paymentConfirmed: "",
        paymentStatus: "",
      }));
    }

    if (paymentMessage) {
      setPaymentMessage("");
    }
  };

  const handleTestPayment = async () => {
    setError("");
    setPaymentMessage("");
    setFieldErrors((prev) => ({
      ...prev,
      paymentReference: "",
      paymentConfirmed: "",
      paymentStatus: "",
    }));

    if (!pricePreview) {
      setError("Select valid reservation dates and a vehicle before payment.");
      return;
    }

    try {
      setPaying(true);

      const res = await api.post("/public/payments/test-charge", {
        cardholderName: paymentForm.cardholderName.trim(),
        cardNumber: paymentForm.cardNumber,
        expiry: paymentForm.expiry.trim(),
        cvv: paymentForm.cvv,
        amount: pricePreview.total,
        currency: "USD",
      });

      const payload = res.data?.data || {};

      setForm((prev) => ({
        ...prev,
        paymentReference: payload.paymentReference || "",
        paymentConfirmed: payload.status === "paid",
      }));

      setPaymentMessage(
        payload.status === "paid"
          ? `Payment successful (${payload.cardBrand?.toUpperCase()} ****${payload.last4}). Ref: ${payload.paymentReference}`
          : "Payment not completed."
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Payment failed");
      setFieldErrors((prev) => ({
        ...prev,
        ...(err.response?.data?.errors || {}),
      }));
      setForm((prev) => ({
        ...prev,
        paymentReference: "",
        paymentConfirmed: false,
      }));
    } finally {
      setPaying(false);
    }
  };

  const validateClientSide = () => {
    const errors: FieldErrors = {};

    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    if (!form.email.trim() && !form.phone.trim()) {
      errors.contact = "Provide at least email or phone";
    }
    if (!form.driversLicenseNo.trim()) {
      errors.driversLicenseNo = "Driver's license number is required";
    }
    if (!form.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    }

    if (!form.pickupDatetime) errors.pickupDatetime = "Pickup date/time is required";
    if (!form.returnDatetime) errors.returnDatetime = "Return date/time is required";
    if (!form.vehicleId) errors.vehicleId = "Please choose a vehicle";
    if (!form.paymentReference.trim()) {
      errors.paymentReference = "Payment reference is required";
    }
    if (!form.paymentConfirmed) {
      errors.paymentConfirmed = "Confirm payment before submitting";
    }

    if (
      form.pickupDatetime &&
      form.returnDatetime &&
      new Date(form.returnDatetime) <= new Date(form.pickupDatetime)
    ) {
      errors.returnDatetime = "Return date/time must be after pickup date/time";
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const clientErrors = validateClientSide();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError("Please fix the highlighted fields.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post("/public/reservations", {
        customer: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          driversLicenseNo: form.driversLicenseNo.trim(),
          dateOfBirth: form.dateOfBirth,
        },
        vehicleId: Number(form.vehicleId),
        pickupDatetime: new Date(form.pickupDatetime).toISOString(),
        returnDatetime: new Date(form.returnDatetime).toISOString(),
        paymentStatus: "paid",
        paymentReference: form.paymentReference.trim(),
        paymentConfirmed: form.paymentConfirmed,
      });

      const bookingId = res.data?.data?.id;
      setSuccess(
        bookingId
          ? `Reservation submitted. Your booking ID is #${bookingId}.`
          : "Reservation submitted successfully."
      );

      setForm({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        driversLicenseNo: form.driversLicenseNo,
        dateOfBirth: form.dateOfBirth,
        pickupDatetime: "",
        returnDatetime: "",
        vehicleId: "",
        paymentReference: "",
        paymentConfirmed: false,
      });
      setVehicles([]);
    } catch (err: any) {
      const responseErrors = err.response?.data?.errors || {};
      setError(err.response?.data?.message || "Failed to submit reservation");
      setFieldErrors(responseErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#fff7ed_0,#fff7ed_20%,#ffedd5_45%,#fed7aa_65%,#fdba74_100%)] py-12 px-4">
      <div className="mx-auto w-full max-w-5xl grid lg:grid-cols-2 gap-8">
        <section className="rounded-3xl border border-black/10 bg-white/80 backdrop-blur p-8 shadow-[0_18px_60px_-20px_rgba(120,53,15,0.5)]">
          <p className="text-xs tracking-[0.24em] uppercase text-amber-800 font-semibold">Public Reservation</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-zinc-900">Reserve Your Vehicle Online</h1>
          <p className="mt-4 text-zinc-700 leading-relaxed">
            No login required. Enter your details, choose available dates, and confirm your booking.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">First Name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  required
                />
                {fieldErrors.firstName && <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Last Name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  required
                />
                {fieldErrors.lastName && <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  placeholder="you@example.com"
                />
                {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  placeholder="+234..."
                />
                {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
              </div>
            </div>

            {(fieldErrors.contact || (!form.email.trim() && !form.phone.trim())) && (
              <p className="text-sm text-red-600">{fieldErrors.contact || "Provide at least email or phone."}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Driver's License</label>
                <input
                  name="driversLicenseNo"
                  value={form.driversLicenseNo}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  required
                />
                {fieldErrors.driversLicenseNo && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.driversLicenseNo}</p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  required
                />
                {fieldErrors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.dateOfBirth}</p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Pickup</label>
                <input
                  type="datetime-local"
                  name="pickupDatetime"
                  value={form.pickupDatetime}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  required
                />
                {fieldErrors.pickupDatetime && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupDatetime}</p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Return</label>
                <input
                  type="datetime-local"
                  name="returnDatetime"
                  value={form.returnDatetime}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  required
                />
                {fieldErrors.returnDatetime && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.returnDatetime}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-zinc-700">Available Vehicle</label>
              <select
                name="vehicleId"
                value={form.vehicleId}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                disabled={loadingVehicles || !form.pickupDatetime || !form.returnDatetime}
                required
              >
                <option value="">{loadingVehicles ? "Checking availability..." : "Select a vehicle"}</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} | {vehicle.plateNumber}
                  </option>
                ))}
              </select>
              {fieldErrors.vehicleId && <p className="mt-1 text-sm text-red-600">{fieldErrors.vehicleId}</p>}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
              <p className="text-sm font-semibold text-emerald-900">Credit Card Payment (Test Mode)</p>
              <p className="text-xs text-emerald-800">
                This is a development placeholder. It simulates online card payment and will be replaced with Stripe in production.
              </p>
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Cardholder Name</label>
                <input
                  name="cardholderName"
                  value={paymentForm.cardholderName}
                  onChange={handlePaymentInputChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-zinc-700">Card Number</label>
                <input
                  name="cardNumber"
                  value={paymentForm.cardNumber}
                  onChange={handlePaymentInputChange}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                  placeholder="4242 4242 4242 4242"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Expiry (MM/YY)</label>
                  <input
                    name="expiry"
                    value={paymentForm.expiry}
                    onChange={handlePaymentInputChange}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    placeholder="12/30"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">CVV</label>
                  <input
                    name="cvv"
                    value={paymentForm.cvv}
                    onChange={handlePaymentInputChange}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    placeholder="123"
                  />
                </div>
              </div>

              {fieldErrors.paymentStatus && (
                <p className="text-sm text-red-600">{fieldErrors.paymentStatus}</p>
              )}
              {fieldErrors.paymentReference && (
                <p className="text-sm text-red-600">{fieldErrors.paymentReference}</p>
              )}
              {fieldErrors.paymentConfirmed && (
                <p className="text-sm text-red-600">{fieldErrors.paymentConfirmed}</p>
              )}

              {paymentMessage && <p className="text-sm text-emerald-900">{paymentMessage}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestPayment}
                  disabled={paying || !pricePreview}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {paying ? "Processing Test Payment..." : "Pay Now (Test)"}
                </button>
                {form.paymentConfirmed && (
                  <span className="text-sm font-semibold text-emerald-900">Payment Confirmed</span>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <button
              type="submit"
              disabled={submitting || loadingVehicles || !form.paymentConfirmed}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting Reservation..." : "Confirm Reservation"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-black/10 bg-zinc-950 text-zinc-100 p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
          <h2 className="text-2xl font-bold">Reservation Preview</h2>
          <p className="mt-2 text-sm text-zinc-300">Live estimate based on your selected vehicle and dates.</p>

          {selectedVehicle && pricePreview ? (
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4">
                <p className="text-sm text-zinc-400">Vehicle</p>
                <p className="text-lg font-semibold mt-1">
                  {selectedVehicle.make} {selectedVehicle.model}
                </p>
                <p className="text-sm text-zinc-400">Plate: {selectedVehicle.plateNumber}</p>
              </div>

              <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Daily Rate</span>
                  <span>${pricePreview.dailyRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rental Days</span>
                  <span>{pricePreview.days}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${pricePreview.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (7%)</span>
                  <span>${pricePreview.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deposit</span>
                  <span>${pricePreview.deposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>${pricePreview.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 p-6 text-sm text-zinc-400">
              Enter your details and choose dates to see available vehicles and pricing.
            </div>
          )}

          <p className="mt-6 text-xs text-zinc-500">
            Price preview is informational. Final totals are validated and calculated by the backend on submission.
          </p>
        </section>
      </div>
    </main>
  );
}
