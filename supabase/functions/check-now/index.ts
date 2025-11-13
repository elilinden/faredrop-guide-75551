// Deno Edge Function: POST /functions/v1/check-now
// body: { tripId: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const AMADEUS_ENV = (Deno.env.get("AMADEUS_ENV") || "test") === "production" ? "production" : "test";
const AMADEUS_HOST = AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function error(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* -----------------------------------------------------------
   FIELD VALIDATION & NORMALIZATION
----------------------------------------------------------- */

function missingForPricing(trip: any) {
  const miss: string[] = [];
  if (!trip.origin_iata) miss.push("origin_iata");
  if (!trip.destination_iata) miss.push("destination_iata");
  if (!trip.depart_date) miss.push("depart_date");
  return miss;
}

function mapTrip(trip: any) {
  // Map cabin class to Amadeus-accepted values
  const cabinMap: Record<string, string> = {
    'economy': 'ECONOMY',
    'premium_economy': 'PREMIUM_ECONOMY',
    'business': 'BUSINESS',
    'first': 'FIRST',
  };
  
  const cabin = trip.cabin ? cabinMap[trip.cabin.toLowerCase()] : undefined;
  
  return {
    origin: trip.origin_iata,
    destination: trip.destination_iata,
    departureDate: trip.depart_date,
    returnDate: trip.return_date,
    adults: trip.adults || 1,
    cabin,
  };
}

/* -----------------------------------------------------------
   AMADEUS AUTH
----------------------------------------------------------- */

async function getAmadeusToken() {
  const id = Deno.env.get("AMADEUS_CLIENT_ID");
  const sec = Deno.env.get("AMADEUS_CLIENT_SECRET");

  const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id!,
      client_secret: sec!,
    }),
  });

  if (!res.ok) throw new Error("Amadeus auth failed");
  const data = await res.json();
  return data.access_token as string;
}

/* -----------------------------------------------------------
   MAIN PRICE FETCHER — RETURNS LOWEST VALID FARE
----------------------------------------------------------- */

async function fetchPublicFare(trip: any) {
  const { origin, destination, departureDate, returnDate, adults, cabin } = mapTrip(trip);

  const token = await getAmadeusToken();

  const url = new URL(`${AMADEUS_HOST}/v2/shopping/flight-offers`);
  url.searchParams.set("originLocationCode", origin);
  url.searchParams.set("destinationLocationCode", destination);
  url.searchParams.set("departureDate", departureDate);
  if (returnDate) url.searchParams.set("returnDate", returnDate);
  url.searchParams.set("adults", String(adults));
  if (cabin) url.searchParams.set("travelClass", cabin);
  url.searchParams.set("currencyCode", "USD");
  url.searchParams.set("max", "20");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("Amadeus error:", res.status, await res.text());
    return null;
  }

  const payload = await res.json();
  const offers = payload?.data || [];

  if (!Array.isArray(offers) || offers.length === 0) return null;

  /* -------------------------------------------------------
     EXACT MODE
  ------------------------------------------------------- */
  if (trip.price_mode === "exact" && trip.segments?.length) {
    const matches = offers.filter((offer: any) => {
      const segs = offer.itineraries.flatMap((i: any) => i.segments) || [];
      if (segs.length !== trip.segments.length) return false;

      return segs.every((seg: any, idx: number) => {
        const orig = trip.segments[idx];
        return seg.carrierCode === orig.carrier && String(seg.number) === String(orig.flight_number);
      });
    });

    if (matches.length === 0) return null;

    const best = matches
      .map((o: any) => Number(o.price.grandTotal))
      .filter((n: number) => n > 0)
      .sort((a: number, b: number) => a - b)[0];

    if (!best) return null;

    return {
      price: best,
      currency: "USD",
      confidence: "exact-flight",
    } as const;
  }

  /* -------------------------------------------------------
     SIMILAR MODE — LOWEST PRICE ON ROUTE
  ------------------------------------------------------- */

  const best = offers
    .map((o: any) => Number(o.price.grandTotal))
    .filter((n: number) => n > 0)
    .sort((a: number, b: number) => a - b)[0];

  if (!best) return null;

  return {
    price: best,
    currency: "USD",
    confidence: "route-estimate",
  } as const;
}

/* -----------------------------------------------------------
   BOOKING / DEEP-LINK GENERATOR
----------------------------------------------------------- */

type BookingUrls = {
  google: string | null;
  airlineLink: string | null;
};

function buildBookingUrls(trip: any): BookingUrls {
  const { origin, destination, departureDate, returnDate, adults } = mapTrip(trip);

  if (!origin || !destination || !departureDate) {
    return { google: null, airlineLink: null };
  }

  const from = String(origin).toUpperCase();
  const to = String(destination).toUpperCase();
  const depart = departureDate;
  const ret = returnDate || null;
  const pax = adults ?? 1;

  const googleQuery = `Flights from ${from} to ${to} on ${depart}`;
  const google = `https://www.google.com/travel/flights?q=${encodeURIComponent(googleQuery)}`;

  let airlineLink: string | null = null;
  const airline = (trip.airline || "").toUpperCase();

  switch (airline) {
    case "DL": {
      const tripType = ret ? "ROUND_TRIP" : "ONE_WAY";
      airlineLink =
        `https://www.delta.com/flight-search/search?tripType=${tripType}` +
        `&originCity=${from}&destinationCity=${to}&departureDate=${depart}` +
        (ret ? `&returnDate=${ret}` : "") +
        `&adults=${pax}&cabinMain=true`;
      break;
    }

    case "AA": {
      airlineLink =
        `https://www.aa.com/booking/search?originCity=${from}` +
        `&destinationCity=${to}&departureDate=${depart}` +
        (ret ? `&returnDate=${ret}` : "") +
        `&passengers=${pax}`;
      break;
    }

    case "UA": {
      airlineLink =
        `https://www.united.com/en/us/fsr/choose-flights?f=${from}` +
        `&t=${to}&d=${depart}` +
        (ret ? `&r=${ret}` : "") +
        `&px=${pax}&cabin=econ`;
      break;
    }

    case "AS": {
      airlineLink =
        `https://www.alaskaair.com/booking/search?from=${from}` +
        `&to=${to}&departureDate=${depart}` +
        (ret ? `&returnDate=${ret}` : "") +
        `&numAdults=${pax}`;
      break;
    }

    default:
      airlineLink = null;
  }

  return { google, airlineLink };
}

/* -----------------------------------------------------------
   MAIN SERVE HANDLER
----------------------------------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return error(405, "Use POST");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return error(401, "Missing authorization token");

    const body = await req.json().catch(() => ({}) as any);
    const { tripId } = body;
    if (!tripId) return error(400, "Missing tripId");

    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return error(401, "Not authenticated");

    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select(`*, segments(*)`)
      .eq("id", tripId)
      .eq("user_id", user.id)
      .single();

    if (tripErr || !trip) return error(404, "Trip not found");

    const miss = missingForPricing(trip);
    if (miss.length) return error(400, "Trip missing required fields: " + miss.join(", "));

    const fare = await fetchPublicFare(trip);
    const { google, airlineLink } = buildBookingUrls(trip);

    const update: any = {
      last_checked_at: new Date().toISOString(),
    };

    if (fare) {
      update.last_public_price = fare.price;
      update.last_public_currency = fare.currency;
      update.last_public_provider = "amadeus";
      update.last_confidence = fare.confidence;

      await supabase.from("price_checks").insert({
        trip_id: trip.id,
        observed_price: fare.price,
        diff_vs_paid: trip.paid_total ? trip.paid_total - fare.price : null,
        confidence: fare.confidence,
      });
    }

    await supabase.from("trips").update(update).eq("id", trip.id);

    return new Response(
      JSON.stringify({
        ok: true,
        observed_price: fare?.price ?? null,
        last_public_price: update.last_public_price ?? null,
        last_confidence: update.last_confidence ?? null,
        booking_url: airlineLink || google,
        google_flights_url: google,
        airline_booking_url: airlineLink,
        message: fare ? "Price check complete." : "No fares found.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[check-now] ERROR", e);
    return error(500, "Internal error");
  }
});
