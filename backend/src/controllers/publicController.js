const bookingService = require("../services/bookingService");
const { getAvailableVehicles } = require("./vehicleController");
const paymentGateway = require("../services/paymentGateway");

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "fleet-management/1.0 (public-reservation-geocoder)",
};

function pickCity(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    ""
  );
}

function pickStreet(address = {}) {
  const streetName =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.residential ||
    address.path ||
    "";
  const houseNumber = address.house_number || "";
  return [houseNumber, streetName].filter(Boolean).join(" ").trim();
}

function mapGeocodeResult(item) {
  const address = item?.address || {};
  return {
    id: String(item?.place_id || ""),
    label: item?.display_name || "",
    lat: item?.lat || "",
    lon: item?.lon || "",
    addressLine: pickStreet(address),
    city: pickCity(address),
    state: address.state || "",
    zip: address.postcode || "",
  };
}

async function nominatimSearch(params) {
  const searchParams = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "10",
    dedupe: "0",
    ...params,
  });

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?${searchParams.toString()}`,
    {
      headers: NOMINATIM_HEADERS,
    }
  );

  if (!response.ok) {
    throw new Error("Address lookup failed");
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function getPublicGeocodeSearch(req, res, next) {
  try {
    const addressLine = String(req.query.addressLine || "").trim();
    const city = String(req.query.city || "").trim();
    const state = String(req.query.state || "").trim();
    const zip = String(req.query.zip || "").trim();
    const q = String(req.query.q || "").trim();

    if (!addressLine && !q) {
      res.json({ data: [] });
      return;
    }

    const structuredParams = {
      street: addressLine || undefined,
      city: city || undefined,
      state: state || undefined,
      postalcode: zip || undefined,
      countrycodes: "us",
    };

    const freeformQuery =
      q || [addressLine, city, state, zip, "USA"].filter(Boolean).join(", ");

    const [structuredResults, freeformResults] = await Promise.all([
      nominatimSearch(structuredParams),
      nominatimSearch({ q: freeformQuery, countrycodes: "us" }),
    ]);

    const merged = [...structuredResults, ...freeformResults];
    const uniqueByPlaceId = [];
    const seen = new Set();

    for (const item of merged) {
      const key = String(item?.place_id || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueByPlaceId.push(mapGeocodeResult(item));
    }

    res.json({ data: uniqueByPlaceId.slice(0, 10) });
  } catch (error) {
    next(error);
  }
}

async function getPublicGeocodeReverse(req, res, next) {
  try {
    const lat = String(req.query.lat || "").trim();
    const lon = String(req.query.lon || "").trim();

    if (!lat || !lon) {
      res.status(400).json({ message: "lat and lon are required" });
      return;
    }

    const searchParams = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      zoom: "18",
      lat,
      lon,
    });

    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?${searchParams.toString()}`,
      {
        headers: NOMINATIM_HEADERS,
      }
    );

    if (!response.ok) {
      throw new Error("Reverse geolocation failed");
    }

    const payload = await response.json();
    const mapped = mapGeocodeResult(payload);

    res.json({ data: mapped.id ? mapped : null });
  } catch (error) {
    next(error);
  }
}

async function getPublicCustomerByContact(req, res, next) {
  try {
    const customer = await bookingService.findPublicCustomerByContact({
      email: req.query.email,
      phone: req.query.phone,
    });
    res.json({ data: customer || null });
  } catch (error) {
    next(error);
  }
}

async function createPublicReservation(req, res, next) {
  try {
    const reservation = await bookingService.createPublicReservation(req.body);
    res.status(201).json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

async function createTestPayment(req, res, next) {
  try {
    const payment = paymentGateway.charge(req.body);
    res.status(201).json({ data: payment });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPublicAvailableVehicles: getAvailableVehicles,
  getPublicCustomerByContact,
  getPublicGeocodeSearch,
  getPublicGeocodeReverse,
  createTestPayment,
  createPublicReservation,
};
