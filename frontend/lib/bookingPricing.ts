export type BookingDiscountTier = {
  minDays: number;
  percentage: number;
};

export const SERVICE_CHARGE_PER_DAY = 15;

export const DEFAULT_BOOKING_DISCOUNT_TIERS: BookingDiscountTier[] = [
  { minDays: 14, percentage: 15 },
  { minDays: 7, percentage: 10 },
  { minDays: 3, percentage: 5 },
];

export function roundToTwo(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateRentalDays(pickupDatetime: string, returnDatetime: string) {
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

export function normalizeBookingDiscountTiers(
  tiers?: BookingDiscountTier[] | null
) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return DEFAULT_BOOKING_DISCOUNT_TIERS;
  }

  return tiers
    .map((tier) => ({
      minDays: Number(tier?.minDays || 0),
      percentage: Math.min(Math.max(Number(tier?.percentage || 0), 0), 100),
    }))
    .filter((tier) => Number.isFinite(tier.minDays) && tier.minDays > 0)
    .sort((left, right) => right.minDays - left.minDays);
}

export function getBookingDiscountPercent(
  days: number,
  tiers: BookingDiscountTier[] = DEFAULT_BOOKING_DISCOUNT_TIERS
) {
  const normalizedTiers = normalizeBookingDiscountTiers(tiers);
  const tier = normalizedTiers.find(
    (item) => days >= item.minDays && item.percentage > 0
  );
  return tier?.percentage || 0;
}

export function calculateBookingPricePreview({
  pickupDatetime,
  returnDatetime,
  dailyRate,
  discountTiers = DEFAULT_BOOKING_DISCOUNT_TIERS,
}: {
  pickupDatetime: string;
  returnDatetime: string;
  dailyRate: number;
  discountTiers?: BookingDiscountTier[];
}) {
  const days = calculateRentalDays(pickupDatetime, returnDatetime);

  if (days <= 0) {
    return null;
  }

  const normalizedDailyRate = Number(dailyRate || 0);
  const rentalSubtotal = roundToTwo(normalizedDailyRate * days);
  const discountPercentage = getBookingDiscountPercent(days, discountTiers);
  const rentalDiscount = roundToTwo(rentalSubtotal * (discountPercentage / 100));
  const discountedRentalSubtotal = roundToTwo(rentalSubtotal - rentalDiscount);
  const serviceCharge = roundToTwo(SERVICE_CHARGE_PER_DAY * days);
  const subtotal = roundToTwo(discountedRentalSubtotal + serviceCharge);
  const tax = roundToTwo(subtotal * 0.07);
  const deposit = 100;
  const total = roundToTwo(subtotal + tax + deposit);

  return {
    days,
    dailyRate: normalizedDailyRate,
    rentalSubtotal,
    rentalDiscount,
    discountedRentalSubtotal,
    discountPercentage,
    serviceCharge,
    subtotal,
    tax,
    deposit,
    total,
  };
}