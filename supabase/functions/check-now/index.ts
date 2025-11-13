// Deno Edge Function: POST /functions/v1/check-now
// body: { tripId: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const AMADEUS_ENV = (Deno.env.get("AMADEUS_ENV") || "test") === "production" ? "production" : "test";
const AMADEUS_HOST = AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

function error(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function missingForPricing(trip: any) {
  const miss: string[] = [];
  if (!trip.origin_iata || !/^[A-Z]{3}$/.test(trip.origin_iata)) miss.push("origin_iata");
  if (!trip.destination_iata || !/^[A-Z]{3}$/.test(trip.destination_iata)) miss.push("destination_iata");
  if (!trip.departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(trip.departure_date)) miss.push("departure_date");
  return miss;
}

function mapTripToSearchParams(trip: any) {
  let origin = trip.origin_iata ?? trip.from_iata ?? trip.origin ?? trip.from;
  let destination = trip.destination_iata ?? trip.to_iata ?? trip.destination ?? trip.to;
  let departureDate = trip.departure_date ?? trip.depart_date ?? trip.outbound_date;
  let returnDate = trip.return_date ?? trip.inbound_date;

  if ((!origin || !destination || !departureDate) && trip.segments?.length) {
    const first = trip.segments[0];
    const last = trip.segments[trip.segments.length - 1];
    origin = origin || first?.depart_airport;
    destination = destination || last?.arrive_airport;
    if (!departureDate && first?.depart_datetime) {
      departureDate = String(first.depart_datetime).split("T")[0];
    }
  }

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    adults: trip.adults ?? 1,
    cabin: trip.cabin ?? undefined,
  };
}

async function getAmadeusAccessToken(): Promise<string> {
  const id = Deno.env.get("AMADEUS_CLIENT_ID");
  const sec = Deno.env.get("AMADEUS_CLIENT_SECRET");
  const bearer = Deno.env.get("AMADEUS_API_KEY"); // optional direct bearer

  if (id && sec) {
    const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: sec }),
    });
    if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.access_token as string;
  }
  if (bearer) return bearer.startsWith("Bearer ") ? bearer.slice(7) : bearer;

  throw new Error("Missing Amadeus credentials (set AMADEUS_CLIENT_ID/SECRET or AMADEUS_API_KEY).");
}

async function fetchPublicFare(trip: any): Promise<{ price: number; currency: string; confidence: string } | null> {
  const { origin, destination, departureDate, returnDate, adults, cabin } = mapTripToSearchParams(trip);
  if (!origin || !destination || !departureDate) return null;

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

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error("[check-now] Amadeus search failed:", res.status, await res.text());
    if (Deno.env.get("ALLOW_DUMMY_PRICES") === "true") {
      return { price: 123.45, currency: "USD", confidence: "route-estimate" };
    }
    return null;
  }

  const payload: any = await res.json();
  const offers: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const first = offers[0];
  const total = first?.price?.grandTotal ? Number(first.price.grandTotal) : null;
  const currency = first?.price?.currency || "USD";

  if (!total) return null;

  const hasExact =
    trip.segments?.length > 0 &&
    trip.segments.every((s: any) => s.carrier && s.flight_number && s.depart_airport && s.arrive_airport);

  return { price: total, currency, confidence: hasExact ? "exact-flight" : "route-estimate" };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return error(405, "Use POST");

    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json().catch(() => ({}));
    const { tripId } = body as { tripId?: string };

    if (!tripId) return error(400, "Missing tripId");

    // Service client with the caller's JWT attached for user identity check
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: auth } },
    });

    // Identify the caller
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return error(401, "Not authenticated");

    // Load trip + segments (and ensure ownership)
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select(
        `
        *,
        segments ( carrier, flight_number, depart_airport, arrive_airport, depart_datetime )
      `,
      )
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (tripErr || !trip) return error(404, "Trip not found");

    // Guard: require pricing fields (or segments that allow derivation)
    const miss = missingForPricing(trip);
    if (miss.length && (!trip.segments || trip.segments.length === 0)) {
      return error(400, "Add flight segments (origin, destination, date) to enable price checks.");
    }

    // Fetch public fare
    const publicFare = await fetchPublicFare(trip);

    // Always set last_checked_at / next_check_at
    const now = new Date();
    const update: any = { last_checked_at: now.toISOString() };

    if (publicFare) {
      update.last_public_price = publicFare.price;
      update.last_public_currency = publicFare.currency;
      update.last_public_provider = "amadeus";
      update.last_confidence = publicFare.confidence;

      // history record
      await supabase.from("price_checks").insert({
        trip_id: trip.id,
        observed_price: publicFare.price,
        diff_vs_paid: typeof trip.paid_total === "number" ? trip.paid_total - publicFare.price : null,
        confidence: publicFare.confidence,
      });
    }

    await supabase.from("trips").update(update).eq("id", trip.id);

    return new Response(
      JSON.stringify({
        ok: true,
        observed_price: publicFare?.price ?? null,
        last_public_price: update.last_public_price ?? null,
        last_confidence: update.last_confidence ?? null,
        message: publicFare ? "Price check complete." : "Price check complete. No pricing data available yet.",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[check-now] Unhandled error:", e);
    return error(500, "Internal error");
  }
});
