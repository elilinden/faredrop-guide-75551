import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BEE_URL = "https://app.scrapingbee.com/api/v1/";

interface TripRecord {
  id: string;
  airline: string;
  confirmation_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  departure_date?: string | null;
  flight_numbers?: string[] | null;
  brand?: string | null;
}

interface BeeResponse {
  extracted_data?: Record<string, unknown>;
}

type PriceSource = "delta-manage" | "delta-shop";
type Confidence = "exact-flight" | "route-estimate" | "unknown";

type PriceResult = {
  price: number;
  currency: string;
  source: PriceSource;
  confidence: Confidence;
};

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function parseUsd(input: string | undefined | null): number | null {
  if (!input) return null;
  const cleaned = input.replace(/\s+/g, "");
  const match = cleaned.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
  if (!match) return null;
  return Number.parseFloat(match[1].replace(/,/g, ""));
}

async function fetchBee(apiKey: string, body: Record<string, unknown>): Promise<BeeResponse | string | null> {
  const url = `${BEE_URL}?api_key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[check-delta-fare] ScrapingBee error: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as BeeResponse;
    }

    return await response.text();
  } catch (error) {
    console.error("[check-delta-fare] ScrapingBee request failed", error);
    return null;
  }
}

function cleanFlightNumber(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(\d{1,4})/);
  return match ? match[1] : null;
}

function normalizeBrand(brand: string | null | undefined): string | null {
  if (!brand) return null;
  return brand.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  let payload: { trip_id?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
  }

  const tripId = payload?.trip_id;
  if (!tripId) {
    return jsonResponse(400, { ok: false, error: "trip_id required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const scrapingBeeKey = Deno.env.get("SCRAPINGBEE_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[check-delta-fare] Missing Supabase configuration");
    return jsonResponse(500, { ok: false, error: "Supabase configuration missing" });
  }

  if (!scrapingBeeKey) {
    console.error("[check-delta-fare] SCRAPINGBEE_API_KEY missing");
    return jsonResponse(500, { ok: false, error: "SCRAPINGBEE_API_KEY missing" });
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });

  const { data: tripData, error: tripError } = await supabaseClient
    .from("trips")
    .select(
      "id, airline, confirmation_code, first_name, last_name, origin_iata, destination_iata, departure_date, flight_numbers, brand"
    )
    .eq("id", tripId)
    .maybeSingle();

  const trip = tripData as TripRecord | null;

  if (tripError) {
    console.error("[check-delta-fare] Failed to load trip", tripError);
    return jsonResponse(500, { ok: false, error: "Failed to load trip" });
  }

  if (!trip) {
    return jsonResponse(404, { ok: false, error: "Trip not found" });
  }

  if (trip.airline !== "DL") {
    return jsonResponse(400, { ok: false, error: "Only DL supported" });
  }

  const flightNumbers = Array.isArray(trip.flight_numbers)
    ? trip.flight_numbers
    : typeof trip.flight_numbers === "string"
      ? [trip.flight_numbers]
      : [];
  const primaryFlightNumber = cleanFlightNumber(flightNumbers[0]);
  const normalizedBrand = normalizeBrand(trip.brand);

  const manageTripScenario = async (): Promise<PriceResult | null> => {
    if (!trip.confirmation_code || !trip.last_name || !trip.first_name) {
      return null;
    }

    const js_scenario = [
      { type: "goto", url: "https://www.delta.com/my-trips/" },
      { type: "wait", css: "input[name='confirmationNumber']" },
      { type: "type", css: "input[name='confirmationNumber']", text: trip.confirmation_code },
      { type: "type", css: "input[name='firstName']", text: trip.first_name },
      { type: "type", css: "input[name='lastName']", text: trip.last_name },
      { type: "click", css: "button[type='submit'], button[data-qa='find-my-trip-submit']" },
      { type: "wait", css: "button:has-text('Change'), a:has-text('Change')" },
      { type: "click", css: "button:has-text('Change'), a:has-text('Change')" },
      {
        type: "wait_for",
        expression: "document.body.innerText.match(/\\$\\s?\\d{1,3}(,\\d{3})*(\\.\\d{2})?/)",
      },
    ];

    const extract_rules = {
      priceA: {
        selector:
          "[data-qa='price-difference'], .price-difference, .amount-due, .credit-amount, .residual-value-amount",
        type: "text",
      },
      priceB: { selector: ".total-amount, .totalPrice, .money, [class*='Price']", type: "text" },
      html: { selector: "html", type: "text" },
    };

    const payload = await fetchBee(scrapingBeeKey, {
      url: "https://www.delta.com/my-trips/",
      render_js: true,
      country_code: "us",
      premium_proxy: true,
      stealth_proxy: true,
      js_scenario,
      extract_rules,
      wait: 20000,
      timeout: 90000,
      block_resources: ["image", "media", "font"],
    });

    if (!payload) return null;

    let text = "";
    if (typeof payload === "string") {
      text = payload;
    } else if (payload?.extracted_data) {
      const { extracted_data } = payload;
      text = String(extracted_data.priceA || extracted_data.priceB || extracted_data.html || "");
    }

    const price = parseUsd(text);
    if (price == null) return null;

    return {
      price,
      currency: "USD",
      source: "delta-manage",
      confidence: "exact-flight",
    } satisfies PriceResult;
  };

  const shopScenario = async (): Promise<PriceResult | null> => {
    if (!trip.origin_iata || !trip.destination_iata || !trip.departure_date) {
      return null;
    }

    const searchDateRaw = trip.departure_date;
    let formattedSearchDate = searchDateRaw;
    if (searchDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(searchDateRaw)) {
      const [year, month, day] = searchDateRaw.split("-");
      formattedSearchDate = `${month}/${day}/${year}`;
    }
    const js_scenario = [
      { type: "goto", url: "https://www.delta.com/flight-search/book-a-flight" },
      { type: "wait", css: "input[name='fromCity'], input[aria-label='From']" },
      { type: "type", css: "input[name='fromCity'], input[aria-label='From']", text: trip.origin_iata },
      { type: "type", css: "input[name='toCity'], input[aria-label='To']", text: trip.destination_iata },
      { type: "click", css: "button:has-text('One Way'), [role='tab'][aria-controls*='ONE_WAY']" },
      { type: "click", css: "input[name='passengers']" },
      { type: "click", css: "input[name='departureDate'], input[aria-label='Departure date']" },
      {
        type: "type",
        css: "input[name='departureDate'], input[aria-label='Departure date']",
        text: formattedSearchDate,
      },
      { type: "click", css: "button:has-text('Search'), button[type='submit']" },
      { type: "wait", css: "body" },
      {
        type: "wait_for",
        expression: "document.body.innerText.includes('$') || document.body.innerText.match(/DL\\s?\\d{1,4}/)",
      },
    ];

    const extract_rules = {
      main: { selector: ".fare-card .amount, .main .amount, [data-qa*='main-cabin'] .amount", type: "text" },
      any: { selector: "[class*='amount'], [class*='Price'], .money, .price", type: "text" },
      html: { selector: "html", type: "text" },
    };

    const payload = await fetchBee(scrapingBeeKey, {
      url: "https://www.delta.com/flight-search/book-a-flight",
      render_js: true,
      country_code: "us",
      premium_proxy: true,
      stealth_proxy: true,
      js_scenario,
      extract_rules,
      wait: 20000,
      timeout: 90000,
      block_resources: ["image", "media", "font"],
    });

    if (!payload) return null;

    let text = "";
    if (typeof payload === "string") {
      text = payload;
    } else if (payload?.extracted_data) {
      const { extracted_data } = payload;
      text = [extracted_data.main, extracted_data.any, extracted_data.html]
        .filter(Boolean)
        .map((value) => String(value))
        .join("\n");
    }

    if (primaryFlightNumber) {
      const re = new RegExp(`DL\\s?${primaryFlightNumber}\\b[\\s\\S]{0,1200}`, "i");
      const match = text.match(re);
      if (match) {
        text = match[0];
      }
    }

    if (normalizedBrand) {
      const pattern = normalizedBrand
        .replace(/[+]/g, "\\+")
        .replace(/\s+/g, "\\s+");
      const brandRegex = new RegExp(pattern, "i");
      const brandMatch = text.match(brandRegex);
      if (!brandMatch && primaryFlightNumber) {
        const blockRegex = new RegExp(`DL\\s?${primaryFlightNumber}\\b[\\s\\S]{0,1600}`, "i");
        const blockMatch = text.match(blockRegex);
        if (blockMatch) {
          text = blockMatch[0];
        }
      }
    }

    const price = parseUsd(text);
    if (price == null) return null;

    const confidence: Confidence = primaryFlightNumber ? "exact-flight" : "route-estimate";

    return {
      price,
      currency: "USD",
      source: "delta-shop",
      confidence,
    } satisfies PriceResult;
  };

  let result: PriceResult | null = await manageTripScenario();
  if (!result) {
    result = await shopScenario();
  }

  if (!result) {
    return jsonResponse(200, { ok: false, reason: "price_not_found" });
  }

  const { data: updatedTrip, error: updateError } = await supabaseClient
    .from("trips")
    .update({
      last_live_price: result.price,
      last_live_price_currency: result.currency,
      last_live_checked_at: new Date().toISOString(),
      last_live_source: result.source,
      live_price_confidence: result.confidence,
    })
    .eq("id", trip.id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("[check-delta-fare] Failed to persist price", updateError);
    return jsonResponse(500, { ok: false, error: "Failed to save price" });
  }

  return jsonResponse(200, {
    ok: true,
    result,
    trip: updatedTrip ?? null,
  });
});
