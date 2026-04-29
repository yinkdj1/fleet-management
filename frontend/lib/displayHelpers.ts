export type CustomerDisplay = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type VehicleDisplay = {
  make?: string | null;
  model?: string | null;
};

export function formatCustomerName(customer?: CustomerDisplay | null) {
  if (!customer) return "";

  const firstName = String(customer.firstName || "").trim();
  const lastName = String(customer.lastName || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (fullName) return fullName;
  if (customer.email) return String(customer.email).trim();
  if (customer.phone) return String(customer.phone).trim();

  return "";
}

export function formatVehicleLabel(vehicle?: VehicleDisplay | null) {
  if (!vehicle) return "";

  const make = String(vehicle.make || "").trim();
  const model = String(vehicle.model || "").trim();

  return [make, model].filter(Boolean).join(" ");
}
