const bookingService = require("../services/bookingService");
const { getAvailableVehicles, getVehicles } = require("./vehicleController");
const paymentGateway = require("../services/paymentGateway");
const { getDiscountSettings } = require("../services/discountSettingsService");

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "fleet-management/1.0 (public-reservation-geocoder)",
};

// Photon (komoot.io) — autocomplete-optimised OSM geocoder, no API key required
const PHOTON_BASE_URL = "https://photon.komoot.io";
const GEOCODE_RESPONSE_LIMIT = 10;

// Rough bounding box for the contiguous US + AK + HI
const US_BBOX = "-180,18,-65,72";

// ---------------------------------------------------------------------------
// Mapbox Geocoding (used when MAPBOX_API_KEY env var is set)
// ---------------------------------------------------------------------------
function mapMapboxFeature(feature) {
  const context = Array.isArray(feature?.context) ? feature.context : [];
  const find = (id) => context.find((c) => c.id?.startsWith(id))?.text || "";

  const placeName = feature?.place_name || "";
  const coords = feature?.center || [];
  const lon = coords[0] != null ? String(coords[0]) : "";
  const lat = coords[1] != null ? String(coords[1]) : "";

  // address_line is the first token before the first comma in place_name
  const addressLine = (feature?.place_name || "").split(",")[0]?.trim() || "";
  const city = find("place") || find("locality") || find("neighborhood");
  const state = find("region");
  const zip = find("postcode");

  return {
    id: String(feature?.id || ""),
    label: placeName,
    lat,
    lon,
    addressLine,
    city,
    state,
    zip,
  };
}

async function mapboxSearch(query, { limit = GEOCODE_RESPONSE_LIMIT } = {}) {
  const token = process.env.MAPBOX_API_KEY;
  if (!token) throw new Error("MAPBOX_API_KEY not set");

  const searchParams = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    country: "us",
    types: "address",
    limit: String(limit),
  });

  const encoded = encodeURIComponent(query);
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?${searchParams.toString()}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) throw new Error("Mapbox geocoding failed");

  const payload = await response.json();
  return Array.isArray(payload?.features) ? payload.features : [];
}

// ---------------------------------------------------------------------------
// Photon fallback
// ---------------------------------------------------------------------------
function mapPhotonFeature(feature) {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];
  const lon = coords[0] != null ? String(coords[0]) : "";
  const lat = coords[1] != null ? String(coords[1]) : "";

  const housenumber = props.housenumber || "";
  const street = props.street || props.name || "";
  const addressLine = [housenumber, street].filter(Boolean).join(" ").trim();
  const city = props.city || props.town || props.village || props.hamlet || props.municipality || "";
  const state = props.state || "";
  const zip = props.postcode || "";

  const labelParts = [addressLine, city, state, zip].filter(Boolean);
  const label = labelParts.length ? labelParts.join(", ") : (props.name || "");

  return {
    id: String(props.osm_id || ""),
    label,
    lat,
    lon,
    addressLine,
    city,
    state,
    zip,
  };
}

async function photonSearch(query, { limit = GEOCODE_RESPONSE_LIMIT } = {}) {
  const searchParams = new URLSearchParams({
    q: query,
    limit: String(limit),
    lang: "en",
    bbox: US_BBOX,
  });

  const response = await fetch(
    `${PHOTON_BASE_URL}/api/?${searchParams.toString()}`,
    { headers: { Accept: "application/json", "User-Agent": "fleet-management/1.0" } }
  );

  if (!response.ok) throw new Error("Address lookup failed");

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features.filter(
    (f) => (f?.properties?.countrycode || "").toLowerCase() === "us"
  );
}

async function getPublicGeocodeSearch(req, res, next) {
  try {
    const addressLine = String(req.query.addressLine || "").trim();
    const city = String(req.query.city || "").trim();
    const state = String(req.query.state || "").trim();
    const zip = String(req.query.zip || "").trim();
    const q = String(req.query.q || "").trim();

    const rawQuery = q || addressLine;
    if (!rawQuery) {
      res.json({ data: [] });
      return;
    }

    // Use Mapbox if key is configured, otherwise fall back to Photon
    if (process.env.MAPBOX_API_KEY) {
      try {
        const contextParts = [rawQuery, city, state, zip].filter(Boolean);
        const contextQuery = contextParts.join(", ");
        const features = await mapboxSearch(contextQuery, { limit: GEOCODE_RESPONSE_LIMIT });
        const results = features.map(mapMapboxFeature);
        res.json({ data: results.slice(0, GEOCODE_RESPONSE_LIMIT) });
        return;
      } catch {
        // fall through to Photon
      }
    }

    // Photon fallback
    const contextParts = [rawQuery, city, state, zip].filter(Boolean);
    const contextQuery = contextParts.join(", ");

    const [rawResults, contextResults] = await Promise.all([
      photonSearch(rawQuery, { limit: 10 }).catch(() => []),
      contextQuery !== rawQuery
        ? photonSearch(contextQuery, { limit: 10 }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const merged = [...contextResults, ...rawResults];
    const seen = new Set();
    const unique = [];
    for (const feature of merged) {
      const key = String(feature?.properties?.osm_id || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(mapPhotonFeature(feature));
    }

    res.json({ data: unique.slice(0, GEOCODE_RESPONSE_LIMIT) });
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

async function getPublicGuestBooking(req, res, next) {
  try {
    const booking = await bookingService.getPublicBookingByIdForGuest(
      req.params.id,
      {
        email: req.query.email,
        phone: req.query.phone,
        lastName: req.query.lastName,
      }
    );

    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function checkoutPublicGuestBooking(req, res, next) {
  try {
    const booking = await bookingService.checkoutBookingPublic(
      req.params.id,
      req.body,
      req.files || [],
      {
        email: req.body.email,
        phone: req.body.phone,
        lastName: req.body.lastName,
      }
    );

    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function checkinPublicGuestBooking(req, res, next) {
  try {
    const booking = await bookingService.checkinBookingPublic(
      req.params.id,
      req.body,
      req.files || [],
      {
        email: req.body.email,
        phone: req.body.phone,
        lastName: req.body.lastName,
      }
    );

    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function extendPublicGuestBooking(req, res, next) {
  try {
    const booking = await bookingService.extendBookingPublic(
      req.params.id,
      req.body,
      {
        email: req.body.email,
        phone: req.body.phone,
        lastName: req.body.lastName,
      }
    );

    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function getPublicPrecheckoutBooking(req, res, next) {
  try {
    const booking = await bookingService.getPrecheckoutBookingByToken(req.params.token);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function uploadPublicPrecheckoutDocument(req, res, next) {
  try {
    const payload = await bookingService.uploadPrecheckoutGuestDocument(
      req.params.token,
      req.body.documentType || req.query.documentType,
      req.file
    );

    res.status(201).json({ data: payload });
  } catch (error) {
    next(error);
  }
}

async function getPublicManageBooking(req, res, next) {
  try {
    const booking = await bookingService.getBookingByManageToken(req.params.token);
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function modifyPublicManageBooking(req, res, next) {
  try {
    const booking = await bookingService.rescheduleBookingByManageToken(
      req.params.token,
      req.body
    );
    res.json({ data: booking });
  } catch (error) {
    next(error);
  }
}

async function cancelPublicManageBooking(req, res, next) {
  try {
    const booking = await bookingService.cancelBookingByManageToken(req.params.token);
    res.json({ data: booking });
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

async function createPublicReservationIdentitySession(req, res, next) {
  try {
    const reservation = await bookingService.createPublicReservationIdentitySession(req.body);
    res.status(201).json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

async function finalizePublicReservation(req, res, next) {
  try {
    const reservation = await bookingService.finalizePublicReservation(req.params.id, req.body);
    res.json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

async function getPublicDiscountSettings(req, res, next) {
  try {
    const settings = await getDiscountSettings();
    res.json({ data: settings });
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
  getPublicVehicles: getVehicles,
  getPublicCustomerByContact,
  getPublicGuestBooking,
  checkoutPublicGuestBooking,
  checkinPublicGuestBooking,
  extendPublicGuestBooking,
  getPublicPrecheckoutBooking,
  uploadPublicPrecheckoutDocument,
  getPublicManageBooking,
  modifyPublicManageBooking,
  cancelPublicManageBooking,
  getPublicDiscountSettings,
  getPublicGeocodeSearch,
  getPublicGeocodeReverse,
  createTestPayment,
  createPublicReservation,
  createPublicReservationIdentitySession,
  finalizePublicReservation,
};
