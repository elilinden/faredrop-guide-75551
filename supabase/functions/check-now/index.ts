// Deno Edge Function: POST /functions/v1/check-now
// body: { tripId: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://faredrop.lovable.app";

const AMADEUS_ENV = (Deno.env.get("AMADEUS_ENV") || "test") === "production" ? "production" : "test";
const AMADEUS_HOST = AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

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

const manageTripLinks: Record<string, string> = {
  AA: "https://www.aa.com/reservation/view/find-your-reservation",
  DL: "https://www.delta.com/my-trips/trip-details",
  UA: "https://www.united.com/en/us/manageres/mytrips",
  AS: "https://www.alaskaair.com/booking/reservation-lookup",
};

const airlineNames: Record<string, string> = {
  AA: "American Airlines",
  DL: "Delta Air Lines",
  UA: "United Airlines",
  AS: "Alaska Airlines",
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

  // Build Google Flights URL with enhanced format for better compatibility
  // Using the hash-based deep link format with additional parameters
  const paxNumber = Number(pax);
  const paxCount = Number.isFinite(paxNumber) && paxNumber > 0 ? Math.floor(paxNumber) : 1;

  const googleUrl = new URL("https://www.google.com/flights");
  googleUrl.searchParams.set("hl", "en");
  googleUrl.searchParams.set("curr", "USD");
  googleUrl.searchParams.set("gl", "US");
  googleUrl.hash = `flt=${googleFltSegments.join("*")};px:${paxCount}`;
  const google = googleUrl.toString();
  const googlePassengerSuffix = `;px:${paxCount}`;
  const google = `https://www.google.com/travel/flights?hl=en#flt=${googleFltSegments.join("*")}${googlePassengerSuffix}`;
  
  let google: string;
  if (ret) {
    // Round trip format with more parameters for reliability
    google = `https://www.google.com/travel/flights?hl=en&curr=USD#flt=${from}.${to}.${depart}*${to}.${from}.${ret};c:e;e:1;a:${paxCount};sd:1;t:f`;
  } else {
    // One-way format with more parameters for reliability
    google = `https://www.google.com/travel/flights?hl=en&curr=USD#flt=${from}.${to}.${depart};c:e;e:1;a:${paxCount};sd:1;t:f`;
  }

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

async function sendPriceDropEmail(
  supabase: any,
  trip: any,
  diff: number,
  publicPrice: number,
): Promise<boolean> {
  if (!resend) {
    console.log("[check-now] Resend not configured, skipping email");
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", trip.user_id)
    .maybeSingle();

  if (!profile?.email) {
    console.log(`[check-now] No email found for user ${trip.user_id}`);
    return false;
  }

  const airlineCode = (trip.airline || "").toUpperCase();
  const airlineName = airlineNames[airlineCode] || trip.airline || "your airline";
  const manageTripUrl = manageTripLinks[airlineCode] || null;
  const tripUrl = `${appBaseUrl}/trips/${trip.id}`;

  const requiresFirstName = ["AA", "DL"].includes(airlineCode);
  const nameFields = requiresFirstName
    ? `PNR: ${trip.confirmation_code || "N/A"} | First name: ${trip.first_name || "N/A"} | Last name: ${trip.last_name || "N/A"}`
    : `PNR: ${trip.confirmation_code || "N/A"} | Last name: ${trip.last_name || "N/A"}`;

  const manageTripButton = manageTripUrl
    ? `<a href="${manageTripUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 8px;">Open ${airlineName} Manage Trip</a>`
    : "";

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">
        💰 Price drop found on your ${airlineName || "trip"}
      </h1>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; color: #374151;">
          We just checked and public prices look about <strong style="color: #10b981;">$${diff.toFixed(2)} lower</strong> than what you paid.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
          You paid: $${Number(trip.paid_total).toFixed(2)} → Current: ~$${publicPrice.toFixed(2)}
        </p>
      </div>

      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        To see your actual airline credit, open the airline's Change screen:
      </p>

      <div style="margin: 20px 0;">
        ${manageTripButton}
        <a href="${tripUrl}" style="display: inline-block; background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Open in FareDrop
        </a>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
          You'll need these to access your trip:
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f; font-family: monospace;">
          ${nameFields}
        </p>
      </div>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
        <strong>Important:</strong> Alerts are based on public prices; the airline's Change preview is the source of truth. This is a ${trip.last_confidence || "route-estimate"} signal.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "FareDrop Guide <alerts@updates.lovable.app>",
      to: [profile.email],
      subject: `Price drop found on your ${airlineName} trip: ~$${diff.toFixed(2)} cheaper`,
      html,
    });
    console.log(`[check-now] Email sent to ${profile.email}`);
    return true;
  } catch (error) {
    console.error("[check-now] Error sending email:", error);
    return false;
  }
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

    const now = new Date();
    const update: any = {
      last_checked_at: now.toISOString(),
    };

    let emailSent = false;

    if (fare) {
      update.last_public_price = fare.price;
      update.last_public_currency = fare.currency;
      update.last_public_provider = "amadeus";
      update.last_confidence = fare.confidence;

      const paidTotal = typeof trip.paid_total === "number" ? trip.paid_total : Number(trip.paid_total);
      const hasPaidTotal = Number.isFinite(paidTotal) && paidTotal > 0;
      const diff = hasPaidTotal ? paidTotal - fare.price : null;

      await supabase.from("price_checks").insert({
        trip_id: trip.id,
        observed_price: fare.price,
        diff_vs_paid: diff,
        confidence: fare.confidence,
      });

      if (hasPaidTotal && diff !== null && diff > 0) {
        const { data: userPrefs } = await supabase
          .from("user_preferences")
          .select("email_alerts_enabled, min_drop_threshold")
          .eq("user_id", user.id)
          .maybeSingle();

        const userThreshold = userPrefs?.min_drop_threshold ?? 10;
        const tripThreshold = trip.monitor_threshold ?? 1.0;
        const threshold = Math.max(userThreshold, tripThreshold);

        const lastSignalAt = trip.last_signal_at ? new Date(trip.last_signal_at) : null;
        const hoursSinceLastSignal = lastSignalAt
          ? (now.getTime() - lastSignalAt.getTime()) / (1000 * 60 * 60)
          : Infinity;

        const emailEnabled = userPrefs?.email_alerts_enabled !== false;

        if (emailEnabled && diff >= threshold && hoursSinceLastSignal >= 24) {
          emailSent = await sendPriceDropEmail(supabase, trip, diff, fare.price);
          if (emailSent) {
            update.last_signal_at = now.toISOString();
          }
        }
      }
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
        email_sent: emailSent,
        message: fare ? "Price check complete." : "No fares found.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[check-now] ERROR", e);
    return error(500, "Internal error");
  }
});
