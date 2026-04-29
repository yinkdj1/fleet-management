export type BookingDiscountTier = {
  minDays: number;
  percentage: number;
};

export const SERVICE_CHARGE_PER_DAY = 15;
export const PROTECTION_PLAN_FEE_PER_DAY = 0;
export const TAX_PERCENTAGE = 7;
export const DEFAULT_BOOKING_DEPOSIT_AMOUNT = 100;

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
  depositAmount = DEFAULT_BOOKING_DEPOSIT_AMOUNT,
  servicePlatformFeePerDay = SERVICE_CHARGE_PER_DAY,
  protectionPlanFeePerDay = PROTECTION_PLAN_FEE_PER_DAY,
  taxPercentage = TAX_PERCENTAGE,
}: {
  pickupDatetime: string;
  returnDatetime: string;
  dailyRate: number;
  discountTiers?: BookingDiscountTier[];
  depositAmount?: number;
  servicePlatformFeePerDay?: number;
  protectionPlanFeePerDay?: number;
  taxPercentage?: number;
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
  const normalizedServicePlatformFeePerDay = Math.max(
    Number(servicePlatformFeePerDay || 0),
    0
  );
  const normalizedProtectionPlanFeePerDay = Math.max(
    Number(protectionPlanFeePerDay || 0),
    0
  );
  const normalizedTaxPercentage = Math.min(
    Math.max(Number(taxPercentage || 0), 0),
    100
  );
  const serviceCharge = roundToTwo(normalizedServicePlatformFeePerDay * days);
  const protectionPlanFee = roundToTwo(normalizedProtectionPlanFeePerDay * days);
  const chargeableSubtotal = roundToTwo(
    discountedRentalSubtotal + serviceCharge + protectionPlanFee
  );
  const subtotal = rentalSubtotal;
  const tax = roundToTwo(chargeableSubtotal * (normalizedTaxPercentage / 100));
  const deposit = roundToTwo(Math.max(Number(depositAmount || 0), 0));
  const total = roundToTwo(chargeableSubtotal + tax + deposit);

  return {
    days,
    rentalDays: days,
    dailyRate: normalizedDailyRate,
    rentalSubtotal,
    rentalDiscount,
    discountAmount: rentalDiscount,
    discountedRentalSubtotal,
    discountPercentage,
    serviceCharge,
    servicePlatformFeePerDay: normalizedServicePlatformFeePerDay,
    protectionPlanFee,
    protectionPlanFeePerDay: normalizedProtectionPlanFeePerDay,
    chargeableSubtotal,
    subtotal,
    taxPercentage: normalizedTaxPercentage,
    tax,
    deposit,
    depositAmount: deposit,
    total,
  };
}