"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
  fuelType?: string | null;
  transmission?: string | null;
  passengers?: number | null;
  seats?: number | null;
  passengerCapacity?: number | null;
  numberOfPassengers?: number | null;
  imageUrl?: string | null;
};

type ExistingCustomer = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  driversLicenseNo?: string | null;
  dateOfBirth?: string | null;
};

type ReservationForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
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

type TermsChecks = {
  accuracy: boolean;
  agreement: boolean;
  authorization: boolean;
  esign: boolean;
};

type FieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "addressLine"
    | "city"
    | "state"
    | "zip"
    | "driversLicenseNo"
    | "dateOfBirth"
    | "pickupDatetime"
    | "returnDatetime"
    | "vehicleId"
    | "cardholderName"
    | "expiry"
    | "cvv"
    | "termsAccepted"
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

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDatetimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getMinimumAllowedDateOfBirth(today = new Date()) {
  const minimumDate = new Date(today);
  minimumDate.setFullYear(minimumDate.getFullYear() - 18);
  return minimumDate;
}

function isAtLeast18(dateOfBirth: string) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  return dob <= getMinimumAllowedDateOfBirth();
}

function getDefaultReturnDatetime(pickupDatetime: string) {
  const pickup = new Date(pickupDatetime);
  if (Number.isNaN(pickup.getTime())) {
    return "";
  }

  const nextDay = new Date(pickup);
  nextDay.setDate(nextDay.getDate() + 1);
  return formatDatetimeLocal(nextDay);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith("1"));
}

function normalizeUsPhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  return phone.trim();
}

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isCardExpired(expiry: string, now = new Date()) {
  const match = expiry.trim().match(/^(\d{2})\/(\d{2})$/);

  if (!match) {
    return true;
  }

  const month = Number(match[1]);
  const year = Number(match[2]);

  if (month < 1 || month > 12) {
    return true;
  }

  const fullYear = 2000 + year;
  const expiryEnd = new Date(fullYear, month, 0, 23, 59, 59, 999);
  return now > expiryEnd;
}

function isValidCvv(cvv: string) {
  return /^\d{3,4}$/.test(cvv.trim());
}

const SERVICE_CHARGE_PER_DAY = 15;

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

function normalizeStateCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (US_STATES.some((state) => state.code === upper)) {
    return upper;
  }

  const match = US_STATES.find(
    (state) => state.name.toLowerCase() === trimmed.toLowerCase()
  );

  return match?.code || "";
}

function normalizeZipToFive(zip: string) {
  const digits = zip.replace(/\D/g, "");
  return digits.slice(0, 5);
}

function isValidUsZip(zip: string) {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

async function doesZipMatchState(zip: string, stateCode: string) {
  const zip5 = normalizeZipToFive(zip);
  if (!zip5 || !stateCode) {
    return false;
  }

  const response = await fetch(`https://api.zippopotam.us/us/${zip5}`);
  if (!response.ok) {
    throw new Error("Zip lookup failed");
  }

  const payload: { places?: Array<{ "state abbreviation"?: string }> } =
    await response.json();

  const abbreviation = payload.places?.[0]?.["state abbreviation"] || "";
  return abbreviation.toUpperCase() === stateCode.toUpperCase();
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
  const [lookupInFlight, setLookupInFlight] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [termsChecks, setTermsChecks] = useState<TermsChecks>({
    accuracy: false,
    agreement: false,
    authorization: false,
    esign: false,
  });

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
    addressLine: "",
    city: "",
    state: "",
    zip: "",
    driversLicenseNo: "",
    dateOfBirth: "",
    pickupDatetime: "",
    returnDatetime: "",
    vehicleId: "",
    paymentReference: "",
    paymentConfirmed: false,
  });

  const maxDateOfBirth = useMemo(
    () => formatDateForInput(getMinimumAllowedDateOfBirth()),
    []
  );

  useEffect(() => {
    if (!form.pickupDatetime || !form.returnDatetime) {
      setVehicles([]);
      setForm((prev) => ({ ...prev, vehicleId: "" }));
      setShowVehicleList(false);
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
        setShowVehicleList(false);
        const res = await api.get("/public/vehicles/available", {
          params: {
            pickupDatetime: new Date(form.pickupDatetime).toISOString(),
            returnDatetime: new Date(form.returnDatetime).toISOString(),
          },
        });

        const payload = res.data?.data || [];
        setVehicles(payload);
        setShowVehicleList(true);

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
    const rentalSubtotal = roundToTwo(dailyRate * days);
    const serviceCharge = roundToTwo(SERVICE_CHARGE_PER_DAY * days);
    const subtotal = roundToTwo(rentalSubtotal + serviceCharge);
    const tax = roundToTwo(subtotal * 0.07);
    const deposit = 100;
    const total = roundToTwo(subtotal + tax + deposit);

    return {
      days,
      dailyRate,
      rentalSubtotal,
      serviceCharge,
      subtotal,
      tax,
      deposit,
      total,
    };
  }, [selectedVehicle, form.pickupDatetime, form.returnDatetime]);

  const allTermsAccepted = useMemo(
    () => Object.values(termsChecks).every(Boolean),
    [termsChecks]
  );

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
      termsAccepted: "",
    }));
    setTermsChecks({
      accuracy: false,
      agreement: false,
      authorization: false,
      esign: false,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    const value =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setForm((prev) => {
      const nextForm = {
        ...prev,
        [name]: value as never,
      };

      if (name === "pickupDatetime" && typeof value === "string") {
        if (!value) {
          nextForm.returnDatetime = "";
        } else if (
          !prev.returnDatetime ||
          new Date(prev.returnDatetime) <= new Date(value)
        ) {
          nextForm.returnDatetime = getDefaultReturnDatetime(value);
        }
      }

      return nextForm;
    });

    if (["pickupDatetime", "returnDatetime", "vehicleId"].includes(name)) {
      resetPaymentState();
    }

    if (["firstName", "lastName"].includes(name)) {
      resetPaymentState();
    }

    if (name === "pickupDatetime" || name === "returnDatetime") {
      setShowVehicleList(false);
    }

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
      returnDatetime:
        name === "pickupDatetime" ? "" : prev.returnDatetime,
    }));

    if (name === "email" || name === "phone") {
      setLookupMessage("");
    }

    if (error) setError("");
    if (success) setSuccess("");
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setForm((prev) => ({
      ...prev,
      paymentReference: "",
      paymentConfirmed: false,
    }));

    if (
      fieldErrors.paymentReference ||
      fieldErrors.paymentConfirmed ||
      fieldErrors.paymentStatus ||
      fieldErrors.cardholderName ||
      fieldErrors.expiry ||
      fieldErrors.cvv
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
        cardholderName: "",
        expiry: "",
        cvv: "",
        paymentReference: "",
        paymentConfirmed: "",
        paymentStatus: "",
      }));
    }

    if (paymentMessage) {
      setPaymentMessage("");
    }
  };

  const handleContactBlur = async (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    if (name !== "email" && name !== "phone") {
      return;
    }

    const email = name === "email" ? value.trim() : form.email.trim();
    const phone = name === "phone" ? value.trim() : form.phone.trim();
    const normalizedPhone = phone ? normalizeUsPhone(phone) : "";

    if (!email && !normalizedPhone) {
      return;
    }

    if (name === "phone" && normalizedPhone) {
      setForm((prev) => ({
        ...prev,
        phone: normalizedPhone,
      }));
    }

    try {
      setLookupInFlight(true);
      setLookupMessage("");

      const res = await api.get("/public/customers/lookup", {
        params: {
          email: email || undefined,
          phone: normalizedPhone || undefined,
        },
      });

      const existing: ExistingCustomer | null = res.data?.data || null;

      if (!existing) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        firstName: existing.firstName || prev.firstName,
        lastName: existing.lastName || prev.lastName,
        email: existing.email || prev.email,
        phone: existing.phone || prev.phone,
        addressLine: existing.addressLine || prev.addressLine,
        city: existing.city || prev.city,
        state: normalizeStateCode(existing.state || prev.state),
        zip: existing.zip || prev.zip,
        driversLicenseNo: existing.driversLicenseNo || prev.driversLicenseNo,
        dateOfBirth: existing.dateOfBirth
          ? String(existing.dateOfBirth).slice(0, 10)
          : prev.dateOfBirth,
      }));

      setFieldErrors((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
      }));

      setLookupMessage("Existing customer details loaded.");
    } catch {
      setLookupMessage("");
    } finally {
      setLookupInFlight(false);
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
      const payload = {
        status: "paid",
        cardBrand: "demo",
        last4: "0000",
        paymentReference: `DUMMY-${Date.now()}`,
      };

      setForm((prev) => ({
        ...prev,
        paymentReference: payload.paymentReference || "",
        paymentConfirmed: payload.status === "paid",
      }));

      setPaymentMessage(
        payload.status === "paid"
          ? `Demo payment confirmed (${payload.cardBrand?.toUpperCase()} ****${payload.last4}). Ref: ${payload.paymentReference}`
          : "Payment not completed."
      );
    } catch {
      setError("Demo payment failed");
      setForm((prev) => ({
        ...prev,
        paymentReference: "",
        paymentConfirmed: false,
      }));
    } finally {
      setPaying(false);
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setForm((prev) => ({
      ...prev,
      vehicleId,
    }));
    resetPaymentState();
    setFieldErrors((prev) => ({
      ...prev,
      vehicleId: "",
    }));
    setShowVehicleList(false);
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateClientSide = () => {
    const errors: FieldErrors = {};

    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(form.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!form.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!isValidPhone(form.phone)) {
      errors.phone = "Enter a valid U.S. phone number";
    }
    if (!form.driversLicenseNo.trim()) {
      errors.driversLicenseNo = "Driver's license number is required";
    }
    if (!form.addressLine.trim()) {
      errors.addressLine = "Address is required";
    }
    if (!form.city.trim()) {
      errors.city = "City is required";
    }
    if (!form.state.trim()) {
      errors.state = "State is required";
    } else if (!US_STATES.some((state) => state.code === form.state)) {
      errors.state = "Select a valid U.S. state";
    }
    if (!form.zip.trim()) {
      errors.zip = "Zip is required";
    } else if (!isValidUsZip(form.zip)) {
      errors.zip = "Enter a valid U.S. ZIP code";
    }
    if (!form.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else if (!isAtLeast18(form.dateOfBirth)) {
      errors.dateOfBirth = "Customer must be at least 18 years old";
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
    if (!allTermsAccepted) {
      errors.termsAccepted = "You must accept all rental terms before confirming reservation";
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
      const stateCode = normalizeStateCode(form.state);
      const zipMatchesState = await doesZipMatchState(form.zip, stateCode);

      if (!zipMatchesState) {
        setFieldErrors((prev) => ({
          ...prev,
          zip: "ZIP code does not match selected state",
        }));
        setError("Please fix the highlighted fields.");
        return;
      }
    } catch {
      setFieldErrors((prev) => ({
        ...prev,
        zip: "Unable to validate ZIP code right now",
      }));
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
          phone: normalizeUsPhone(form.phone) || null,
          addressLine: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip: form.zip.trim(),
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
      const confirmationEmailMessage = res.data?.data?.confirmationEmail?.message;
      setSuccess(
        bookingId
          ? `Reservation submitted. Your booking ID is #${bookingId}.${
              confirmationEmailMessage ? ` ${confirmationEmailMessage}` : ""
            }`
          : "Reservation submitted successfully."
      );

      setForm({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        addressLine: form.addressLine,
        city: form.city,
        state: form.state,
        zip: form.zip,
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
    <main className="min-h-screen bg-cover bg-center bg-no-repeat pt-3 pb-8 px-3 sm:px-4" style={{ backgroundImage: "url('/reserve-background.png')" }}>
      <div className="mx-auto w-full max-w-7xl grid gap-6 lg:gap-8 lg:grid-cols-3">
        <section className="rounded-3xl border border-black/10 bg-white/80 backdrop-blur p-6 md:p-8 shadow-[0_18px_60px_-20px_rgba(120,53,15,0.5)] lg:col-span-2">
          <p className="text-xs tracking-[0.24em] uppercase text-amber-800 font-semibold">Carsgidi Reservation</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight text-zinc-900">Reserve Your Perfect Ride Online</h1>
          <p className="mt-4 text-zinc-700 leading-relaxed">
            No login required. Tell us who is driving, choose your dates, complete payment, and lock in your Carsgidi rental in minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            <div className="md:col-span-2">
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

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-zinc-700">Return</label>
              <input
                type="datetime-local"
                name="returnDatetime"
                value={form.returnDatetime}
                onChange={handleChange}
                min={form.pickupDatetime || undefined}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                required
              />
              {fieldErrors.returnDatetime && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.returnDatetime}</p>
              )}
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="block mb-1 text-sm font-medium text-zinc-700">Available Vehicle</label>
              <button
                type="button"
                onClick={() => setShowVehicleList((prev) => !prev)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-left disabled:opacity-60"
              >
                {!form.pickupDatetime || !form.returnDatetime
                  ? "Set pickup and return date/time first"
                  : loadingVehicles
                    ? "Checking availability..."
                    : selectedVehicle
                      ? `${selectedVehicle.make} ${selectedVehicle.model} | ${selectedVehicle.plateNumber}`
                      : "Select available vehicle"}
              </button>

              {showVehicleList && (
                <div className="mt-2 rounded-xl border border-zinc-200 bg-white">
                  {!form.pickupDatetime || !form.returnDatetime ? (
                    <p className="px-4 py-3 text-sm text-zinc-600">
                      Select pickup and return date/time to load available cars.
                    </p>
                  ) : loadingVehicles ? (
                    <p className="px-4 py-3 text-sm text-zinc-600">Loading available cars...</p>
                  ) : vehicles.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-zinc-600">
                      No available cars found for the selected dates.
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {vehicles.map((vehicle) => {
                        const isSelected = String(vehicle.id) === form.vehicleId;
                        const passengerCount =
                          vehicle.passengers ??
                          vehicle.seats ??
                          vehicle.passengerCapacity ??
                          vehicle.numberOfPassengers;

                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() => handleSelectVehicle(String(vehicle.id))}
                            className={`w-full border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-50 ${
                              isSelected ? "bg-amber-50" : ""
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={vehicle.imageUrl || "/placeholder-vehicle.svg"}
                                  alt={`${vehicle.make} ${vehicle.model}`}
                                  className="h-14 w-20 rounded-md border border-zinc-200 object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold text-zinc-900 truncate">
                                    {vehicle.make} {vehicle.model}
                                  </p>
                                  <p className="text-sm text-zinc-600 truncate">Plate: {vehicle.plateNumber}</p>
                                  <p className="text-xs text-zinc-500 break-words">
                                    Fuel: {vehicle.fuelType || "N/A"} | Transmission: {vehicle.transmission || "N/A"} | Passengers: {passengerCount ?? "N/A"}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-zinc-900 sm:text-right">
                                ${Number(vehicle.dailyRate || 0).toFixed(2)}/day
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {fieldErrors.vehicleId && <p className="mt-1 text-sm text-red-600">{fieldErrors.vehicleId}</p>}
              {form.pickupDatetime &&
                form.returnDatetime &&
                !loadingVehicles &&
                vehicles.length === 0 && (
                  <p className="mt-1 text-sm text-orange-700">
                    No vehicles are available for the selected date/time range.
                  </p>
                )}
            </div>

            {!form.vehicleId && form.pickupDatetime && form.returnDatetime && vehicles.length > 0 && (
              <p className="md:col-span-2 xl:col-span-4 text-sm text-amber-800">
                Select an available vehicle to continue with guest details and payment.
              </p>
            )}

            {form.vehicleId && (
              <>
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

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Email</label>
                  <p className="mb-1 text-xs text-zinc-600">
                    We will send your reservation confirmation and other communications to this email.
                  </p>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleContactBlur}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    placeholder="you@example.com"
                    required
                  />
                  {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    max={maxDateOfBirth}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    required
                  />
                  {fieldErrors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.dateOfBirth}</p>
                  )}
                </div>

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

                <div className="relative md:col-span-2 xl:col-span-4">
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Address</label>
                  <input
                    name="addressLine"
                    value={form.addressLine}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    placeholder="123 Main Street"
                    required
                  />
                  {fieldErrors.addressLine && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.addressLine}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">City</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    required
                  />
                  {fieldErrors.city && <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">State</label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    required
                  >
                    <option value="">Select State</option>
                    {US_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.state && <p className="mt-1 text-sm text-red-600">{fieldErrors.state}</p>}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Zip</label>
                  <input
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    required
                  />
                  {fieldErrors.zip && <p className="mt-1 text-sm text-red-600">{fieldErrors.zip}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleContactBlur}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                    placeholder="+1 555 123 4567"
                    required
                  />
                  {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
                </div>

                {lookupInFlight && <p className="md:col-span-2 xl:col-span-4 text-sm text-zinc-600">Checking existing customer details...</p>}
                {lookupMessage && <p className="md:col-span-2 xl:col-span-4 text-sm text-emerald-700">{lookupMessage}</p>}

                <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                  <p className="text-sm font-semibold text-emerald-900">Credit Card Payment (Test Mode)</p>
                  <p className="text-xs text-emerald-800">
                    This is a dummy payment step for now. Clicking the button below marks payment as confirmed so reservation can be completed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="md:col-span-2 xl:col-span-1">
                      <label className="block mb-1 text-sm font-medium text-zinc-700">Cardholder Name</label>
                      <input
                        name="cardholderName"
                        value={paymentForm.cardholderName}
                        onChange={handlePaymentInputChange}
                        className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                        placeholder="John Doe"
                      />
                      {fieldErrors.cardholderName && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.cardholderName}</p>
                      )}
                    </div>
                    <div className="md:col-span-2 xl:col-span-1">
                      <label className="block mb-1 text-sm font-medium text-zinc-700">Card Number</label>
                      <input
                        name="cardNumber"
                        value={paymentForm.cardNumber}
                        onChange={handlePaymentInputChange}
                        className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                        placeholder="4242 4242 4242 4242"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-sm font-medium text-zinc-700">Expiry (MM/YY)</label>
                      <input
                        name="expiry"
                        value={paymentForm.expiry}
                        onChange={handlePaymentInputChange}
                        className="w-full rounded-xl border border-zinc-300 bg-white p-3"
                        placeholder="12/30"
                      />
                      {fieldErrors.expiry && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.expiry}</p>
                      )}
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
                      {fieldErrors.cvv && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.cvv}</p>
                      )}
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

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestPayment}
                      disabled={paying || !pricePreview}
                      className="w-full sm:w-auto rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {paying ? "Confirming Demo Payment..." : "Confirm Demo Payment"}
                    </button>
                    {form.paymentConfirmed && (
                      <span className="text-sm font-semibold text-emerald-900">Payment Confirmed</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-zinc-300 bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-zinc-900">Georgia Rental Terms Acceptance</p>
                  <p className="text-xs text-zinc-700">
                    This electronic acceptance applies to Booking #{form.paymentReference || "Pending"} for {selectedVehicle?.make} {selectedVehicle?.model}.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-700">
                    <p>Guest: {`${form.firstName} ${form.lastName}`.trim() || "-"}</p>
                    <p>Email: {form.email || "-"}</p>
                    <p>Phone: {form.phone || "-"}</p>
                    <p>Vehicle: {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "-"}</p>
                    <p>Pickup: {form.pickupDatetime || "-"}</p>
                    <p>Return: {form.returnDatetime || "-"}</p>
                    <p>Estimated Total: {pricePreview ? `$${pricePreview.total.toFixed(2)}` : "-"}</p>
                    <p>Venue: Georgia</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="/ga-rental-terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-200"
                    >
                      View Full Georgia Terms
                    </a>
                    <span className="text-xs text-zinc-600">Open the terms link to review full conditions.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={termsChecks.accuracy}
                        onChange={(e) => {
                          setTermsChecks((prev) => ({ ...prev, accuracy: e.target.checked }));
                          setFieldErrors((prev) => ({ ...prev, termsAccepted: "" }));
                        }}
                        className="mt-0.5"
                      />
                      I confirm all booking and driver details are accurate.
                    </label>
                    <label className="flex items-start gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={termsChecks.agreement}
                        onChange={(e) => {
                          setTermsChecks((prev) => ({ ...prev, agreement: e.target.checked }));
                          setFieldErrors((prev) => ({ ...prev, termsAccepted: "" }));
                        }}
                        className="mt-0.5"
                      />
                      I have read and agree to the Georgia Vehicle Rental Terms and Conditions.
                    </label>
                    <label className="flex items-start gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={termsChecks.authorization}
                        onChange={(e) => {
                          setTermsChecks((prev) => ({ ...prev, authorization: e.target.checked }));
                          setFieldErrors((prev) => ({ ...prev, termsAccepted: "" }));
                        }}
                        className="mt-0.5"
                      />
                      I authorize charges for rental, lawful fees, and incidentals under this booking.
                    </label>
                    <label className="flex items-start gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={termsChecks.esign}
                        onChange={(e) => {
                          setTermsChecks((prev) => ({ ...prev, esign: e.target.checked }));
                          setFieldErrors((prev) => ({ ...prev, termsAccepted: "" }));
                        }}
                        className="mt-0.5"
                      />
                      I understand this checkmark acceptance is my electronic signature.
                    </label>
                  </div>

                  {fieldErrors.termsAccepted && (
                    <p className="text-sm text-red-600">{fieldErrors.termsAccepted}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || loadingVehicles || !form.paymentConfirmed || !allTermsAccepted}
                  className="md:col-span-2 xl:col-span-4 w-full rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Submitting Reservation..." : "Confirm Reservation"}
                </button>
              </>
            )}

            {error && <p className="md:col-span-2 xl:col-span-4 text-sm text-red-700">{error}</p>}
            {success && <p className="md:col-span-2 xl:col-span-4 text-sm text-green-700">{success}</p>}
          </form>
        </section>

        <section className="rounded-3xl border border-black/10 bg-zinc-950 text-zinc-100 p-6 sm:p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] lg:col-span-1 h-fit lg:sticky lg:top-4">
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
                  <span>
                    Rental (<em>${pricePreview.dailyRate.toFixed(2)} x {pricePreview.days} days</em>)
                  </span>
                  <span>${pricePreview.rentalSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge (${SERVICE_CHARGE_PER_DAY}/day)</span>
                  <span>${pricePreview.serviceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (7%)</span>
                  <span>${pricePreview.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Deposit (<em>refundable</em>)
                  </span>
                  <span>${pricePreview.deposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>${pricePreview.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                Deposit is refundable and included in the total estimate.
              </p>
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
