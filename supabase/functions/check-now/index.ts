import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function missingForPricing(trip: any) {
  const miss: string[] = [];
  if (!trip.origin_iata || !/^[A-Z]{3}$/.test(trip.origin_iata)) miss.push("origin_iata");
  if (!trip.destination_iata || !/^[A-Z]{3}$/.test(trip.destination_iata)) miss.push("destination_iata");
  if (!trip.departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(trip.departure_date)) miss.push("departure_date");
  return miss;
}

const AMADEUS_ENV = (Deno.env.get("AMADEUS_ENV") || "test") === "production" ? "production" : "test";
const AMADEUS_HOST = AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

/**
 * Get Amadeus access token.
 * Preferred: AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET (OAuth).
 * Fallback:  AMADEUS_API_KEY (treat as a pre-issued bearer token you manage).
 */
async function getAmadeusAccessToken(): Promise<string> {
  const clientId = Deno.env.get("AMADEUS_CLIENT_ID");
  const clientSecret = Deno.env.get("AMADEUS_CLIENT_SECRET");
  const bearer = Deno.env.get("AMADEUS_API_KEY"); // if you stored an access token under this name

  if (clientId && clientSecret) {
    const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amadeus auth failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.access_token as string;
  }

  if (bearer) {
    // Use as-is (must be a valid current bearer token if you choose this route).
    return bearer.startsWith("Bearer ") ? bearer.slice(7) : bearer;
  }

  throw new Error("Missing Amadeus credentials: set AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET or AMADEUS_API_KEY.");
}

/**
 * Extracts trip params from trip fields or segments.
 * Prioritizes direct trip fields, falls back to segments.
 */
function mapTripToSearchParams(trip: any) {
  console.log('[mapTripToSearchParams] Input trip:', {
    id: trip.id,
    origin_iata: trip.origin_iata,
    destination_iata: trip.destination_iata,
    departure_date: trip.departure_date,
    segments_count: trip.segments?.length || 0
  });

  // Try direct trip fields first
  let origin = trip.origin_iata;
  let destination = trip.destination_iata;
  let departureDate = trip.departure_date;
  let returnDate = trip.return_date;

  // Fall back to segments if direct fields are missing
  const segments = trip.segments || [];
  if ((!origin || !destination || !departureDate) && segments.length > 0) {
    const sortedSegments = [...segments].sort((a: any, b: any) => 
      new Date(a.depart_datetime).getTime() - new Date(b.depart_datetime).getTime()
    );

    const firstSegment = sortedSegments[0];
    const lastSegment = sortedSegments[sortedSegments.length - 1];

    origin = origin || firstSegment.depart_airport;
    destination = destination || lastSegment.arrive_airport;
    departureDate = departureDate || firstSegment.depart_datetime?.split('T')[0];
    // For round trips, use last segment's DEPARTURE date (when return flight takes off)
    returnDate = returnDate || (sortedSegments.length > 1 ? lastSegment.depart_datetime?.split('T')[0] : undefined);
  }

  // Normalize if origin equals destination but we have segments (round-trip stored in denormalized fields)
  if (origin && destination && origin === destination && segments.length > 0) {
    const outboundDest = segments[0]?.arrive_airport;
    if (outboundDest && outboundDest !== origin) {
      destination = outboundDest;
    }
  }

  // Ensure chronological order: drop invalid returnDate
  if (returnDate && departureDate) {
    const d1 = new Date(departureDate);
    const d2 = new Date(returnDate);
    if (!(d2 > d1)) {
      console.warn('[mapTripToSearchParams] returnDate is not after departureDate; ignoring returnDate', { departureDate, returnDate });
      returnDate = undefined;
    }
  }

  const adults = trip.adults ?? 1;
  const cabin = trip.cabin ?? trip.brand ?? undefined;

  console.log('[mapTripToSearchParams] Extracted:', {
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    cabin
  });

  return { origin, destination, departureDate, returnDate, adults, cabin };
}

/**
 * Calls Amadeus Flight Offers Search and returns a simple public fare.
 */
async function fetchPublicFare(
  trip: any,
): Promise<{ price: number; confidence: "high" | "low"; currency?: string } | null> {
  const { origin, destination, departureDate, returnDate, adults, cabin } = mapTripToSearchParams(trip);

  if (!origin || !destination || !departureDate) {
    console.error("[fetchPublicFare] Missing required fields:", {
      trip_id: trip?.id,
      origin,
      destination,
      departureDate,
      trip_data: {
        origin_iata: trip.origin_iata,
        destination_iata: trip.destination_iata,
        departure_date: trip.departure_date,
        segments: trip.segments?.length || 0
      }
    });
    return null;
  }

  // Validate date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depDate = new Date(departureDate);
  
  if (depDate < today) {
    console.error("[fetchPublicFare] Departure date is in the past:", {
      trip_id: trip?.id,
      departureDate,
      today: today.toISOString().split('T')[0]
    });
    return null;
  }

  console.log("[fetchPublicFare] Calling Amadeus with:", { origin, destination, departureDate, returnDate });

  try {
    const token = await getAmadeusAccessToken();

    const url = new URL(`${AMADEUS_HOST}/v2/shopping/flight-offers`);
    url.searchParams.set("originLocationCode", origin);
    url.searchParams.set("destinationLocationCode", destination);
    url.searchParams.set("departureDate", departureDate);
    if (returnDate) url.searchParams.set("returnDate", returnDate);
    url.searchParams.set("adults", String(adults ?? 1));
    if (cabin) url.searchParams.set("travelClass", cabin);
    url.searchParams.set("currencyCode", "USD");
    url.searchParams.set("max", "10");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[fetchPublicFare] Amadeus search failed:", res.status, text);
      return null;
    }

    const data = (await res.json()) as {
      data?: Array<{ price?: { grandTotal?: string; currency?: string } }>;
    };

    const first = data?.data?.[0];
    const total = first?.price?.grandTotal;
    const currency = first?.price?.currency ?? "USD";

    if (!total) return null;

    return {
      price: Number(total),
      currency,
      confidence: "high",
    };
  } catch (e) {
    console.error("[fetchPublicFare] Error:", e);
    // Dev fallback if enabled
    if (Deno.env.get("ALLOW_DUMMY_PRICES") === "true") {
      return { price: 123.45, currency: "USD", confidence: "low" };
    }
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { tripId } = await req.json();
    if (!tripId) {
      throw new Error("Missing tripId");
    }

    // Fetch trip with segments and verify ownership
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*, segments(*)")
      .eq("id", tripId)
      .eq("user_id", user.id)
      .single();

    if (tripError || !trip) {
      throw new Error("Trip not found");
    }

    // Validate that trip has required pricing fields or segments
    const miss = missingForPricing(trip);
    if (miss.length) {
      // If no direct fields, try segments fallback
      if (!trip.segments || trip.segments.length === 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "missing_segments",
            missing: miss,
            message: "Add flight segments (origin, destination, date) to enable price checks."
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Rate limit: max 1 manual check per 2 minutes
    if (trip.last_checked_at) {
      const lastChecked = new Date(trip.last_checked_at);
      const now = new Date();
      const minutesSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60);

      if (minutesSinceCheck < 2) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: "Please wait 2 minutes between manual checks",
            retryAfter: Math.ceil(2 - minutesSinceCheck),
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Fetch public fare (Amadeus or dummy fallback)
    const publicFare = await fetchPublicFare(trip);

    // Update trip
    const updateData: any = {
      last_checked_at: new Date().toISOString(),
    };

    if (publicFare) {
      const diff = (trip.paid_total ?? 0) - publicFare.price;

      updateData.last_public_price = publicFare.price;
      updateData.last_public_currency = publicFare.currency ?? "USD";
      updateData.last_confidence = publicFare.confidence;

      // Use service role for inserting to price_checks
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

      await supabaseService.from("price_checks").insert({
        trip_id: trip.id,
        observed_price: publicFare.price,
        diff_vs_paid: diff,
        confidence: publicFare.confidence,
        currency: publicFare.currency ?? "USD",
        provider: "amadeus",
      });
    }

    const { error: updateError } = await supabase.from("trips").update(updateData).eq("id", tripId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        last_checked_at: updateData.last_checked_at,
        last_public_price: updateData.last_public_price ?? null,
        last_confidence: updateData.last_confidence ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[check-now] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
