"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
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
  dailyRate: number;
};

type FieldErrors = Partial<Record<
  | "customerId"
  | "vehicleId"
  | "pickupDatetime"
  | "returnDatetime"
  | "status",
  string
>>;

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

export default function NewBookingPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const pricingPreview = useMemo(() => {
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

    return {
      days,
      dailyRate,
      subtotal,
      tax,
      deposit,
      total,
    };
  }, [selectedVehicle, form.pickupDatetime, form.returnDatetime]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
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

      setAvailableVehicles(res.data);

      setForm((prev) => ({
        ...prev,
        vehicleId: res.data.some((v: Vehicle) => String(v.id) === prev.vehicleId)
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

      await api.post("/bookings", {
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        pickupDatetime: new Date(form.pickupDatetime).toISOString(),
        returnDatetime: new Date(form.returnDatetime).toISOString(),
      });

      router.push("/bookings");
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
                {vehicle.make} {vehicle.model} - {vehicle.plateNumber}
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

            <div className="flex justify-between text-sm">
              <span>Daily Rate</span>
              <span>${pricingPreview.dailyRate.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Rental Days</span>
              <span>{pricingPreview.days}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${pricingPreview.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Tax (7%)</span>
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
    </AppShell>
  );
}