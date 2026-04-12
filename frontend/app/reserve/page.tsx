"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../lib/api";
import {
  calculateBookingPricePreview,
  DEFAULT_BOOKING_DISCOUNT_TIERS,
  SERVICE_CHARGE_PER_DAY,
  type BookingDiscountTier,
} from "../../lib/bookingPricing";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
  usageType?: "personal" | "rideshare" | "both" | string;
  description?: string;
  fuelType?: string | null;
  transmission?: string | null;
  passengers?: number | null;
  seats?: number | null;
  passengerCapacity?: number | null;
  numberOfPassengers?: number | null;
  dailyMileage?: number | null;
  imageUrl?: string | null;
};

function formatUsageTypeLabel(usageType?: string) {
  const normalized = (usageType || "both").toLowerCase();
  if (normalized === "personal") return "Personal";
  if (normalized === "rideshare") return "Rideshare";
  return "Personal/Rideshare";
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
  tiers: BookingDiscountTier[];
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

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
};

const FAQ_ENTRIES: Array<{
  keywords: string[];
  answer: string;
}> = [
  {
    keywords: ["rideshare", "ride share", "uber", "lyft", "doordash", "instacart"],
    answer:
      "Yes, guests can rent for rideshare use. Choose a vehicle marked Personal/Rideshare during reservation.",
  },
  {
    keywords: ["payment", "pay", "card", "credit"],
    answer:
      "Payment is confirmed in the test flow using the Confirm Demo Payment button. In production, this will be replaced with a live payment gateway.",
  },
  {
    keywords: ["deposit", "refundable"],
    answer:
      "A refundable deposit is included in your booking estimate and shown in the Reservation Preview card.",
  },
  {
    keywords: ["discount", "long", "days"],
    answer:
      "Long booking discounts apply automatically based on the selected rental duration. The preview shows the percentage and amount when eligible.",
  },
  {
    keywords: ["license", "driver", "age", "18"],
    answer:
      "Guests must provide a valid driver's license and be at least 18 years old to complete a reservation.",
  },
  {
    keywords: ["cancel", "reschedule", "modify", "change"],
    answer:
      "If you need to modify or cancel after booking, contact support and include your booking ID for faster assistance.",
  },
  {
    keywords: ["pickup", "location", "where"],
    answer:
      "Pickup location is shown in your Reservation Card and in your confirmation details after submission.",
  },
  {
    keywords: ["available", "vehicle", "car", "fleet"],
    answer:
      "Available vehicles are filtered by your pickup and return dates. Click Search Cars to view the current options.",
  },
  {
    keywords: ["support", "help", "phone", "email", "contact"],
    answer:
      "You can reach support at support@carsgidi.com or +1 (470) 238-2358.",
  },
];

function buildFaqResponse(input: string, pickupLocation: string) {
  const normalized = input.toLowerCase().trim();

  if (!normalized) {
    return "Please type your question and I will help with reservation FAQs.";
  }

  if (
    normalized.includes("rideshare") ||
    normalized.includes("ride share") ||
    normalized.includes("uber") ||
    normalized.includes("lyft") ||
    normalized.includes("doordash") ||
    normalized.includes("instacart")
  ) {
    return "Yes, guests can rent for rideshare use. Choose a vehicle marked Personal/Rideshare during reservation.";
  }

  let bestMatch: { score: number; answer: string } | null = null;

  for (const entry of FAQ_ENTRIES) {
    const score = entry.keywords.reduce((sum, keyword) => {
      return sum + (normalized.includes(keyword) ? 1 : 0);
    }, 0);

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { score, answer: entry.answer };
    }
  }

  if (bestMatch) {
    if (bestMatch.answer.includes("Pickup location")) {
      return `${bestMatch.answer} Current pickup point: ${pickupLocation}.`;
    }
    return bestMatch.answer;
  }

  return "I can help with payment, discounts, license requirements, pickup details, availability, and support contacts. Try asking one of those topics.";
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

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
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
  const [themeMode, setThemeMode] = useState<"auto" | "day" | "night">("auto");
  const [rentalThemeClass, setRentalThemeClass] = useState("reserve-rental-bg-day");
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
  const [discountTiers, setDiscountTiers] = useState<BookingDiscountTier[]>(
    DEFAULT_BOOKING_DISCOUNT_TIERS
  );
  const [pickupLocation, setPickupLocation] = useState("Main Office");
  const [isFaqChatOpen, setIsFaqChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      text: "Hi, I am your FAQ assistant. Ask about payment, discounts, pickup, requirements, or support.",
    },
  ]);
  const chatListRef = useRef<HTMLDivElement>(null);
  const chatMessageIdRef = useRef(2);

  const maxDateOfBirth = useMemo(
    () => formatDateForInput(getMinimumAllowedDateOfBirth()),
    []
  );

  const fetchReservationSettings = async () => {
    try {
      const res = await api.get("/public/discount-settings");
      const settings = (res.data?.data || {}) as Partial<PublicReservationSettings>;
      const tiers = settings.tiers;
      if (Array.isArray(tiers) && tiers.length > 0) {
        setDiscountTiers(tiers);
      }
      if (typeof settings.pickupLocation === "string" && settings.pickupLocation.trim()) {
        setPickupLocation(settings.pickupLocation.trim());
      }
    } catch {
      setDiscountTiers(DEFAULT_BOOKING_DISCOUNT_TIERS);
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
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, "Failed to fetch available vehicles"));
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

    return calculateBookingPricePreview({
      pickupDatetime: form.pickupDatetime,
      returnDatetime: form.returnDatetime,
      dailyRate: Number(selectedVehicle.dailyRate || 0),
      discountTiers,
    });
  }, [discountTiers, selectedVehicle, form.pickupDatetime, form.returnDatetime]);

  const allTermsAccepted = useMemo(
    () => Object.values(termsChecks).every(Boolean),
    [termsChecks]
  );

  useEffect(() => {
    if (!isFaqChatOpen || !chatListRef.current) {
      return;
    }

    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [chatMessages, isFaqChatOpen]);

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

  const pushChatMessage = (role: "bot" | "user", text: string) => {
    const id = chatMessageIdRef.current;
    chatMessageIdRef.current += 1;
    setChatMessages((prev) => [...prev, { id, role, text }]);
  };

  const handleFaqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const question = chatInput.trim();

    if (!question) {
      return;
    }

    pushChatMessage("user", question);
    setChatInput("");

    const response = buildFaqResponse(question, pickupLocation);
    pushChatMessage("bot", response);
  };

  const handleQuickFaq = (question: string) => {
    pushChatMessage("user", question);
    const response = buildFaqResponse(question, pickupLocation);
    pushChatMessage("bot", response);
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
      const confirmationSmsMessage = res.data?.data?.confirmationSms?.message;
      setSuccess(
        bookingId
          ? `Reservation submitted. Your booking ID is #${bookingId}.${
              confirmationEmailMessage ? ` ${confirmationEmailMessage}` : ""
            }${
              confirmationSmsMessage ? ` ${confirmationSmsMessage}` : ""
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
    } catch (err: unknown) {
      const responseErrors =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { errors?: FieldErrors } } }).response?.data?.errors || {}
          : {};
      setError(getApiErrorMessage(err, "Failed to submit reservation"));
      setFieldErrors(responseErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`${rentalThemeClass} relative isolate min-h-screen bg-cover bg-center bg-no-repeat px-3 pb-24 pt-2 text-[var(--color-paper)] sm:px-4 sm:pb-28 sm:pt-3`}>
      <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-[var(--color-accent)]/30 blur-3xl orb-float" />
      <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-[var(--color-cyan)]/30 blur-3xl orb-float-delayed" />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32 ${
          isNightTheme
            ? "bg-gradient-to-b from-transparent via-[rgba(9,14,26,0.28)] to-[rgba(7,12,22,0.62)]"
            : "bg-gradient-to-b from-transparent via-[rgba(255,248,236,0.2)] to-[rgba(253,244,227,0.62)]"
        }`}
      />

      <header className={`sticky left-0 right-0 top-0 z-30 mb-3 px-3 py-2.5 backdrop-blur-xl sm:mb-4 sm:px-4 sm:py-3 ${
        isNightTheme
          ? "bg-[linear-gradient(180deg,rgba(10,16,30,0.58),rgba(10,16,30,0.2),transparent)]"
          : "bg-[linear-gradient(180deg,rgba(255,248,237,0.6),rgba(255,248,237,0.22),transparent)]"
      }`}>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <img
            src="/logo3.jpeg"
            alt="Carsgidi logo"
            className={`float-soft h-14 w-auto object-contain opacity-88 sm:h-16 md:h-20 ${
              isNightTheme
                ? "mix-blend-screen brightness-125 contrast-125 saturate-110 drop-shadow-[0_12px_24px_rgba(2,6,18,0.55)]"
                : "mix-blend-multiply brightness-95 contrast-105 saturate-90 drop-shadow-[0_10px_20px_rgba(120,53,15,0.18)]"
            }`}
          />

          <div className={`flex items-center gap-1 rounded-full border p-1 text-xs font-semibold shadow-[0_12px_30px_-20px_rgba(146,64,14,0.5)] ${
            isNightTheme
              ? "border-slate-300/25 bg-white/15 text-slate-100"
              : "border-amber-900/20 bg-white/80 text-zinc-700"
          }`}>
            <button
              type="button"
              onClick={() => setThemeMode("auto")}
              className={`rounded-full px-3 py-1 transition ${
                themeMode === "auto"
                  ? "bg-[var(--color-accent)] text-zinc-900"
                  : isNightTheme
                    ? "hover:bg-white/15"
                    : "hover:bg-amber-50"
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("day")}
              className={`rounded-full px-3 py-1 transition ${
                themeMode === "day"
                  ? "bg-[var(--color-accent)] text-zinc-900"
                  : isNightTheme
                    ? "hover:bg-white/15"
                    : "hover:bg-amber-50"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("night")}
              className={`rounded-full px-3 py-1 transition ${
                themeMode === "night"
                  ? "bg-[var(--color-accent)] text-zinc-900"
                  : isNightTheme
                    ? "hover:bg-white/15"
                    : "hover:bg-amber-50"
              }`}
            >
              Night
            </button>
          </div>
        </div>
      </header>

      <section
        aria-label="Reservation highlights"
        className={`mx-auto mb-4 grid w-full max-w-7xl gap-3 rounded-2xl border p-4 shadow-[0_24px_60px_-40px_rgba(146,64,14,0.5)] backdrop-blur sm:grid-cols-3 ${
          isNightTheme
            ? "border-slate-200/20 bg-[rgba(15,24,41,0.72)]"
            : "border-amber-900/15 bg-white/72"
        }`}
      >
        <article
          data-card="flexible-rental"
          className={`animate-stagger rounded-xl border p-3 ${
            isNightTheme
              ? "border-slate-200/15 bg-white/8"
              : "border-amber-900/10 bg-white/75"
          }`}
          style={{ "--anim-delay": "20ms" } as React.CSSProperties}
        >
          <p className={`text-xs uppercase tracking-[0.2em] ${isNightTheme ? "text-slate-300" : "text-zinc-500"}`}>
            Flexible Rental
          </p>
          <p className={`mt-1 text-sm font-semibold ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>
            Daily, weekend, and custom return windows
          </p>
        </article>

        <article
          data-card="instant-confirmation"
          className={`pulse-glow float-soft rounded-xl border p-3 ${
            isNightTheme
              ? "border-slate-200/15 bg-white/8"
              : "border-amber-900/10 bg-white/75"
          }`}
        >
          <p className={`text-xs uppercase tracking-[0.2em] ${isNightTheme ? "text-slate-300" : "text-zinc-500"}`}>
            Instant Confirmation
          </p>
          <p className={`mt-1 text-sm font-semibold ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>
            Live availability and quick booking flow
          </p>
        </article>

        <article
          data-card="road-ready-fleet"
          className={`animate-stagger rounded-xl border p-3 ${
            isNightTheme
              ? "border-slate-200/15 bg-white/8"
              : "border-amber-900/10 bg-white/75"
          }`}
          style={{ "--anim-delay": "160ms" } as React.CSSProperties}
        >
          <p className={`text-xs uppercase tracking-[0.2em] ${isNightTheme ? "text-slate-300" : "text-zinc-500"}`}>
            Road Ready Fleet
          </p>
          <p className={`mt-1 text-sm font-semibold ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>
            Inspected vehicles with clear pricing
          </p>
        </article>
      </section>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <section className={`fade-up rounded-3xl border p-6 shadow-[0_30px_70px_-32px_rgba(146,64,14,0.34)] backdrop-blur-xl md:p-8 lg:col-span-2 ${
          isNightTheme
            ? "border-slate-200/20 bg-[linear-gradient(158deg,rgba(15,24,41,0.88),rgba(30,41,59,0.8))]"
            : "border-amber-900/15 bg-[linear-gradient(158deg,rgba(255,251,244,0.95),rgba(248,239,224,0.93))]"
        }`}>
          <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.95fr]">
              <div className="float-soft-delayed rounded-3xl border border-amber-300/20 bg-white/5 p-4 sm:p-5">
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isNightTheme ? "text-amber-300" : "text-[var(--color-accent-deep)]"}`}>Carsgidi</p>
                <h1 className={`mt-3 text-3xl font-black leading-tight sm:text-4xl ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>Find. Book. Drive</h1>
                <p className={`mt-4 max-w-2xl leading-relaxed ${isNightTheme ? "text-slate-300" : "text-zinc-600"}`}>
                  Reserve your ride in minutes. Book clean, reliable vehicles with transparent pricing and instant confirmation.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/45 bg-white/75 px-3 py-1.5 text-zinc-800">
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-amber-600" aria-hidden="true">
                      <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Flexible
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/45 bg-white/75 px-3 py-1.5 text-zinc-800">
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-sky-600" aria-hidden="true">
                      <path d="M10 3v7l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                    Instant
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/45 bg-white/75 px-3 py-1.5 text-zinc-800">
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true">
                      <path d="M3 11.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 11.5V9.8a2.8 2.8 0 0 1 2.8-2.8h2.4A2.8 2.8 0 0 1 14 9.8v1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6" cy="13.8" r="1.2" fill="currentColor" />
                      <circle cx="14" cy="13.8" r="1.2" fill="currentColor" />
                    </svg>
                    Road-ready
                  </span>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <article className={`flex min-h-[132px] flex-col justify-center rounded-2xl border px-5 py-5 ${
                    isNightTheme ? "border-slate-200/20 bg-white/10" : "border-amber-900/15 bg-white/75"
                  }`}>
                    <p className={`text-3xl font-black leading-none sm:text-[2rem] ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>200+</p>
                    <p className={`mt-2 text-base ${isNightTheme ? "text-slate-200" : "text-zinc-700"}`}>Trips completed</p>
                  </article>
                  <article className={`flex min-h-[132px] flex-col justify-center rounded-2xl border px-5 py-5 ${
                    isNightTheme ? "border-slate-200/20 bg-white/10" : "border-amber-900/15 bg-white/75"
                  }`}>
                    <p className={`text-3xl font-black leading-none sm:text-[2rem] ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>24/7</p>
                    <p className={`mt-2 text-base ${isNightTheme ? "text-slate-200" : "text-zinc-700"}`}>Customer Support</p>
                  </article>
                  <article className={`flex min-h-[132px] flex-col justify-center rounded-2xl border px-5 py-5 ${
                    isNightTheme ? "border-slate-200/20 bg-white/10" : "border-amber-900/15 bg-white/75"
                  }`}>
                    <p className={`text-3xl font-black leading-none sm:text-[2rem] ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>10+</p>
                    <p className={`mt-2 text-base ${isNightTheme ? "text-slate-200" : "text-zinc-700"}`}>vehicle in fleet</p>
                  </article>
                </div>
              </div>

              <aside className="relative rounded-2xl border border-amber-300/35 bg-white/80 p-4 shadow-[0_20px_44px_-30px_rgba(21,94,117,0.55)]">
                <div className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl bg-[radial-gradient(circle_at_70%_20%,rgba(245,191,98,0.42),transparent_55%),radial-gradient(circle_at_25%_80%,rgba(109,211,220,0.34),transparent_58%)] blur-xl" />
                <h2 className="text-base font-semibold text-zinc-900">Reservation Card</h2>

                <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">Pickup location</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{pickupLocation}</p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Pickup date</label>
                    <input
                      type="datetime-local"
                      name="pickupDatetime"
                      value={form.pickupDatetime}
                      onChange={handleChange}
                      className="form-input-modern w-full rounded-xl p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.pickupDatetime && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupDatetime}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Return date</label>
                    <input
                      type="datetime-local"
                      name="returnDatetime"
                      value={form.returnDatetime}
                      onChange={handleChange}
                      min={form.pickupDatetime || undefined}
                      className="form-input-modern w-full rounded-xl p-3 text-zinc-900"
                      required
                    />
                    {fieldErrors.returnDatetime && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.returnDatetime}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Vehicle</label>
                    <button
                      type="button"
                      onClick={() => setShowVehicleList((prev) => !prev)}
                      className="form-input-modern w-full rounded-xl px-4 py-3 text-left text-zinc-900 disabled:opacity-60"
                    >
                      {!form.pickupDatetime || !form.returnDatetime
                        ? "Set pickup and return date/time first"
                        : loadingVehicles
                          ? "Checking availability..."
                          : selectedVehicle
                            ? `${selectedVehicle.make} ${selectedVehicle.model} | ${selectedVehicle.plateNumber} | ${formatUsageTypeLabel(selectedVehicle.usageType)}`
                            : "Select available vehicle"}
                    </button>
                    <p className="mt-2 text-xs text-zinc-500">
                      Available cars will appear in a dedicated selection panel below.
                    </p>

                    {fieldErrors.vehicleId && <p className="mt-1 text-sm text-red-600">{fieldErrors.vehicleId}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowVehicleList(true)}
                    className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
                  >
                    Search Cars
                  </button>
                </div>
              </aside>
            </div>

            {showVehicleList && (
              <section className={`rounded-[28px] border p-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.55)] backdrop-blur-xl md:p-5 ${
                isNightTheme
                  ? "border-slate-200/15 bg-[linear-gradient(165deg,rgba(255,255,255,0.08),rgba(15,23,42,0.45))]"
                  : "border-amber-900/15 bg-[linear-gradient(165deg,rgba(255,255,255,0.94),rgba(255,247,237,0.9))]"
              }`}>
                <div className="flex flex-col gap-3 border-b border-black/5 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isNightTheme ? "text-amber-300" : "text-[var(--color-accent-deep)]"}`}>
                      Available Cars
                    </p>
                    <h3 className={`mt-2 text-xl font-black sm:text-2xl ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>
                      Choose the right ride for your dates
                    </h3>
                    <p className={`mt-1 text-sm ${isNightTheme ? "text-slate-300" : "text-zinc-600"}`}>
                      Larger vehicle cards, clearer details, and faster comparison.
                    </p>
                  </div>
                  {selectedVehicle && (
                    <div className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      isNightTheme
                        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                        : "border-amber-300/50 bg-amber-50 text-amber-900"
                    }`}>
                      Selected: {selectedVehicle.make} {selectedVehicle.model}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-3xl border border-white/50 bg-white/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                  {!form.pickupDatetime || !form.returnDatetime ? (
                    <p className="px-4 py-8 text-sm text-zinc-600">
                      Select pickup and return date/time to load available cars.
                    </p>
                  ) : loadingVehicles ? (
                    <p className="px-4 py-8 text-sm text-zinc-600">Loading available cars...</p>
                  ) : vehicles.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-zinc-600">
                      No available cars found for the selected dates.
                    </p>
                  ) : (
                    <div className="grid max-h-[34rem] gap-3 overflow-y-auto p-1 lg:grid-cols-2">
                      {vehicles.map((vehicle, index) => {
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
                            style={{ "--anim-delay": `${index * 45}ms` } as React.CSSProperties}
                            className={`group w-full rounded-[22px] border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/60 hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)] ${
                              isNightTheme
                                ? "border-slate-200/15 bg-[rgba(15,23,42,0.72)]"
                                : "border-zinc-200/80 bg-white/95"
                            } ${
                              isSelected
                                ? isNightTheme
                                  ? "border-amber-300/45 bg-[linear-gradient(155deg,rgba(245,158,11,0.14),rgba(15,23,42,0.82))] shadow-[inset_0_0_0_1px_rgba(252,211,77,0.25),0_20px_40px_-24px_rgba(245,158,11,0.35)]"
                                  : "border-amber-300 bg-amber-50/80 shadow-[inset_0_0_0_1px_rgba(245,191,98,0.35),0_20px_40px_-24px_rgba(120,53,15,0.32)]"
                                : ""
                            } animate-stagger`}
                          >
                            <div className="flex h-full flex-col gap-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`truncate text-lg font-bold ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>
                                    {vehicle.make} {vehicle.model}
                                  </p>
                                  <p className={`mt-1 text-sm ${isNightTheme ? "text-slate-300" : "text-zinc-600"}`}>
                                    Plate: {vehicle.plateNumber}
                                  </p>
                                </div>
                                <div className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                  isNightTheme ? "bg-white/10 text-amber-200" : "bg-amber-50 text-amber-900"
                                }`}>
                                  ${Number(vehicle.dailyRate || 0).toFixed(2)}/day
                                </div>
                              </div>

                              <img
                                src={vehicle.imageUrl ? `http://localhost:5000${vehicle.imageUrl}` : "/placeholder-vehicle.svg"}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="h-40 w-full rounded-2xl border border-black/5 object-cover shadow-sm"
                              />

                              <div className="flex flex-wrap gap-2 text-xs font-medium">
                                {vehicle.description && (
                                  <p className={`w-full text-sm leading-relaxed ${isNightTheme ? "text-slate-300" : "text-zinc-600"}`}>
                                    {vehicle.description}
                                  </p>
                                )}
                                <span className={`rounded-full px-2.5 py-1 ${isNightTheme ? "bg-amber-300/20 text-amber-100" : "bg-amber-100 text-amber-900"}`}>
                                  Usage: {formatUsageTypeLabel(vehicle.usageType)}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 ${isNightTheme ? "bg-white/10 text-slate-200" : "bg-zinc-100 text-zinc-700"}`}>
                                  Fuel: {vehicle.fuelType || "N/A"}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 ${isNightTheme ? "bg-white/10 text-slate-200" : "bg-zinc-100 text-zinc-700"}`}>
                                  Transmission: {vehicle.transmission || "N/A"}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 ${isNightTheme ? "bg-white/10 text-slate-200" : "bg-zinc-100 text-zinc-700"}`}>
                                  Passengers: {passengerCount ?? "N/A"}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 ${isNightTheme ? "bg-white/10 text-slate-200" : "bg-zinc-100 text-zinc-700"}`}>
                                  Daily Mileage: {vehicle.dailyMileage ?? "N/A"}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {form.pickupDatetime &&
                form.returnDatetime &&
                !loadingVehicles &&
                vehicles.length === 0 && (
                  <p className="md:col-span-2 xl:col-span-4 text-sm text-orange-700">
                    No vehicles are available for the selected date/time range.
                  </p>
                )}

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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                    required
                  />
                  {fieldErrors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.dateOfBirth}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Driver&apos;s License</label>
                  <input
                    name="driversLicenseNo"
                    value={form.driversLicenseNo}
                    onChange={handleChange}
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                  {fieldErrors.state && <p className="mt-1 text-sm text-red-600">{fieldErrors.state}</p>}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-zinc-700">Zip</label>
                  <input
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                    className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                    placeholder="+1 555 123 4567"
                    required
                  />
                  {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
                </div>

                {lookupInFlight && <p className="md:col-span-2 xl:col-span-4 text-sm text-zinc-600">Checking existing customer details...</p>}
                {lookupMessage && <p className="md:col-span-2 xl:col-span-4 text-sm text-emerald-700">{lookupMessage}</p>}

                <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/12 p-4 space-y-3 animate-stagger" style={{ "--anim-delay": "140ms" } as React.CSSProperties}>
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
                        className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                        className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
                        placeholder="4242 4242 4242 4242"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-sm font-medium text-zinc-700">Expiry (MM/YY)</label>
                      <input
                        name="expiry"
                        value={paymentForm.expiry}
                        onChange={handlePaymentInputChange}
                        className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                        className="w-full rounded-xl form-input-modern p-3 text-zinc-900"
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
                      className="attention-bounce w-full sm:w-auto rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {paying ? "Confirming Demo Payment..." : "Confirm Demo Payment"}
                    </button>
                    {form.paymentConfirmed && (
                      <span className="text-sm font-semibold text-emerald-900">Payment Confirmed</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-amber-900/15 bg-white/75 p-4 space-y-3 backdrop-blur animate-stagger" style={{ "--anim-delay": "200ms" } as React.CSSProperties}>
                  <p className="text-sm font-semibold text-zinc-900">Georgia Rental Terms Acceptance</p>
                  <p className="text-xs text-zinc-600">
                    This electronic acceptance applies to Booking #{form.paymentReference || "Pending"} for {selectedVehicle?.make} {selectedVehicle?.model}.
                  </p>
                  <div className="grid grid-cols-1 gap-3 text-xs text-zinc-600 md:grid-cols-2">
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
                      className="rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-amber-50"
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
                  className="attention-bounce md:col-span-2 xl:col-span-4 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 font-semibold text-[var(--color-ink)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? "Submitting Reservation..." : "Confirm Reservation"}
                </button>
              </>
            )}

            </div>

            {error && <p className="md:col-span-2 xl:col-span-4 text-sm text-red-700">{error}</p>}
            {success && <p className="md:col-span-2 xl:col-span-4 text-sm text-green-700">{success}</p>}
          </form>
        </section>

        <section className={`fade-up-delayed float-soft-delayed h-fit rounded-3xl border p-6 shadow-[0_30px_64px_-34px_rgba(245,191,98,0.85)] sm:p-8 lg:sticky lg:top-24 lg:col-span-1 ${
          isNightTheme
            ? "border-slate-200/20 bg-[linear-gradient(170deg,rgba(15,23,42,0.9),rgba(30,41,59,0.82))] text-slate-100"
            : "border-white/20 bg-[linear-gradient(170deg,rgba(249,240,223,0.97),rgba(253,246,233,0.93))] text-zinc-900"
        }`}>
          <h2 className="text-2xl font-bold">Reservation Preview</h2>
          <p className="mt-2 text-sm text-zinc-600">Live estimate based on your selected vehicle and dates.</p>

          {selectedVehicle && pricePreview ? (
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-amber-300/45 bg-white/85 p-4">
                <p className="text-sm text-zinc-500">Vehicle</p>
                <p className="text-lg font-semibold mt-1">
                  {selectedVehicle.make} {selectedVehicle.model}
                </p>
                <p className="text-sm text-zinc-500">Plate: {selectedVehicle.plateNumber}</p>
              </div>

              <div className="rounded-2xl border border-amber-300/45 bg-white/85 p-4 text-sm text-zinc-700 space-y-2">
                <div className="flex justify-between">
                  <span>
                    Rental (<em>${pricePreview.dailyRate.toFixed(2)} x {pricePreview.days} days</em>)
                  </span>
                  <span>${pricePreview.rentalSubtotal.toFixed(2)}</span>
                </div>
                {pricePreview.discountPercentage > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Long booking discount ({pricePreview.discountPercentage}%)</span>
                    <span>-${pricePreview.rentalDiscount.toFixed(2)}</span>
                  </div>
                )}
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
                <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-semibold text-zinc-900">
                  <span>Total</span>
                  <span>${pricePreview.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-600">
                Deposit is refundable and included in the total estimate.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
              Enter your details and choose dates to see available vehicles and pricing.
            </div>
          )}

          <p className="mt-6 text-xs text-zinc-500">
            Price preview is informational. Final totals are validated and calculated by the backend on submission.
          </p>
        </section>
      </div>

      <footer className={`fixed bottom-0 left-0 right-0 z-40 border-t px-3 py-2.5 text-center text-xs backdrop-blur-xl sm:px-4 sm:py-3 sm:text-sm ${
        isNightTheme
          ? "border-slate-300/20 bg-[rgba(10,16,30,0.88)] text-slate-100"
          : "border-amber-900/15 bg-[rgba(255,248,237,0.94)] text-zinc-900"
      }`}>
        <div className="mx-auto w-full max-w-7xl">
          <p className={`font-semibold ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>Need help with your reservation?</p>
          <div className="mt-1 flex flex-col items-center gap-1 sm:flex-row sm:flex-wrap sm:justify-center sm:items-center sm:gap-4">
            <a href="mailto:support@carsgidi.com" className={isNightTheme ? "text-slate-200 hover:text-white" : "text-zinc-800 hover:text-zinc-600"}>
              support@carsgidi.com
            </a>
            <a href="tel:+14702382358" className={isNightTheme ? "text-slate-200 hover:text-white" : "text-zinc-800 hover:text-zinc-600"}>
              +1 (470) 238-2358
            </a>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-24 right-3 z-[60] sm:right-4">
        {isFaqChatOpen && (
          <section
            className={`mb-3 w-[min(94vw,380px)] overflow-hidden rounded-2xl border shadow-[0_24px_60px_-34px_rgba(0,0,0,0.55)] backdrop-blur-xl ${
              isNightTheme
                ? "border-slate-300/20 bg-[rgba(15,23,42,0.94)]"
                : "border-amber-900/15 bg-[rgba(255,251,245,0.96)]"
            }`}
          >
            <header
              className={`flex items-center justify-between border-b px-4 py-3 ${
                isNightTheme
                  ? "border-slate-300/20 bg-white/5"
                  : "border-amber-900/10 bg-amber-50/80"
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${isNightTheme ? "text-slate-100" : "text-zinc-900"}`}>
                  Guest FAQ Assistant
                </p>
                <p className={`text-[11px] ${isNightTheme ? "text-slate-300" : "text-zinc-600"}`}>
                  Instant answers for common reservation questions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFaqChatOpen(false)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  isNightTheme ? "text-slate-200 hover:bg-white/10" : "text-zinc-600 hover:bg-white"
                }`}
              >
                Close
              </button>
            </header>

            <div
              ref={chatListRef}
              className={`max-h-72 space-y-2 overflow-y-auto px-3 py-3 ${
                isNightTheme ? "bg-[rgba(15,23,42,0.45)]" : "bg-white/70"
              }`}
            >
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-[var(--color-accent)] text-zinc-900"
                      : isNightTheme
                      ? "mr-auto bg-white/10 text-slate-100"
                      : "mr-auto bg-white text-zinc-800 border border-zinc-200/80"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="border-t border-black/5 px-3 py-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  "How does payment work?",
                  "Am I eligible for discount?",
                  "What documents are required?",
                ].map((quickQuestion) => (
                  <button
                    key={quickQuestion}
                    type="button"
                    onClick={() => handleQuickFaq(quickQuestion)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      isNightTheme
                        ? "bg-white/10 text-slate-100 hover:bg-white/15"
                        : "bg-amber-50 text-zinc-700 hover:bg-amber-100"
                    }`}
                  >
                    {quickQuestion}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFaqSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    isNightTheme
                      ? "border-slate-300/30 bg-white/5 text-slate-100 placeholder:text-slate-300 focus:border-amber-300/60"
                      : "border-amber-900/15 bg-white text-zinc-900 placeholder:text-zinc-500 focus:border-amber-400"
                  }`}
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:brightness-95"
                >
                  Send
                </button>
              </form>
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => setIsFaqChatOpen((prev) => !prev)}
          className="rounded-full border border-amber-300/45 bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-zinc-900 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5"
        >
          {isFaqChatOpen ? "Hide FAQ Chat" : "FAQ Chat"}
        </button>
      </div>
    </main>
  );
}
