import dynamic from "next/dynamic";
const ChatWidget = dynamic(() => import("../../components/ChatWidget"), { ssr: false });
"use client";
// Default discount tiers (empty by default)
const DEFAULT_BOOKING_DISCOUNT_TIERS: { minDays: number; discountPercent: number }[] = [];

// Default values for reservation calculations
const TAX_PERCENTAGE = 7.5; // Example: 7.5% sales tax
const SERVICE_CHARGE_PER_DAY = 10; // Example: $10 per day service fee
const PROTECTION_PLAN_FEE_PER_DAY = 15; // Example: $15 per day protection plan


import { Inter } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../lib/api";
// Font setup
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "700"] });
const displayFont = { className: "font-satoshi" };

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

function getVehicleCategoryMeta(category?: string) {
  const normalized = String(category || "compact").toLowerCase();
  if (normalized === "midsize") {
    return {
      label: "Midsize",
      icon: "M",
      classes: "bg-emerald-100 text-emerald-700",
    };
  }
  if (normalized === "suv") {
    return {
      label: "SUV",
      icon: "S",
      classes: "bg-amber-100 text-amber-700",
    };
  }
  if (normalized === "luxury") {
    return {
      label: "Luxury",
      icon: "L",
      classes: "bg-violet-100 text-violet-700",
    };
  }
  if (normalized === "unassigned") {
    return {
      label: "Unassigned",
      icon: "U",
      classes: "bg-zinc-100 text-zinc-700",
    };
  }
  return {
    label: "Compact",
    icon: "C",
    classes: "bg-sky-100 text-sky-700",
  };
}

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

type PublicReservationSettings = {
  pickupLocation: string;
  depositAmount: number;
  taxPercentage: number;
  servicePlatformFeePerDay: number;
  protectionPlanFeePerDay: number;
  tiers: BookingDiscountTier[];
};

type PaymentForm = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type ConfirmationDetails = {
  bookingId: number;
  firstName: string;
  lastName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  pickupDatetime: string;
  returnDatetime: string;
  pickupLocation: string;
  total: number;
  paymentReference: string;
  emailMessage?: string;
  smsMessage?: string;
  deletionToken?: string;
  manageToken?: string;
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

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
};

type AddressSuggestion = {
  displayName: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
};

type BookingDiscountTier = {
  minDays: number;
  discountPercent: number;
};

type BookingPricePreview = {
  rentalDays: number;
  dailyRate: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  taxPercentage: number;
  tax: number;
  serviceFee: number;
  serviceCharge: number;
  servicePlatformFeePerDay: number;
  protectionFee: number;
  protectionPlanFee: number;
  protectionPlanFeePerDay: number;
  depositAmount: number;
  total: number;
  couponDiscount?: number;
  couponCode?: string;
};

function calculateBookingPricePreview({
  pickupDatetime,
  returnDatetime,
  dailyRate,
  discountTiers,
  depositAmount,
  taxPercentage,
  servicePlatformFeePerDay,
  protectionPlanFeePerDay,
}: {
  pickupDatetime: string;
  returnDatetime: string;
  dailyRate: number;
  discountTiers: BookingDiscountTier[];
  depositAmount: number;
  taxPercentage: number;
  servicePlatformFeePerDay: number;
  protectionPlanFeePerDay: number;
}): BookingPricePreview | null {
  const pickup = new Date(pickupDatetime);
  const returnDt = new Date(returnDatetime);
  if (isNaN(pickup.getTime()) || isNaN(returnDt.getTime()) || returnDt <= pickup) {
    return null;
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  const rentalDays = Math.ceil((returnDt.getTime() - pickup.getTime()) / msPerDay);
  const subtotal = rentalDays * dailyRate;

  // Find applicable discount tier
  let discountPercent = 0;
  if (discountTiers && discountTiers.length > 0) {
    const applicableTiers = discountTiers
      .filter((t) => rentalDays >= t.minDays)
      .sort((a, b) => b.minDays - a.minDays);
    if (applicableTiers.length > 0) {
      discountPercent = applicableTiers[0].discountPercent ?? 0;
    }
  }
  const discountAmount = (discountPercent / 100) * subtotal;
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = ((taxPercentage || 0) / 100) * discountedSubtotal;
  const serviceFee = (servicePlatformFeePerDay || 0) * rentalDays;
  const protectionFee = (protectionPlanFeePerDay || 0) * rentalDays;
  const total = discountedSubtotal + taxAmount + serviceFee + protectionFee + (depositAmount || 0);

  return {
    rentalDays,
    dailyRate,
    subtotal,
    discountAmount,
    discountPercent,
    taxAmount,
    taxPercentage: taxPercentage || 0,
    tax: taxAmount,
    serviceFee,
    serviceCharge: serviceFee,
    servicePlatformFeePerDay: servicePlatformFeePerDay || 0,
    protectionFee,
    protectionPlanFee: protectionFee,
    protectionPlanFeePerDay: protectionPlanFeePerDay || 0,
    depositAmount: depositAmount || 0,
    total,
  };
}


function formatBookingId(id: number | string) {
  return `#${String(id).padStart(6, "0")}`;
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
  minimumDate.setFullYear(minimumDate.getFullYear() - 21);
  return minimumDate;
}

function isAtLeast21(dateOfBirth: string) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  return dob <= getMinimumAllowedDateOfBirth();
}

function extractManageTokenFromUrl(value?: string | null) {
  if (!value) return undefined;

  const marker = "/guest-manage/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return undefined;

  const start = markerIndex + marker.length;
  const remainder = value.slice(start);
  const token = remainder.split("?")[0].split("#")[0].trim();
  return token || undefined;
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

function getMinimumReturnDatetime(pickupDatetime: string) {
  const pickup = new Date(pickupDatetime);
  if (Number.isNaN(pickup.getTime())) {
    return "";
  }

  const minimum = new Date(pickup);
  minimum.setHours(minimum.getHours() + 24);
  return formatDatetimeLocal(minimum);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, "");
  return (
    digitsOnly.length === 10 ||
    (digitsOnly.length === 11 && digitsOnly.startsWith("1"))
  );
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

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const message = (error as { response?: { data?: { message?: string } } })
      .response?.data?.message;
    if (message) return message;
  }

  return fallback;
}

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
    (state) => state.name.toLowerCase() === trimmed.toLowerCase(),
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

type Vehicle = {
  id: number | string;
  make: string;
  model: string;
  dailyRate: number;
  dailyMileage?: number;
  imageUrl?: string;
  plateNumber?: string;
  passengers?: number;
  seats?: number;
  passengerCapacity?: number;
  numberOfPassengers?: number;
  transmission?: string;
  fuelType?: string;
  usageType?: string;
  category?: string;
};

export default function ReservePage() {
    // Coupon state for reservation
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponInput, setCouponInput] = useState("");
    const [couponMessage, setCouponMessage] = useState<string | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);

    const handleApplyCoupon = async () => {
      if (!couponInput.trim()) return;
      setCouponLoading(true);
      setCouponMessage(null);
      try {
        const res = await fetch("/api/coupons");
        const data = await res.json();
        const found = (data.coupons || []).find(
          (c: any) => c.code.toUpperCase() === couponInput.trim().toUpperCase()
        );
        if (!found) {
          setCouponMessage("Invalid coupon code.");
          setAppliedCoupon(null);
        } else if (found.expiry && new Date(found.expiry) < new Date()) {
          setCouponMessage("This coupon has expired.");
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon(found);
          setCouponMessage(`Coupon applied: ${found.type === "percent" ? found.value + "% off" : "$" + found.value + " off"}`);
        }
      } catch {
        setCouponMessage("Could not validate coupon. Try again.");
      } finally {
        setCouponLoading(false);
      }
    };

    const handleRemoveCoupon = () => {
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponMessage(null);
    };
  const [themeMode, setThemeMode] = useState<"auto" | "day" | "night">("auto");
  const [rentalThemeClass, setRentalThemeClass] = useState(
    "reserve-rental-bg-day",
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [confirmationDetails, setConfirmationDetails] =
    useState<ConfirmationDetails | null>(null);
  const [cancelConfirmStep, setCancelConfirmStep] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
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
  const [discountTiers, setDiscountTiers] = useState<BookingDiscountTier[]>(
    DEFAULT_BOOKING_DISCOUNT_TIERS,
  );
  const [globalDepositAmount, setGlobalDepositAmount] = useState(100);
  const [globalTaxPercentage, setGlobalTaxPercentage] = useState(TAX_PERCENTAGE);
  const [globalServicePlatformFeePerDay, setGlobalServicePlatformFeePerDay] =
    useState(SERVICE_CHARGE_PER_DAY);
  const [globalProtectionPlanFeePerDay, setGlobalProtectionPlanFeePerDay] =
    useState(PROTECTION_PLAN_FEE_PER_DAY);
  const [pickupLocation, setPickupLocation] = useState("Main Office");
  const vehicleRequestIdRef = useRef(0);
  const addressRequestIdRef = useRef(0);
  const [maxDateOfBirth, setMaxDateOfBirth] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [loadingAddressSuggestions, setLoadingAddressSuggestions] = useState(false);
  const [activeAddressSuggestionIndex, setActiveAddressSuggestionIndex] = useState(-1);

  useEffect(() => {
    setMaxDateOfBirth(formatDateForInput(getMinimumAllowedDateOfBirth()));
  }, []);

  useEffect(() => {
    const query = form.addressLine.trim();

    if (query.length < 3) {
      setAddressSuggestions([]);
      setActiveAddressSuggestionIndex(-1);
      setLoadingAddressSuggestions(false);
      return;
    }

    const requestId = addressRequestIdRef.current + 1;
    addressRequestIdRef.current = requestId;

    const timer = setTimeout(async () => {
      try {
        setLoadingAddressSuggestions(true);
        const response = await api.get("/public/geocode/search", {
          params: {
            addressLine: query,
            city: form.city.trim() || undefined,
            state: form.state.trim() || undefined,
            zip: form.zip.trim() || undefined,
            q: query,
          },
        });

        const payload = (response.data?.data || []) as Array<{
          label?: string;
          addressLine?: string;
          city?: string;
          state?: string;
          zip?: string;
        }>;

        if (addressRequestIdRef.current !== requestId) {
          return;
        }

        const suggestions = payload
          .map((item) => {
            const label = (item.label || "").trim();
            const inferredLine = label.split(",")[0]?.trim() || "";
            const addressLine =
              (item.addressLine || "").trim() || inferredLine || query;

            return {
              displayName: label || addressLine,
              addressLine,
              city: (item.city || "").trim(),
              state: normalizeStateCode(item.state || ""),
              zip: normalizeZipToFive(item.zip || ""),
            } satisfies AddressSuggestion;
          });

        setAddressSuggestions(suggestions);
        setActiveAddressSuggestionIndex(suggestions.length > 0 ? 0 : -1);
      } catch {
        if (addressRequestIdRef.current === requestId) {
          setAddressSuggestions([]);
          setActiveAddressSuggestionIndex(-1);
        }
      } finally {
        if (addressRequestIdRef.current === requestId) {
          setLoadingAddressSuggestions(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [form.addressLine, form.city, form.state, form.zip]);

  const fetchReservationSettings = async () => {
    try {
      const res = await api.get("/public/discount-settings");
      const settings = (res.data?.data ||
        {}) as Partial<PublicReservationSettings>;
      const tiers = settings.tiers;
      if (Array.isArray(tiers) && tiers.length > 0) {
        setDiscountTiers(
          tiers.map((t: any) => ({
            minDays: Number(t.minDays || 0),
            discountPercent: Number(t.percentage ?? t.discountPercent ?? 0),
          }))
        );
      }
      if (Number.isFinite(Number(settings.depositAmount))) {
        setGlobalDepositAmount(Math.max(Number(settings.depositAmount), 0));
      }
      if (Number.isFinite(Number(settings.taxPercentage))) {
        setGlobalTaxPercentage(
          Math.min(Math.max(Number(settings.taxPercentage), 0), 100),
        );
      }
      if (Number.isFinite(Number(settings.servicePlatformFeePerDay))) {
        setGlobalServicePlatformFeePerDay(
          Math.max(Number(settings.servicePlatformFeePerDay), 0),
        );
      }
      if (Number.isFinite(Number(settings.protectionPlanFeePerDay))) {
        setGlobalProtectionPlanFeePerDay(
          Math.max(Number(settings.protectionPlanFeePerDay), 0),
        );
      }
      if (
        typeof settings.pickupLocation === "string" &&
        settings.pickupLocation.trim()
      ) {
        setPickupLocation(settings.pickupLocation.trim());
      }
    } catch {
      setDiscountTiers(DEFAULT_BOOKING_DISCOUNT_TIERS);
      setGlobalDepositAmount(100);
      setGlobalTaxPercentage(TAX_PERCENTAGE);
      setGlobalServicePlatformFeePerDay(SERVICE_CHARGE_PER_DAY);
      setGlobalProtectionPlanFeePerDay(PROTECTION_PLAN_FEE_PER_DAY);
      setPickupLocation("Main Office");
    }
  };

  useEffect(() => {
    fetchReservationSettings();
  }, []);

  useEffect(() => {
    const handleWindowFocus = () => {
      fetchReservationSettings();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchReservationSettings();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const resolveAutoThemeClass = () => {
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      return isNight ? "reserve-rental-bg-night" : "reserve-rental-bg-day";
    };

    if (themeMode === "day") {
      setRentalThemeClass("reserve-rental-bg-day");
      return;
    }

    if (themeMode === "night") {
      setRentalThemeClass("reserve-rental-bg-night");
      return;
    }

    setRentalThemeClass(resolveAutoThemeClass());
    const interval = setInterval(() => {
      setRentalThemeClass(resolveAutoThemeClass());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [themeMode]);

  const isNightTheme = rentalThemeClass === "reserve-rental-bg-night";

  const handleThemeModeChange = (mode: "auto" | "day" | "night") => {
    setThemeMode(mode);
  };

  const handleSearchCars = () => {
    setError("");

    if (!form.pickupDatetime || !form.returnDatetime) {
      setFieldErrors((prev) => ({
        ...prev,
        pickupDatetime: form.pickupDatetime ? "" : "Pickup date/time is required",
        returnDatetime: form.returnDatetime ? "" : "Return date/time is required",
      }));
      return;
    }

    if (new Date(form.returnDatetime) <= new Date(form.pickupDatetime)) {
      setError("Return date/time must be at least 24 hours after pickup date/time");
      return;
    }

    const minimumReturn = getMinimumReturnDatetime(form.pickupDatetime);
    if (minimumReturn && new Date(form.returnDatetime) < new Date(minimumReturn)) {
      setError("Return date/time must be at least 24 hours after pickup date/time");
      return;
    }

    setShowVehicleList(true);
  };

  const isShowingAvailableCars =
    showVehicleList && Boolean(form.pickupDatetime) && Boolean(form.returnDatetime);

  useEffect(() => {
    const fetchVehicles = async () => {
      setError("");
      const requestId = vehicleRequestIdRef.current + 1;
      vehicleRequestIdRef.current = requestId;

      try {
        setLoadingVehicles(true);
        let res;

        if (isShowingAvailableCars) {
          // Prevent stale featured cards from showing while available results load.
          setVehicles([]);

          if (new Date(form.returnDatetime) <= new Date(form.pickupDatetime)) {
            setError(
              "Return date/time must be at least 24 hours after pickup date/time",
            );
            setVehicles([]);
            setForm((prev) => ({ ...prev, vehicleId: "" }));
            return;
          }

          const minimumReturn = getMinimumReturnDatetime(form.pickupDatetime);
          if (
            minimumReturn &&
            new Date(form.returnDatetime) < new Date(minimumReturn)
          ) {
            setError(
              "Return date/time must be at least 24 hours after pickup date/time",
            );
            setVehicles([]);
            setForm((prev) => ({ ...prev, vehicleId: "" }));
            return;
          }

          res = await api.get("/public/vehicles/available", {
            params: {
              pickupDatetime: new Date(form.pickupDatetime).toISOString(),
              returnDatetime: new Date(form.returnDatetime).toISOString(),
            },
          });
        } else {
          res = await api.get("/public/vehicles", {
            params: {
              page: 1,
              limit: 4,
            },
          });
        }

        const payload = (res.data?.data || []) as Vehicle[];
        if (vehicleRequestIdRef.current !== requestId) {
          return;
        }
        setVehicles(payload);

        setForm((prev) => ({
          ...prev,
          vehicleId: payload.some(
            (v: Vehicle) => String(v.id) === prev.vehicleId,
          )
            ? prev.vehicleId
            : "",
        }));
      } catch (err: unknown) {
        if (vehicleRequestIdRef.current !== requestId) {
          return;
        }
        setError(
          getApiErrorMessage(
            err,
            isShowingAvailableCars
              ? "Failed to fetch available vehicles"
              : "Failed to fetch featured vehicles",
          ),
        );
        setVehicles([]);
      } finally {
        if (vehicleRequestIdRef.current === requestId) {
          setLoadingVehicles(false);
        }
      }
    };

    fetchVehicles();
  }, [form.pickupDatetime, form.returnDatetime, isShowingAvailableCars]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === form.vehicleId),
    [vehicles, form.vehicleId],
  );

  const pricePreview = useMemo(() => {
    if (!selectedVehicle || !form.pickupDatetime || !form.returnDatetime) {
      return null;
    }
    let preview = calculateBookingPricePreview({
      pickupDatetime: form.pickupDatetime,
      returnDatetime: form.returnDatetime,
      dailyRate: Number(selectedVehicle.dailyRate || 0),
      discountTiers,
      depositAmount: globalDepositAmount,
      taxPercentage: globalTaxPercentage,
      servicePlatformFeePerDay: globalServicePlatformFeePerDay,
      protectionPlanFeePerDay: globalProtectionPlanFeePerDay,
    });
    // Apply coupon discount
    if (appliedCoupon && preview) {
      let couponDiscount = 0;
      if (appliedCoupon.type === "percent") {
        couponDiscount = (Number(appliedCoupon.value) / 100) * preview.subtotal;
      } else {
        couponDiscount = Number(appliedCoupon.value);
      }
      // Don't allow discount to exceed subtotal
      couponDiscount = Math.min(couponDiscount, preview.subtotal);
      preview = {
        ...preview,
        discountAmount: (preview.discountAmount || 0) + couponDiscount,
        total: Math.max(0, preview.total - couponDiscount),
        couponDiscount,
        couponCode: appliedCoupon.code,
      };
    }
    return preview;
  }, [selectedVehicle, form.pickupDatetime, form.returnDatetime, discountTiers, globalDepositAmount, globalTaxPercentage, globalServicePlatformFeePerDay, globalProtectionPlanFeePerDay, appliedCoupon]);

  const totalMileageAllowed = useMemo(() => {
    if (!selectedVehicle || !pricePreview) {
      return null;
    }

    const dailyMileage = Number(selectedVehicle.dailyMileage);
    const rentalDays = Number(pricePreview.rentalDays || 0);

    if (!Number.isFinite(dailyMileage) || rentalDays <= 0) {
      return null;
    }

    return dailyMileage * rentalDays;
  }, [selectedVehicle, pricePreview]);

  const allTermsAccepted = useMemo(
    () => Object.values(termsChecks).every(Boolean),
    [termsChecks],
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name } = e.target;
    const value =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;
    const previousValue = form[name as keyof ReservationForm];
    const didChange = previousValue !== (value as ReservationForm[keyof ReservationForm]);

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
          new Date(prev.returnDatetime) <
            new Date(getMinimumReturnDatetime(value))
        ) {
          nextForm.returnDatetime = getDefaultReturnDatetime(value);
        }
      }

      return nextForm;
    });

    if (didChange && ["pickupDatetime", "returnDatetime", "vehicleId"].includes(name)) {
      resetPaymentState();
    }

    if (["firstName", "lastName"].includes(name)) {
      resetPaymentState();
    }

    if (didChange && (name === "pickupDatetime" || name === "returnDatetime")) {
      setShowVehicleList(false);
    }

    if (name === "addressLine" && typeof value === "string") {
      const query = value.trim();
      setShowAddressSuggestions(query.length >= 3);
      if (query.length < 3) {
        setAddressSuggestions([]);
        setActiveAddressSuggestionIndex(-1);
      }
    }

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
      returnDatetime: name === "pickupDatetime" ? "" : prev.returnDatetime,
    }));

    if (name === "email" || name === "phone") {
      setLookupMessage("");
    }

    if (error) setError("");
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

  const handleContactBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
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

      // Only search by the field that was just blurred — never mix email + phone
      // in the lookup. This prevents Virgil's phone (or any previously-entered
      // contact info) from matching a completely different new customer.
      const lookupParams =
        name === "email"
          ? { email: email || undefined }
          : { phone: normalizedPhone || undefined };

      const res = await api.get("/public/customers/lookup", {
        params: lookupParams,
      });

      const existing: ExistingCustomer | null = res.data?.data || null;

      if (!existing) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        // Preserve whatever the user already typed for name fields; only
        // fall back to the stored name if the field is still empty.
        firstName:
          prev.firstName.trim() || existing.firstName || prev.firstName,
        lastName: prev.lastName.trim() || existing.lastName || prev.lastName,
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

      setLookupMessage(
        "Returning customer — details pre-filled. Update any fields that have changed.",
      );
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
          : "Payment not completed.",
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
    if (error) setError("");
  };

  const handleAddressSuggestionSelect = (suggestion: AddressSuggestion) => {
    setForm((prev) => ({
      ...prev,
      addressLine: suggestion.addressLine || prev.addressLine,
      city: suggestion.city || prev.city,
      state: suggestion.state || prev.state,
      zip: suggestion.zip || prev.zip,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      addressLine: "",
      city: "",
      state: "",
      zip: "",
    }));

    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setActiveAddressSuggestionIndex(-1);
  };

  const handleAddressInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!showAddressSuggestions || addressSuggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveAddressSuggestionIndex((prev) =>
        prev < addressSuggestions.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveAddressSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : addressSuggestions.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      if (activeAddressSuggestionIndex >= 0) {
        event.preventDefault();
        handleAddressSuggestionSelect(
          addressSuggestions[activeAddressSuggestionIndex],
        );
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setShowAddressSuggestions(false);
      setActiveAddressSuggestionIndex(-1);
    }
  };

  const handleBackToAvailableCars = () => {
    setForm((prev) => ({
      ...prev,
      vehicleId: "",
    }));
    resetPaymentState();
    setFieldErrors((prev) => ({
      ...prev,
      vehicleId: "",
    }));
    if (error) setError("");
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
    } else if (!isAtLeast21(form.dateOfBirth)) {
      errors.dateOfBirth =
        "Age requirements not met. You must be at least 21 years Old to book a vehicle on Carsgidi. Please review our eligibility requirements or contact support if you have questions.";
    }

    if (!form.pickupDatetime)
      errors.pickupDatetime = "Pickup date/time is required";
    if (!form.returnDatetime)
      errors.returnDatetime = "Return date/time is required";
    if (!form.vehicleId) errors.vehicleId = "Please choose a vehicle";
    if (form.vehicleId && !selectedVehicle)
      errors.vehicleId = "Selected vehicle not found. Please choose again.";
    if (form.pickupDatetime && form.returnDatetime && form.vehicleId && !pricePreview)
      errors.returnDatetime = "Could not calculate price. Check pickup and return dates.";
    if (!form.paymentReference.trim()) {
      errors.paymentReference = "Payment reference is required";
    }
    if (!form.paymentConfirmed) {
      errors.paymentConfirmed = "Confirm payment before submitting";
    }
    if (!allTermsAccepted) {
      errors.termsAccepted =
        "You must accept all rental terms before confirming reservation";
    }

    if (
      form.pickupDatetime &&
      form.returnDatetime &&
      new Date(form.returnDatetime) <
        new Date(getMinimumReturnDatetime(form.pickupDatetime))
    ) {
      errors.returnDatetime =
        "Return date/time must be at least 24 hours after pickup date/time";
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
      const confirmationEmailMessage =
        res.data?.data?.confirmationEmail?.message;
      const confirmationSmsMessage = res.data?.data?.confirmationSms?.message;
        const confirmationEmailLinks = res.data?.data?.confirmationEmail?.links;
        const confirmationSmsLinks = res.data?.data?.confirmationSms?.links;
        const manageToken =
          confirmationEmailLinks?.token ||
          confirmationSmsLinks?.token ||
          extractManageTokenFromUrl(confirmationEmailLinks?.manageUrl) ||
          extractManageTokenFromUrl(confirmationEmailLinks?.modifyUrl) ||
          extractManageTokenFromUrl(confirmationEmailLinks?.cancelUrl) ||
          extractManageTokenFromUrl(confirmationSmsLinks?.manageUrl) ||
          extractManageTokenFromUrl(confirmationSmsLinks?.modifyUrl) ||
          extractManageTokenFromUrl(confirmationSmsLinks?.cancelUrl) ||
          (res.data?.data?.manageToken as string | undefined);
        const deletionToken = res.data?.data?.deletionToken as string | undefined;

      if (bookingId && selectedVehicle && pricePreview) {
        setConfirmationDetails({
          bookingId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          vehicleMake: selectedVehicle.make,
          vehicleModel: selectedVehicle.model,
          vehiclePlate: selectedVehicle.plateNumber ?? "",
          pickupDatetime: form.pickupDatetime,
          returnDatetime: form.returnDatetime,
          pickupLocation,
          total: pricePreview.total,
          paymentReference: form.paymentReference.trim(),
          emailMessage: confirmationEmailMessage,
          smsMessage: confirmationSmsMessage,
          deletionToken,
          manageToken,
        });
      }

      setForm({
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
      setPaymentForm({
        cardholderName: "",
        cardNumber: "",
        expiry: "",
        cvv: "",
      });
      setTermsChecks({
        accuracy: false,
        agreement: false,
        authorization: false,
        esign: false,
      });
      setLookupMessage("");
      setPaymentMessage("");
      setVehicles([]);
    } catch (err: unknown) {
      const responseErrors =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { errors?: FieldErrors } } }).response
              ?.data?.errors || {}
          : {};
      setError(getApiErrorMessage(err, "Failed to submit reservation"));
      setFieldErrors(responseErrors);
    } finally {
      setSubmitting(false);
    }
  };

    return (
      <main className={`${bodyFont.className} relative isolate min-h-screen bg-white px-3 pb-2 pt-2 sm:px-4 sm:pb-3 sm:pt-3 transition-colors duration-500 ${isNightTheme ? "text-slate-100" : "text-slate-900"}`}> 
        <ChatWidget />

        {/* Theme toggle */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1 rounded-full border border-white/20 bg-black/20 p-1 backdrop-blur">
          {(["day", "auto", "night"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleThemeModeChange(mode)}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                themeMode === mode
                  ? "bg-white text-slate-900 shadow"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {mode === "day" && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1Zm4.22 1.78a1 1 0 0 1 0 1.42l-.71.7a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0ZM18 9a1 1 0 0 1 0 2h-1a1 1 0 0 1 0-2h1Zm-1.78 5.78a1 1 0 0 1-1.42 0l-.7-.71a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42ZM11 16a1 1 0 0 1-2 0v-1a1 1 0 0 1 2 0v1Zm-5.78-1.78a1 1 0 0 1 0-1.42l.71-.7a1 1 0 1 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42 0ZM4 11a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2H4Zm.78-6.22a1 1 0 0 1 1.42 0l.7.71A1 1 0 0 1 5.49 6.9l-.71-.7a1 1 0 0 1 0-1.42ZM10 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
                </svg>
              )}
              {mode === "night" && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
                </svg>
              )}
              {mode === "auto" && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2Zm0 2v12a6 6 0 0 0 0-12Z" clipRule="evenodd" />
                </svg>
              )}
              <span className="hidden sm:inline">{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
            </button>
          ))}
        </div>

        <div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-6 grid-cols-1">
        <section
          className="reserve-card-reveal"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <aside className="relative mx-auto aspect-[3/1] w-full max-w-[1307px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/60 reserve-surface-lift min-h-[180px] sm:min-h-[300px] md:min-h-[360px]">
                <div className="absolute inset-0">
                  <img
                    src="/Newhero.png"
                    alt="Carsgidi hero"
                    width={1307}
                    height={871}
                    className="h-full w-full object-contain"
                    style={{ objectPosition: "left top" }}
                  />
                </div>
                <div className="relative h-full flex flex-col justify-end">
                  <div className="w-full md:absolute md:left-1/2 md:bottom-2 md:-translate-x-1/2 md:w-[calc(100%-1rem)] md:grid md:gap-1 md:rounded-2xl md:border md:border-white/80 md:bg-white/95 md:p-1 md:shadow-[0_12px_30px_-18px_rgba(15,23,42,0.5)] md:backdrop-blur md:reserve-card-reveal md:reserve-card-reveal-late md:reserve-surface-lift md:bottom-4 md:w-[calc(100%-2rem)] md:max-w-[860px] md:grid-cols-[1fr_0.95fr_0.95fr_auto] md:items-end md:p-2 lg:bottom-6 lg:w-[calc(100%-3rem)]">
                    <div className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 mb-2 md:mb-0">
                      <p className={`${displayFont.className} text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 md:text-xs`}>
                        Pickup location
                      </p>
                      <p className={`${displayFont.className} mt-0.5 text-sm font-semibold text-zinc-900 md:text-sm`}>
                        {pickupLocation}
                      </p>
                    </div>
                    <div className="mb-2 md:mb-0">
                      <label className={`${displayFont.className} mb-0.5 block text-[11px] font-semibold text-zinc-700 md:text-sm`}>Pickup date</label>
                      <input
                        type="datetime-local"
                        name="pickupDatetime"
                        value={form.pickupDatetime}
                        onChange={handleChange}
                        className="form-input-modern w-full rounded-xl border border-slate-200 bg-white p-1.5 text-xs text-zinc-900 shadow-sm md:p-2 md:text-sm"
                        required
                      />
                      {fieldErrors.pickupDatetime && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupDatetime}</p>
                      )}
                    </div>
                    <div className="mb-2 md:mb-0">
                      <label className={`${displayFont.className} mb-0.5 block text-[11px] font-semibold text-zinc-700 md:text-sm`}>Return date</label>
                      <input
                        type="datetime-local"
                        name="returnDatetime"
                        value={form.returnDatetime}
                        onChange={handleChange}
                        min={
                          form.pickupDatetime
                            ? getMinimumReturnDatetime(form.pickupDatetime)
                            : undefined
                        }
                        className="form-input-modern w-full rounded-xl border border-slate-200 bg-white p-1.5 text-xs text-zinc-900 shadow-sm md:p-2 md:text-sm"
                        required
                      />
                      {fieldErrors.returnDatetime && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.returnDatetime}</p>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleSearchCars}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          handleSearchCars();
                        }}
                        className={`${displayFont.className} touch-manipulation relative z-[120] h-[34px] w-full rounded-xl bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] px-2 py-1 text-[11px] font-semibold tracking-[0.01em] text-white shadow-[0_12px_24px_-12px_rgba(37,99,235,0.8)] transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-14px_rgba(37,99,235,0.85)] md:h-[38px] md:px-2.5 md:py-1.5 md:text-sm`}
                      >
                        Search Cars
                      </button>
                    </div>
                    {fieldErrors.vehicleId && (
                      <p className="mt-2 text-sm text-red-200">{fieldErrors.vehicleId}</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>

              <section
                className={`rounded-[30px] p-4 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.2)] reserve-card-reveal reserve-card-reveal-delayed reserve-surface-lift md:p-5 ${
                  isShowingAvailableCars ? "md:min-h-[640px]" : ""
                } ${isNightTheme ? "bg-slate-900 text-slate-100" : "bg-white"}`}
              >
                <div className="flex flex-col gap-3 border-b border-black/5 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className={`${displayFont.className} text-base font-semibold uppercase tracking-[0.16em] text-blue-700 md:text-lg`}>
                      {isShowingAvailableCars && selectedVehicle
                        ? "Reservation Preview"
                        : isShowingAvailableCars
                          ? "Available Cars"
                          : "Featured Cars"}
                    </p>
                  </div>
                  {isShowingAvailableCars && selectedVehicle && (
                    <button
                      type="button"
                      onClick={handleBackToAvailableCars}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Back to Available Cars
                    </button>
                  )}
                </div>

                <div className={`mt-4 rounded-3xl p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_28px_-18px_rgba(15,23,42,0.4)] ${isNightTheme ? "bg-slate-800/80" : "bg-white/80"}`}>
                  {isShowingAvailableCars && selectedVehicle ? (
                    <div className="grid grid-cols-1 gap-4 p-2 md:grid-cols-2">
                      <div className="group/preview-card relative overflow-hidden rounded-2xl bg-white/95 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-22px_rgba(15,23,42,0.6)] hover:ring-2 hover:ring-slate-400/60">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-900/0 transition duration-200 group-hover/preview-card:bg-slate-900/14"
                        />
                        <p className={`${displayFont.className} text-lg font-semibold text-zinc-900`}>
                          {selectedVehicle.make} {selectedVehicle.model}
                        </p>
                        <img
                          src={
                            selectedVehicle.imageUrl
                              ? `http://localhost:5000${selectedVehicle.imageUrl}`
                              : "/placeholder-vehicle.svg"
                          }
                          alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                          className="mx-auto mt-3 aspect-[4/3] w-full max-w-sm rounded-xl border border-black/5 object-cover object-center shadow-sm"
                        />
                        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 text-blue-600"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
                              <path d="M5 19c0-3.1 2.8-5 7-5s7 1.9 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                            </svg>
                            {selectedVehicle.passengers ??
                              selectedVehicle.seats ??
                              selectedVehicle.passengerCapacity ??
                              selectedVehicle.numberOfPassengers ??
                              "N/A"} seats
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 text-violet-600"
                              aria-hidden="true"
                            >
                              <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                            </svg>
                            {selectedVehicle.transmission || "Auto"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 text-emerald-600"
                              aria-hidden="true"
                            >
                              <path d="M7 18v-7.5A2.5 2.5 0 0 1 9.5 8h4.8A2.7 2.7 0 0 1 17 10.7V18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              <path d="M10 8V6.5M14 8V6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              <path d="M6 18h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                            </svg>
                            {selectedVehicle.fuelType || "Fuel"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 text-amber-600"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
                              <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {selectedVehicle.dailyMileage ?? "N/A"} mi/day
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <p className={`w-fit rounded-full px-2.5 py-1 text-sm font-bold ${
                            (selectedVehicle.usageType || "both").toLowerCase() === "personal"
                              ? "bg-blue-100 text-blue-700"
                              : (selectedVehicle.usageType || "both").toLowerCase() === "rideshare"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-fuchsia-100 text-fuchsia-700"
                          }`}>
                            {formatUsageTypeLabel(selectedVehicle.usageType)}
                          </p>
                          <p className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${getVehicleCategoryMeta(selectedVehicle.category).classes}`}>
                            {getVehicleCategoryMeta(selectedVehicle.category).label}
                          </p>
                        </div>
                        <p className={`${displayFont.className} mt-2 w-fit rounded-full bg-gradient-to-br from-blue-50 to-sky-50 px-3 py-1.5 text-sm font-semibold text-blue-700`}>
                          ${Number(selectedVehicle.dailyRate || 0).toFixed(2)}/day
                        </p>
                      </div>

                      <div className="group/preview-card relative overflow-hidden rounded-2xl bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-22px_rgba(15,23,42,0.6)] hover:ring-2 hover:ring-slate-400/60">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-900/0 transition duration-200 group-hover/preview-card:bg-slate-900/14"
                        />
                        <p className={`${displayFont.className} text-base font-semibold text-zinc-900`}>
                          Amount Breakdown
                        </p>
                        {pricePreview ? (
                          <div className="mt-2 space-y-1.5 text-sm text-zinc-700">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-sky-600" aria-hidden="true">
                                  <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
                                  <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                </svg>
                                Days
                              </span>
                              <span>{pricePreview.rentalDays ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true">
                                  <path d="M4.5 15.5L9 11l3 3 7.5-7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                  <circle cx="9" cy="11" r="1" fill="currentColor" />
                                  <circle cx="12" cy="14" r="1" fill="currentColor" />
                                </svg>
                                Subtotal
                              </span>
                              <span>${Number(pricePreview.subtotal ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-violet-600" aria-hidden="true">
                                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.7" />
                                  <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.7" />
                                  <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                </svg>
                                Discount
                              </span>
                              <span>-${Number(pricePreview.discountAmount ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-amber-600" aria-hidden="true">
                                  <path d="M4 9.5h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-9Z" stroke="currentColor" strokeWidth="1.7" />
                                  <path d="M7 9.5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                </svg>
                                Refundable Deposit
                              </span>
                              <span>${Number(pricePreview.depositAmount ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-sky-700" aria-hidden="true">
                                  <path d="M4 7h16M6 12h12M8 17h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                </svg>
                                Service/Platform Fee (${Number(pricePreview.servicePlatformFeePerDay || 0).toFixed(2)}/day)
                              </span>
                              <span>${Number(pricePreview.serviceCharge ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-cyan-700" aria-hidden="true">
                                  <path d="M12 3l7 4v5c0 4.2-2.5 7.3-7 9-4.5-1.7-7-4.8-7-9V7l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                </svg>
                                Protection Plan (${Number(pricePreview.protectionPlanFeePerDay || 0).toFixed(2)}/day)
                              </span>
                              <span>${Number(pricePreview.protectionPlanFee ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-indigo-700" aria-hidden="true">
                                  <path d="M5 5h14v14H5z" stroke="currentColor" strokeWidth="1.7" />
                                  <path d="M8 15l8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                </svg>
                                Tax ({Number(pricePreview.taxPercentage || 0).toFixed(2)}%)
                              </span>
                              <span>${Number(pricePreview.tax ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="my-1 h-px bg-zinc-200" />
                            {/* Coupon discount row */}
                            {pricePreview.couponDiscount ? (
                              <div className="flex items-center justify-between text-emerald-700">
                                <span className="inline-flex items-center gap-1.5">
                                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                    <path d="M12.5 3l1.5 1.5L15.5 3 17 4.5 19 3v3h-2l-1.5 1.5L14 6H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Coupon ({pricePreview.couponCode})
                                </span>
                                <span>-${Number(pricePreview.couponDiscount).toFixed(2)}</span>
                              </div>
                            ) : null}
                            {/* Coupon input box */}
                            <div className="mt-2">
                              {!appliedCoupon ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={couponInput}
                                    onChange={e => { setCouponInput(e.target.value); setCouponMessage(null); }}
                                    placeholder="Enter coupon code"
                                    className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    onKeyDown={e => { if (e.key === "Enter") handleApplyCoupon(); }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={couponLoading || !couponInput.trim()}
                                    className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                                  >
                                    {couponLoading ? "..." : "Apply"}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between rounded bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                                  <span>Coupon <strong>{appliedCoupon.code}</strong> applied</span>
                                  <button type="button" onClick={handleRemoveCoupon} className="ml-2 text-xs text-red-500 hover:underline">Remove</button>
                                </div>
                              )}
                              {couponMessage && (
                                <p className={`mt-1 text-xs ${couponMessage.startsWith("Coupon applied") ? "text-emerald-600" : "text-red-500"}`}>
                                  {couponMessage}
                                </p>
                              )}
                            </div>
                            <div className="my-1 h-px bg-zinc-200" />
                            <div className="flex items-center justify-between text-base font-bold text-zinc-900">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 text-blue-700" aria-hidden="true">
                                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                                  <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                Total
                              </span>
                              <span>${Number(pricePreview.total ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="mt-4 h-px bg-zinc-200" />
                            <div className="mt-3 flex items-center justify-between text-base font-bold text-zinc-900 md:text-lg">
                              <span className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-rose-600" aria-hidden="true">
                                  <path d="M5 17h14M8 17v-2a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  <circle cx="12" cy="11" r="1.5" fill="currentColor" />
                                </svg>
                                Total mileage allowed
                              </span>
                              <span>
                                {totalMileageAllowed !== null
                                  ? `${totalMileageAllowed.toLocaleString()} mi`
                                  : "N/A"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-600">
                              Included mileage = daily mileage allowance x number of rental days.
                            </p>
                            <p className="text-sm text-zinc-600">
                              Overage rate: $0.25 per mile for any distance above the included trip mileage.
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-600">
                            Select valid pickup and return dates to view full pricing.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : loadingVehicles && vehicles.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-zinc-600">
                      {isShowingAvailableCars
                        ? "Loading available cars..."
                        : "Loading featured cars..."}
                    </p>
                  ) : vehicles.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-zinc-600">
                      {isShowingAvailableCars
                        ? "No available cars found for the selected dates."
                        : "No featured cars found."}
                    </p>
                  ) : (
                    <div
                      className={`grid gap-3 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                        isShowingAvailableCars
                          ? "max-h-[44rem] overflow-y-auto"
                          : "overflow-visible"
                      }`}
                    >
                      {vehicles.map((vehicle, index) => {
                        const isSelected =
                          String(vehicle.id) === form.vehicleId;
                        const normalizedUsageType = (vehicle.usageType || "both").toLowerCase();
                        const passengerCount =
                          vehicle.passengers ??
                          vehicle.seats ??
                          vehicle.passengerCapacity ??
                          vehicle.numberOfPassengers;

                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() => {
                              if (isShowingAvailableCars) {
                                handleSelectVehicle(String(vehicle.id));
                              }
                            }}
                            disabled={!isShowingAvailableCars}
                            style={
                              {
                                "--anim-delay": `${index * 45}ms`,
                              } as React.CSSProperties
                            }
                            className={`group relative w-full overflow-hidden rounded-2xl bg-white/95 text-left transition duration-200 ${
                              isShowingAvailableCars ? "p-3" : "p-4"
                            } ${
                              isShowingAvailableCars
                                ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-22px_rgba(15,23,42,0.6)] hover:ring-2 hover:ring-slate-400/70"
                                : "cursor-default"
                            } ${
                              isSelected
                                ? "bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35),0_20px_40px_-24px_rgba(30,64,175,0.3)]"
                                : ""
                            } ${isShowingAvailableCars ? "animate-stagger" : "card-float-drift"}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-0 rounded-2xl transition duration-200 ${
                                isShowingAvailableCars
                                  ? "bg-slate-900/0 group-hover:bg-slate-900/18"
                                  : "bg-transparent"
                              }`}
                            />
                            <div className={`flex h-full flex-col ${isShowingAvailableCars ? "gap-2.5" : "gap-3.5"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`${displayFont.className} truncate font-semibold text-zinc-900 ${
                                    isShowingAvailableCars ? "text-base" : "text-lg"
                                  }`}>
                                    {vehicle.make} {vehicle.model}
                                  </p>
                                </div>
                                <span
                                  aria-hidden="true"
                                  className="rounded-full bg-gradient-to-br from-blue-50 to-sky-50 px-2 py-0.5 text-xs font-semibold text-blue-700"
                                >
                                  ♡
                                </span>
                              </div>

                              <img
                                src={
                                  vehicle.imageUrl
                                    ? `http://localhost:5000${vehicle.imageUrl}`
                                    : "/placeholder-vehicle.svg"
                                }
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className={`w-full rounded-xl border border-black/5 object-cover shadow-sm ${
                                  isShowingAvailableCars ? "h-32 md:h-36" : "h-28"
                                }`}
                              />

                              <div className="flex flex-wrap items-center gap-1.5">
                                <p
                                  className={`w-fit rounded-full font-bold ${
                                    isShowingAvailableCars ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
                                  } ${
                                    normalizedUsageType === "personal"
                                      ? "bg-blue-100 text-blue-700"
                                      : normalizedUsageType === "rideshare"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-fuchsia-100 text-fuchsia-700"
                                  }`}
                                >
                                  {formatUsageTypeLabel(vehicle.usageType)}
                                </p>
                                <p
                                  className={`inline-flex w-fit items-center gap-1.5 rounded-full font-semibold ${
                                    isShowingAvailableCars ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
                                  } ${getVehicleCategoryMeta(vehicle.category).classes}`}
                                >
                                  {getVehicleCategoryMeta(vehicle.category).label}
                                </p>
                              </div>

                              <div
                                className={`w-fit rounded-full bg-gradient-to-br from-blue-50 to-sky-50 font-semibold text-blue-700 ${
                                  isShowingAvailableCars ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
                                }`}
                              >
                                ${Number(vehicle.dailyRate || 0).toFixed(2)}/day
                              </div>

                              <div className={`grid grid-cols-2 gap-x-2 gap-y-1 text-zinc-500 ${isShowingAvailableCars ? "text-[11px]" : "text-xs"}`}>
                                <span className="flex items-center gap-1">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 text-blue-600"
                                    aria-hidden="true"
                                  >
                                    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
                                    <path d="M5 19c0-3.1 2.8-5 7-5s7 1.9 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                  </svg>
                                  {passengerCount ?? "N/A"}
                                </span>
                                <span>{vehicle.transmission || "Auto"}</span>
                                <span className="flex items-center gap-1">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 text-emerald-600"
                                    aria-hidden="true"
                                  >
                                    <path d="M7 18v-7.5A2.5 2.5 0 0 1 9.5 8h4.8A2.7 2.7 0 0 1 17 10.7V18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                    <path d="M10 8V6.5M14 8V6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                    <path d="M6 18h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                  </svg>
                                  {vehicle.fuelType || "Fuel"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 text-amber-600"
                                    aria-hidden="true"
                                  >
                                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
                                    <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  {vehicle.dailyMileage ?? "N/A"} mi/day
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {form.pickupDatetime &&
                form.returnDatetime &&
                !loadingVehicles &&
                vehicles.length === 0 && (
                  <p className="md:col-span-2 xl:col-span-4 text-sm text-orange-700">
                    No vehicles are available for the selected date/time range.
                  </p>
                )}

              {!form.vehicleId &&
                form.pickupDatetime &&
                form.returnDatetime &&
                vehicles.length > 0 && (
                  <div className="mt-3 md:col-span-2 md:mt-4 xl:col-span-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/85 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[0_10px_24px_-18px_rgba(30,64,175,0.6)]">
                      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>Select an available vehicle to continue with guest details and payment.</span>
                    </div>
                  </div>
                )}

              {isShowingAvailableCars && form.vehicleId && (
                <>
                  <div className="mt-5 md:mt-6">
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      First Name
                    </label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 md:mt-6">
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Last Name
                    </label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 md:col-span-2 md:mt-6">
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Email
                    </label>
                    <p className="mb-1 text-xs text-zinc-600">
                      We will send your reservation confirmation and other
                      communications to this email.
                    </p>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleContactBlur}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      placeholder="you@example.com"
                      required
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      max={maxDateOfBirth || undefined}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Driver&apos;s License
                    </label>
                    <input
                      name="driversLicenseNo"
                      value={form.driversLicenseNo}
                      onChange={handleChange}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.driversLicenseNo && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.driversLicenseNo}
                      </p>
                    )}
                  </div>

                  <div className="relative md:col-span-2 xl:col-span-4">
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Address
                    </label>
                    <input
                      name="addressLine"
                      value={form.addressLine}
                      onChange={handleChange}
                      onKeyDown={handleAddressInputKeyDown}
                      onFocus={() => {
                        if (addressSuggestions.length > 0) {
                          setShowAddressSuggestions(true);
                          setActiveAddressSuggestionIndex(0);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowAddressSuggestions(false), 120);
                      }}
                      aria-autocomplete="list"
                      aria-expanded={showAddressSuggestions}
                      aria-controls="address-suggestions-list"
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      placeholder="123 Main Street"
                      required
                    />
                    {loadingAddressSuggestions && form.addressLine.trim().length >= 3 && (
                      <p className="mt-1 text-xs text-zinc-500">Finding matching addresses...</p>
                    )}
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div
                        id="address-suggestions-list"
                        className="absolute left-0 right-0 z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
                      >
                        {addressSuggestions.map((suggestion, index) => (
                          <button
                            key={`${suggestion.displayName}-${index}`}
                            type="button"
                            onMouseEnter={() => setActiveAddressSuggestionIndex(index)}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleAddressSuggestionSelect(suggestion);
                            }}
                            className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-zinc-700 last:border-b-0 hover:bg-slate-50 ${
                              activeAddressSuggestionIndex === index ? "bg-slate-100" : ""
                            }`}
                          >
                            {suggestion.displayName}
                          </button>
                        ))}
                      </div>
                    )}
                    {fieldErrors.addressLine && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.addressLine}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      City
                    </label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.city && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      State
                    </label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    >
                      <option value="">Select State</option>
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.state && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.state}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Zip
                    </label>
                    <input
                      name="zip"
                      value={form.zip}
                      onChange={handleChange}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.zip && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.zip}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-zinc-700">
                      Phone
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      onBlur={handleContactBlur}
                      className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                      placeholder="+1 555 123 4567"
                      required
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  {lookupInFlight && (
                    <p className="md:col-span-2 xl:col-span-4 text-sm text-zinc-600">
                      Checking existing customer details...
                    </p>
                  )}
                  {lookupMessage && (
                    <p className="md:col-span-2 xl:col-span-4 text-sm text-emerald-700">
                      {lookupMessage}
                    </p>
                  )}

                  <div
                    className="md:col-span-2 xl:col-span-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/12 p-4 space-y-3 animate-stagger"
                    style={{ "--anim-delay": "140ms" } as React.CSSProperties}
                  >
                    <p className="text-sm font-semibold text-emerald-900">
                      Credit Card Payment (Test Mode)
                    </p>
                    <p className="text-xs text-emerald-800">
                      This is a dummy payment step for now. Clicking the button
                      below marks payment as confirmed so reservation can be
                      completed.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="md:col-span-2 xl:col-span-1">
                        <label className="block mb-1 text-sm font-medium text-zinc-700">
                          Cardholder Name
                        </label>
                        <input
                          name="cardholderName"
                          value={paymentForm.cardholderName}
                          onChange={handlePaymentInputChange}
                          className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                          placeholder="John Doe"
                        />
                        {fieldErrors.cardholderName && (
                          <p className="mt-1 text-sm text-red-600">
                            {fieldErrors.cardholderName}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2 xl:col-span-1">
                        <label className="block mb-1 text-sm font-medium text-zinc-700">
                          Card Number
                        </label>
                        <input
                          name="cardNumber"
                          value={paymentForm.cardNumber}
                          onChange={handlePaymentInputChange}
                          className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                          placeholder="4242 4242 4242 4242"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium text-zinc-700">
                          Expiry (MM/YY)
                        </label>
                        <input
                          name="expiry"
                          value={paymentForm.expiry}
                          onChange={handlePaymentInputChange}
                          className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                          placeholder="12/30"
                        />
                        {fieldErrors.expiry && (
                          <p className="mt-1 text-sm text-red-600">
                            {fieldErrors.expiry}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium text-zinc-700">
                          CVV
                        </label>
                        <input
                          name="cvv"
                          value={paymentForm.cvv}
                          onChange={handlePaymentInputChange}
                          className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                          placeholder="123"
                        />
                        {fieldErrors.cvv && (
                          <p className="mt-1 text-sm text-red-600">
                            {fieldErrors.cvv}
                          </p>
                        )}
                      </div>
                    </div>

                    {fieldErrors.paymentStatus && (
                      <p className="text-sm text-red-600">
                        {fieldErrors.paymentStatus}
                      </p>
                    )}
                    {fieldErrors.paymentReference && (
                      <p className="text-sm text-red-600">
                        {fieldErrors.paymentReference}
                      </p>
                    )}
                    {fieldErrors.paymentConfirmed && (
                      <p className="text-sm text-red-600">
                        {fieldErrors.paymentConfirmed}
                      </p>
                    )}

                    {paymentMessage && (
                      <p className="text-sm text-emerald-900">
                        {paymentMessage}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTestPayment}
                        disabled={paying || !pricePreview}
                        className="attention-bounce w-full sm:w-auto rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        {paying
                          ? "Confirming Demo Payment..."
                          : "Confirm Demo Payment"}
                      </button>
                      {form.paymentConfirmed && (
                        <span className="text-sm font-semibold text-emerald-900">
                          Payment Confirmed
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-3 backdrop-blur animate-stagger"
                    style={{ "--anim-delay": "200ms" } as React.CSSProperties}
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      Georgia Rental Terms Acceptance
                    </p>
                    <p className="text-xs text-zinc-600">
                      This electronic acceptance applies to Booking #
                      {form.paymentReference || "Pending"} for{" "}
                      {selectedVehicle?.make} {selectedVehicle?.model}.
                    </p>
                    <div className="grid grid-cols-1 gap-3 text-xs text-zinc-600 md:grid-cols-2">
                      <p>
                        Guest:{" "}
                        {`${form.firstName} ${form.lastName}`.trim() || "-"}
                      </p>
                      <p>Email: {form.email || "-"}</p>
                      <p>Phone: {form.phone || "-"}</p>
                      <p>
                        Vehicle:{" "}
                        {selectedVehicle
                          ? `${selectedVehicle.make} ${selectedVehicle.model}`
                          : "-"}
                      </p>
                      <p>Pickup: {form.pickupDatetime || "-"}</p>
                      <p>Return: {form.returnDatetime || "-"}</p>
                      <p>
                        Estimated Total:{" "}
                        {pricePreview
                          ? `$${pricePreview.total.toFixed(2)}`
                          : "-"}
                      </p>
                      <p>Venue: Georgia</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href="/ga-rental-terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-slate-50"
                      >
                        View Full Georgia Terms
                      </a>
                      <span className="text-xs text-zinc-600">
                        Open the terms link to review full conditions.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2 text-sm text-zinc-800">
                        <input
                          type="checkbox"
                          checked={termsChecks.accuracy}
                          onChange={(e) => {
                            setTermsChecks((prev) => ({
                              ...prev,
                              accuracy: e.target.checked,
                            }));
                            setFieldErrors((prev) => ({
                              ...prev,
                              termsAccepted: "",
                            }));
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
                            setTermsChecks((prev) => ({
                              ...prev,
                              agreement: e.target.checked,
                            }));
                            setFieldErrors((prev) => ({
                              ...prev,
                              termsAccepted: "",
                            }));
                          }}
                          className="mt-0.5"
                        />
                        I have read and agree to the Georgia Vehicle Rental
                        Terms and Conditions.
                      </label>
                      <label className="flex items-start gap-2 text-sm text-zinc-800">
                        <input
                          type="checkbox"
                          checked={termsChecks.authorization}
                          onChange={(e) => {
                            setTermsChecks((prev) => ({
                              ...prev,
                              authorization: e.target.checked,
                            }));
                            setFieldErrors((prev) => ({
                              ...prev,
                              termsAccepted: "",
                            }));
                          }}
                          className="mt-0.5"
                        />
                        I authorize charges for rental, lawful fees, and
                        incidentals under this booking.
                      </label>
                      <label className="flex items-start gap-2 text-sm text-zinc-800">
                        <input
                          type="checkbox"
                          checked={termsChecks.esign}
                          onChange={(e) => {
                            setTermsChecks((prev) => ({
                              ...prev,
                              esign: e.target.checked,
                            }));
                            setFieldErrors((prev) => ({
                              ...prev,
                              termsAccepted: "",
                            }));
                          }}
                          className="mt-0.5"
                        />
                        I understand this checkmark acceptance is my electronic
                        signature.
                      </label>
                    </div>

                    {fieldErrors.termsAccepted && (
                      <p className="text-sm text-red-600">
                        {fieldErrors.termsAccepted}
                      </p>
                    )}
                  </div>

                  {(!form.vehicleId || !selectedVehicle || !form.pickupDatetime || !form.returnDatetime || !pricePreview) && (
                    <p className="md:col-span-2 xl:col-span-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
                      Please select a vehicle and valid pickup/return dates to see the Reservation Preview before confirming.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      loadingVehicles ||
                      !form.paymentConfirmed ||
                      !allTermsAccepted ||
                      !form.vehicleId ||
                      !selectedVehicle ||
                      !form.pickupDatetime ||
                      !form.returnDatetime ||
                      !pricePreview
                    }
                    className="attention-bounce md:col-span-2 xl:col-span-4 w-full rounded-xl bg-[#2f66e8] px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2257d6] disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting Reservation..."
                      : "Confirm Reservation"}
                  </button>
                </>
              )}
            </div>
              </section>

            {error && (
              <p className="md:col-span-2 xl:col-span-4 text-sm text-red-700">
                {error}
              </p>
            )}
          </form>
        </section>

      </div>

      <section className="relative z-10 mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article
            className="rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-4 shadow-[0_14px_26px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-3 text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/30">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M5 12.5 9.5 17 19 7.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 7.5 16.8 8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" opacity="0.65" />
                </svg>
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold text-slate-100">
                  Free Cancellation
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Cancel up to 24 hrs before pickup
                </p>
              </div>
            </div>
          </article>

          <article
            className="rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-4 shadow-[0_14px_26px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-500 to-pink-500 p-3 text-white shadow-lg shadow-fuchsia-500/30 ring-1 ring-white/30">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 3 3.5 7.5V12c0 5.2 3.7 8 8.5 9 4.8-1 8.5-3.8 8.5-9V7.5L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9.5 12.2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                </svg>
              </div>
              <p className="pt-1 text-sm font-semibold text-slate-100">
                No Hidden Fees
              </p>
            </div>
          </article>

          <article
            className="rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-4 shadow-[0_14px_26px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-3 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/30">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 14v2.5M18 14v2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="8" r="1.1" fill="currentColor" opacity="0.9" />
                </svg>
              </div>
              <div>
                <p className="pt-1 text-sm font-semibold text-slate-100">
                  24/7 Support
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Need help with your reservation?
                </p>
                <a
                  href="mailto:support@carsgidi.com"
                  className="mt-1 block text-xs text-slate-300 hover:text-white"
                >
                  support@carsgidi.com
                </a>
                <a
                  href="tel:+14702382358"
                  className="mt-1 block text-xs text-slate-300 hover:text-white"
                >
                  +1 (470) 238-2358
                </a>
              </div>
            </div>
          </article>

          <article
            className="rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-4 shadow-[0_14px_26px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-3 text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/30">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 3 5 6.5V11c0 4.4 2.8 7.4 7 8.8 4.2-1.4 7-4.4 7-8.8V6.5L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9.5 12.5 11.5 14.5 15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 6.8v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
                </svg>
              </div>
              <p className="pt-1 text-sm font-semibold text-slate-100">
                Protection Plan Included
              </p>
            </div>
          </article>
      </section>

      {confirmationDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!cancelling) {
                setConfirmationDetails(null);
                setCancelConfirmStep(false);
                setCancelError("");
              }
            }}
          />
          <div className="relative w-full max-w-md overflow-y-auto max-h-[90vh] rounded-3xl border border-emerald-300/50 bg-white p-6 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)] sm:p-8">
            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6 text-emerald-600"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12.5 9.5 17 19 7.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="confirm-modal-title"
                  className="text-lg font-bold text-zinc-900"
                >
                  Reservation Confirmed
                </h2>
                <p className="text-sm text-zinc-500">
                  Trip ID {formatBookingId(confirmationDetails.bookingId)}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Trip ID</span>
                <span className="font-mono font-semibold text-zinc-900 break-all text-right">
                  {formatBookingId(confirmationDetails.bookingId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Guest</span>
                <span className="font-medium text-zinc-900">
                  {confirmationDetails.firstName} {confirmationDetails.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Vehicle</span>
                <span className="font-medium text-zinc-900">
                  {confirmationDetails.vehicleMake}{" "}
                  {confirmationDetails.vehicleModel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Plate</span>
                <span className="font-medium text-zinc-900">
                  {confirmationDetails.vehiclePlate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pickup</span>
                <span className="font-medium text-zinc-900">
                  {new Date(confirmationDetails.pickupDatetime).toLocaleString(
                    [],
                    { dateStyle: "medium", timeStyle: "short" },
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Return</span>
                <span className="font-medium text-zinc-900">
                  {new Date(confirmationDetails.returnDatetime).toLocaleString(
                    [],
                    { dateStyle: "medium", timeStyle: "short" },
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pickup location</span>
                <span className="font-medium text-zinc-900">
                  {confirmationDetails.pickupLocation}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3">
                <span className="text-zinc-500">Total charged</span>
                <span className="font-bold text-zinc-900">
                  ${confirmationDetails.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment ref</span>
                <span className="font-medium text-zinc-900 break-all text-right">
                  {confirmationDetails.paymentReference}
                </span>
              </div>
            </div>

            {(confirmationDetails.emailMessage ||
              confirmationDetails.smsMessage) && (
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                {confirmationDetails.emailMessage && (
                  <p>{confirmationDetails.emailMessage}</p>
                )}
                {confirmationDetails.smsMessage && (
                  <p className="mt-1">{confirmationDetails.smsMessage}</p>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmationDetails(null);
                  setCancelConfirmStep(false);
                  setCancelError("");
                }}
                  className="w-full rounded-xl bg-[#2f66e8] px-4 py-3 font-semibold text-white transition hover:bg-[#2257d6]"
              >
                Done
              </button>
              {confirmationDetails.manageToken && (
                <a
                  href={`/guest-manage/${confirmationDetails.manageToken}?action=modify`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Modify reservation
                </a>
              )}
              {confirmationDetails.manageToken && (
                <a
                  href={`/guest-manage/${confirmationDetails.manageToken}?action=cancel`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-center text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Cancel reservation
                </a>
              )}
            </div>
          </div>
        </div>
      )}

        {/* FAQ Assistant UI removed */}

        </div>
      </main>
  );
}
