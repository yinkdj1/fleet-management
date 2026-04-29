"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import { formatBookingId } from "../../../lib/bookingId";
import { formatCustomerName, formatVehicleLabel } from "../../../lib/displayHelpers";
import {
  calculateBookingPricePreview,
  DEFAULT_BOOKING_DISCOUNT_TIERS,
  PROTECTION_PLAN_FEE_PER_DAY,
  SERVICE_CHARGE_PER_DAY,
  TAX_PERCENTAGE,
  type BookingDiscountTier,
} from "../../../lib/bookingPricing";
import AppShell from "../../components/AppShell";

type Customer = {
  id: number;
  firstName: string;
  lastName: string;
};

type Vehicle = {
  id: number;
  make: string;
  model: string;
  plateNumber: string;
  status: string;
  category?: "compact" | "midsize" | "suv" | "luxury" | "unassigned" | string;
  usageType?: "personal" | "rideshare" | "both" | string;
  description?: string;
  dailyRate: number;
};

function formatUsageTypeLabel(usageType?: string) {
  const normalized = (usageType || "both").toLowerCase();
  if (normalized === "personal") return "Personal";
  if (normalized === "rideshare") return "Rideshare";
  return "Personal/Rideshare";
}

function formatVehicleCategoryLabel(category?: string) {
  const normalized = String(category || "compact").toLowerCase();
  if (normalized === "unassigned") return "Unassigned";
  if (normalized === "midsize") return "Midsize";
  if (normalized === "suv") return "SUV";
  if (normalized === "luxury") return "Luxury";
  return "Compact";
}

function getVehicleCategoryIcon(category?: string) {
  const normalized = String(category || "compact").toLowerCase();
  if (normalized === "unassigned") return "U";
  if (normalized === "midsize") return "M";
  if (normalized === "suv") return "S";
  if (normalized === "luxury") return "L";
  return "C";
}

type FieldErrors = Partial<Record<
  | "customerId"
  | "vehicleId"
  | "pickupDatetime"
  | "returnDatetime"
  | "status",
  string
>>;

export default function NewBookingPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<BookingDiscountTier[]>(
    DEFAULT_BOOKING_DISCOUNT_TIERS
  );
  const [globalDepositAmount, setGlobalDepositAmount] = useState(100);
  const [globalTaxPercentage, setGlobalTaxPercentage] = useState(TAX_PERCENTAGE);
  const [globalServicePlatformFeePerDay, setGlobalServicePlatformFeePerDay] =
    useState(SERVICE_CHARGE_PER_DAY);
  const [globalProtectionPlanFeePerDay, setGlobalProtectionPlanFeePerDay] =
    useState(PROTECTION_PLAN_FEE_PER_DAY);
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    pickupDatetime: "",
    returnDatetime: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchDiscountSettings = async () => {
      try {
        const res = await api.get("/dashboard/discount-settings");
        const tiers = res.data?.data?.tiers;
        const depositAmount = Number(res.data?.data?.depositAmount);
        const taxPercentage = Number(res.data?.data?.taxPercentage);
        const servicePlatformFeePerDay = Number(
          res.data?.data?.servicePlatformFeePerDay
        );
        const protectionPlanFeePerDay = Number(
          res.data?.data?.protectionPlanFeePerDay
        );
        if (Array.isArray(tiers) && tiers.length > 0) {
          setDiscountTiers(tiers);
        }
        if (Number.isFinite(depositAmount)) {
          setGlobalDepositAmount(Math.max(depositAmount, 0));
        }
        if (Number.isFinite(taxPercentage)) {
          setGlobalTaxPercentage(Math.min(Math.max(taxPercentage, 0), 100));
        }
        if (Number.isFinite(servicePlatformFeePerDay)) {
          setGlobalServicePlatformFeePerDay(
            Math.max(servicePlatformFeePerDay, 0)
          );
        }
        if (Number.isFinite(protectionPlanFeePerDay)) {
          setGlobalProtectionPlanFeePerDay(
            Math.max(protectionPlanFeePerDay, 0)
          );
        }
      } catch {
        setDiscountTiers(DEFAULT_BOOKING_DISCOUNT_TIERS);
        setGlobalDepositAmount(100);
        setGlobalTaxPercentage(TAX_PERCENTAGE);
        setGlobalServicePlatformFeePerDay(SERVICE_CHARGE_PER_DAY);
        setGlobalProtectionPlanFeePerDay(PROTECTION_PLAN_FEE_PER_DAY);
      }
    };

    fetchDiscountSettings();
  }, []);

  useEffect(() => {
    if (form.pickupDatetime && form.returnDatetime) {
      fetchAvailableVehicles();
    } else {
      setAvailableVehicles([]);
      setForm((prev) => ({ ...prev, vehicleId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pickupDatetime, form.returnDatetime]);

  const selectedVehicle = useMemo(() => {
    return availableVehicles.find((vehicle) => String(vehicle.id) === form.vehicleId);
  }, [availableVehicles, form.vehicleId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => String(customer.id) === form.customerId);
  }, [customers, form.customerId]);

  const pricingPreview = useMemo(() => {
    if (!selectedVehicle || !form.pickupDatetime || !form.returnDatetime) {
      return null;
    }

    return calculateBookingPricePreview({
      pickupDatetime: form.pickupDatetime,
      returnDatetime: form.returnDatetime,
      dailyRate: Number(selectedVehicle.dailyRate || 0),
      discountTiers,
      depositAmount: globalDepositAmount,
      taxPercentage: globalTaxPercentage,
      servicePlatformFeePerDay: globalServicePlatformFeePerDay,
      protectionPlanFeePerDay: globalProtectionPlanFeePerDay,
    });
  }, [discountTiers, globalDepositAmount, globalTaxPercentage, globalServicePlatformFeePerDay, globalProtectionPlanFeePerDay, selectedVehicle, form.pickupDatetime, form.returnDatetime]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers", { params: { limit: 500 } });
      const data: Customer[] = res.data?.data || [];
      // Sort alphabetically so the list is predictable regardless of creation order
      data.sort((a, b) => {
        const last = (a.lastName || "").localeCompare(b.lastName || "");
        if (last !== 0) return last;
        return (a.firstName || "").localeCompare(b.firstName || "");
      });
      setCustomers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customers");
    }
  };

  const fetchAvailableVehicles = async () => {
    setError("");
    setFieldErrors((prev) => ({
      ...prev,
      pickupDatetime: "",
      returnDatetime: "",
      vehicleId: "",
    }));

    if (!form.pickupDatetime || !form.returnDatetime) {
      return;
    }

    if (new Date(form.returnDatetime) <= new Date(form.pickupDatetime)) {
      setError("Return date/time must be after pickup date/time");
      setAvailableVehicles([]);
      setForm((prev) => ({ ...prev, vehicleId: "" }));
      return;
    }

    try {
      setLoadingAvailability(true);

      const res = await api.get("/vehicles/available", {
        params: {
          pickupDatetime: new Date(form.pickupDatetime).toISOString(),
          returnDatetime: new Date(form.returnDatetime).toISOString(),
        },
      });

      const payload = res.data?.data || res.data;
      setAvailableVehicles(payload);

      setForm((prev) => ({
        ...prev,
        vehicleId: payload.some((v: Vehicle) => String(v.id) === prev.vehicleId)
          ? prev.vehicleId
          : "",
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load available vehicles");
      setAvailableVehicles([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (error) {
      setError("");
    }
  };

  const validateClientSide = () => {
    const errors: FieldErrors = {};

    if (!form.customerId) {
      errors.customerId = "Customer is required";
    }

    if (!form.vehicleId) {
      errors.vehicleId = "Vehicle is required";
    }

    if (!form.pickupDatetime) {
      errors.pickupDatetime = "Pickup datetime is required";
    }

    if (!form.returnDatetime) {
      errors.returnDatetime = "Return datetime is required";
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

  const resetForm = () => {
    setForm({
      customerId: "",
      vehicleId: "",
      pickupDatetime: "",
      returnDatetime: "",
    });
    setAvailableVehicles([]);
    setFieldErrors({});
    setError("");
  };

  const handleViewBookings = () => {
    router.push("/bookings");
  };

  const handleCreateAnother = () => {
    setShowSuccessModal(false);
    setSuccessBooking(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const clientErrors = validateClientSide();

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError("Please fix the highlighted fields");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post("/bookings", {
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        pickupDatetime: new Date(form.pickupDatetime).toISOString(),
        returnDatetime: new Date(form.returnDatetime).toISOString(),
      });

      const createdBooking = res.data?.data || res.data;
      setSuccessBooking(createdBooking);
      setShowSuccessModal(true);
    } catch (err: any) {
      const apiMessage = err.response?.data?.message || "Failed to create booking";
      const apiErrors = err.response?.data?.errors || {};

      setError(apiMessage);
      setFieldErrors(apiErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Add Booking</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block mb-1 text-sm text-gray-600">Customer</label>
          <select
            name="customerId"
            value={form.customerId}
            onChange={handleChange}
            className="w-full p-3 border rounded"
            required
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.firstName} {customer.lastName}
              </option>
            ))}
          </select>
          {fieldErrors.customerId && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.customerId}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-600">
            Pickup Date/Time
          </label>
          <input
            name="pickupDatetime"
            type="datetime-local"
            value={form.pickupDatetime}
            onChange={handleChange}
            className="w-full p-3 border rounded"
            required
          />
          {fieldErrors.pickupDatetime && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.pickupDatetime}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-600">
            Return Date/Time
          </label>
          <input
            name="returnDatetime"
            type="datetime-local"
            value={form.returnDatetime}
            onChange={handleChange}
            className="w-full p-3 border rounded"
            required
          />
          {fieldErrors.returnDatetime && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.returnDatetime}</p>
          )}
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-600">Vehicle</label>
          <select
            name="vehicleId"
            value={form.vehicleId}
            onChange={handleChange}
            className="w-full p-3 border rounded"
            required
            disabled={
              !form.pickupDatetime || !form.returnDatetime || loadingAvailability
            }
          >
            <option value="">
              {loadingAvailability
                ? "Checking available vehicles..."
                : "Select Available Vehicle"}
            </option>
            {availableVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model} - {vehicle.plateNumber} ([{getVehicleCategoryIcon(vehicle.category)}] {formatVehicleCategoryLabel(vehicle.category)} / {formatUsageTypeLabel(vehicle.usageType)})
              </option>
            ))}
          </select>
          {fieldErrors.vehicleId && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.vehicleId}</p>
          )}
        </div>

        {form.pickupDatetime &&
          form.returnDatetime &&
          !loadingAvailability &&
          availableVehicles.length === 0 && (
            <p className="text-sm text-orange-600">
              No vehicles are available for the selected date/time range.
            </p>
          )}

        {selectedVehicle && pricingPreview && (
          <div className="p-4 border rounded bg-gray-50 space-y-2">
            <h2 className="font-semibold text-lg">Pricing Preview</h2>

            {selectedVehicle.description && (
              <p className="text-sm text-gray-700">{selectedVehicle.description}</p>
            )}

            <div className="flex justify-between text-sm">
              <span>Category</span>
              <span>[{getVehicleCategoryIcon(selectedVehicle.category)}] {formatVehicleCategoryLabel(selectedVehicle.category)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Daily Rate</span>
              <span>${pricingPreview.dailyRate.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Rental Days</span>
              <span>{pricingPreview.days}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Rental ({pricingPreview.days} days)</span>
              <span>${pricingPreview.rentalSubtotal.toFixed(2)}</span>
            </div>

            {pricingPreview.discountPercentage > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Long booking discount ({pricingPreview.discountPercentage}%)</span>
                <span>-${pricingPreview.rentalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span>Service/Platform Fee (${pricingPreview.servicePlatformFeePerDay.toFixed(2)}/day)</span>
              <span>${pricingPreview.serviceCharge.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Protection Plan (${pricingPreview.protectionPlanFeePerDay.toFixed(2)}/day)</span>
              <span>${pricingPreview.protectionPlanFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${pricingPreview.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Tax ({pricingPreview.taxPercentage.toFixed(2)}%)</span>
              <span>${pricingPreview.tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Deposit (refundable)</span>
              <span>${pricingPreview.deposit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
              <span>Total Amount</span>
              <span>${pricingPreview.total.toFixed(2)}</span>
            </div>

            <p className="text-xs text-gray-500 pt-1">
  Deposit is refundable and is included in the total amount. Final stored totals are calculated by the backend.
</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || loadingAvailability}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Booking"}
        </button>
      </form>

      {showSuccessModal && successBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-zinc-200">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 opacity-90" />
            <div className="relative text-center text-white">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-lg ring-1 ring-white">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12 text-white"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">Reservation Confirmed</h2>
              <p className="mt-2 text-white/80">Your booking has been created successfully.</p>
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white p-6 text-zinc-900 shadow-lg shadow-emerald-500/10">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Booking</p>
                  <p className="mt-2 text-lg font-semibold">{formatBookingId(successBooking.id)}</p>
                </div>
                <div className="rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Status</p>
                  <p className="mt-2 text-lg font-semibold">{successBooking.status ?? "Reserved"}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Customer</p>
                  <p className="mt-2 font-medium">
                    {selectedCustomer
                      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                      : formatCustomerName(successBooking.customer) || "Guest"}
                  </p>
                </div>
                <div className="rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Vehicle</p>
                  <p className="mt-2 font-medium">
                    {selectedVehicle
                      ? `${selectedVehicle.make} ${selectedVehicle.model}`
                      : formatVehicleLabel(successBooking.vehicle) || "Assigned Vehicle"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Pickup</p>
                  <p className="mt-2 font-medium">
                    {successBooking.pickupDatetime
                      ? new Date(successBooking.pickupDatetime).toLocaleString()
                      : form.pickupDatetime}
                  </p>
                </div>
                <div className="rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Return</p>
                  <p className="mt-2 font-medium">
                    {successBooking.returnDatetime
                      ? new Date(successBooking.returnDatetime).toLocaleString()
                      : form.returnDatetime}
                  </p>
                </div>
              </div>

              {successBooking.total && (
                <div className="mt-4 rounded-3xl bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Total</p>
                  <p className="mt-2 text-lg font-semibold">${successBooking.total}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleViewBookings}
                className="inline-flex justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900"
              >
                View Bookings
              </button>
              <button
                type="button"
                onClick={() => router.push(`/bookings/${successBooking.id}?edit=true`)}
                className="inline-flex justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                Modify Booking
              </button>
              <button
                type="button"
                onClick={handleCreateAnother}
                className="inline-flex justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                Book Another
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="absolute left-10 top-10 h-3 w-3 rounded-full bg-white/80 animate-ping" />
              <span className="absolute right-12 top-24 h-4 w-4 rounded-full bg-white/80 animate-ping" />
              <span className="absolute left-24 bottom-16 h-2 w-2 rounded-full bg-white/60 animate-ping" />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}