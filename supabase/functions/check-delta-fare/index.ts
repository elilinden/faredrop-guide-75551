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

function redact(input?: string | null): string {
  if (!input) return "";
  let s = String(input);
  s = s.replace(/\b([A-Z0-9]{2})[A-Z0-9]{2}([A-Z0-9]{2})\b/g, "$1**$2");
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "***@***");
  s = s.replace(/\b([A-Z][a-z]{1,})(\s+[A-Z][a-z]{1,})\b/g, "$1 **");
  return s;
}

function snippet(v: unknown, max = 2000): string {
  const s = typeof v === "string" ? v : JSON.stringify(v ?? "", null, 2);
  return s.slice(0, max);
}

async function log(
  client: ReturnType<typeof createClient>,
  traceId: string,
  stage: string,
  ok: boolean,
  msg: string,
  data?: unknown,
  ms?: number,
  tripId?: string
) {
  try {
    await client.from("scrape_logs").insert({
      trace_id: traceId,
      trip_id: tripId ?? null,
      stage,
      ok,
      message: msg,
      data_snippet: snippet(redact(typeof data === "string" ? data : JSON.stringify(data))),
      ms: ms ?? null,
    });
  } catch (error) {
    console.error("[log-fail]", stage, error);
  }
}

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
  const t0 = Date.now();
  const traceId = crypto.randomUUID();
  const cors = new Headers({ ...corsHeaders, "X-Trace-Id": traceId });
  let admin: ReturnType<typeof createClient> | null = null;

  const jsonHeaders = () => {
    const headers = new Headers(cors);
    headers.set("Content-Type", "application/json");
    return headers;
  };

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed", trace_id: traceId }),
        { status: 405, headers: jsonHeaders() }
      );
    }

    const { trip_id: tripId, debug } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const scrapingBeeKey = Deno.env.get("SCRAPINGBEE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      await log(createClient(supabaseUrl ?? "", serviceRoleKey ?? ""), traceId, "env_check", false, "Missing Supabase env");
      return new Response(
        JSON.stringify({ ok: false, error: "Supabase configuration missing", trace_id: traceId }),
        { status: 500, headers: jsonHeaders() }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    });
    admin = adminClient;

    await log(adminClient, traceId, "env_check", !!scrapingBeeKey, scrapingBeeKey ? "OK" : "SCRAPINGBEE_API_KEY missing");

    if (!scrapingBeeKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "SCRAPINGBEE_API_KEY missing", trace_id: traceId }),
        { status: 500, headers: jsonHeaders() }
      );
    }

    if (!tripId) {
      await log(adminClient, traceId, "load_trip", false, "trip_id required");
      return new Response(
        JSON.stringify({ ok: false, error: "trip_id required", trace_id: traceId }),
        { status: 400, headers: jsonHeaders() }
      );
    }

    const tLoad = Date.now();
    const { data: tripData, error: tripError } = await adminClient
      .from("trips")
      .select(
        "id, airline, confirmation_code, first_name, last_name, origin_iata, destination_iata, departure_date, flight_numbers, brand"
      )
      .eq("id", tripId)
      .maybeSingle();

    const trip = tripData as TripRecord | null;

    await log(
      adminClient,
      traceId,
      "load_trip",
      !tripError && !!trip,
      tripError ? `trip load error: ${tripError.message}` : `trip loaded airline=${trip?.airline}`,
      { tripId },
      Date.now() - tLoad,
      tripId
    );

    if (tripError) {
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to load trip", trace_id: traceId }),
        { status: 500, headers: jsonHeaders() }
      );
    }

    if (!trip) {
      return new Response(
        JSON.stringify({ ok: false, error: "Trip not found", trace_id: traceId }),
        { status: 404, headers: jsonHeaders() }
      );
    }

    if (trip.airline !== "DL") {
      await log(adminClient, traceId, "guard", false, "Only DL supported", { airline: trip.airline }, undefined, tripId);
      return new Response(
        JSON.stringify({ ok: false, error: "Only DL supported", trace_id: traceId }),
        { status: 400, headers: jsonHeaders() }
      );
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
        await log(adminClient, traceId, "scenario_manage", false, "missing trip credentials", { tripId }, undefined, tripId);
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

      await log(adminClient, traceId, "scenario_manage", true, "start", debug ? { js_scenario, extract_rules } : undefined, undefined, tripId);

      const tFetch = Date.now();
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

      await log(
        adminClient,
        traceId,
        "scenario_manage",
        !!payload,
        payload ? "payload received" : "payload missing",
        debug ? payload : undefined,
        Date.now() - tFetch,
        tripId
      );

      if (!payload) return null;

      let text = "";
      if (typeof payload === "string") {
        text = payload;
      } else if (payload?.extracted_data) {
        const { extracted_data } = payload;
        text = String(extracted_data.priceA || extracted_data.priceB || extracted_data.html || "");
      }

      await log(adminClient, traceId, "scenario_manage", !!text, "payload parsed", debug ? snippet(redact(text)) : undefined, undefined, tripId);

      const price = parseUsd(text);

      await log(
        adminClient,
        traceId,
        "scenario_manage",
        price != null,
        price != null ? `price parsed ${price}` : "price missing",
        debug ? { text: snippet(redact(text)) } : undefined,
        undefined,
        tripId
      );

      if (price == null) return null;

      const result: PriceResult = {
        price,
        currency: "USD",
        source: "delta-manage",
        confidence: "exact-flight",
      };

      await log(adminClient, traceId, "scenario_manage", true, "price result", debug ? result : undefined, Date.now() - tFetch, tripId);

      return result;
    };

    const shopScenario = async (): Promise<PriceResult | null> => {
      if (!trip.origin_iata || !trip.destination_iata || !trip.departure_date) {
        await log(adminClient, traceId, "scenario_shop", false, "missing route data", { tripId }, undefined, tripId);
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

      await log(adminClient, traceId, "scenario_shop", true, "start", debug ? { js_scenario, extract_rules } : undefined, undefined, tripId);

      const tFetch = Date.now();
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

      await log(
        adminClient,
        traceId,
        "scenario_shop",
        !!payload,
        payload ? "payload received" : "payload missing",
        debug ? payload : undefined,
        Date.now() - tFetch,
        tripId
      );

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

      await log(adminClient, traceId, "scenario_shop", !!text, "payload parsed", debug ? snippet(redact(text)) : undefined, undefined, tripId);

      if (primaryFlightNumber) {
        const re = new RegExp(`DL\\s?${primaryFlightNumber}\\b[\\s\\S]{0,1200}`, "i");
        const match = text.match(re);
        if (match) {
          text = match[0];
        }
      }

      if (normalizedBrand) {
        const pattern = normalizedBrand.replace(/[+]/g, "\\+").replace(/\s+/g, "\\s+");
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
      const confidence: Confidence = primaryFlightNumber ? "exact-flight" : "route-estimate";

      await log(
        adminClient,
        traceId,
        "scenario_shop",
        price != null,
        price != null ? `price parsed ${price}` : "price missing",
        debug ? { text: snippet(redact(text)) } : undefined,
        undefined,
        tripId
      );

      if (price == null) return null;

      const result: PriceResult = {
        price,
        currency: "USD",
        source: "delta-shop",
        confidence,
      };

      await log(adminClient, traceId, "scenario_shop", true, "price result", debug ? result : undefined, Date.now() - tFetch, tripId);

      return result;
    };

    let result: PriceResult | null = await manageTripScenario();
    if (!result) {
      result = await shopScenario();
    }

    await log(
      adminClient,
      traceId,
      "parse_result",
      !!result,
      result ? `price=${result.price}` : "price_not_found",
      debug ? result : undefined,
      Date.now() - t0,
      trip.id
    );

    if (!result) {
      return new Response(
        JSON.stringify({ ok: false, reason: "price_not_found", trace_id: traceId }),
        { status: 200, headers: jsonHeaders() }
      );
    }

    const tSave = Date.now();
    const { data: updatedTrip, error: updateError } = await adminClient
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

    await log(
      adminClient,
      traceId,
      "db_update",
      !updateError,
      updateError ? `save error: ${updateError.message}` : "trip updated",
      debug ? updatedTrip : undefined,
      Date.now() - tSave,
      trip.id
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to save price", trace_id: traceId }),
        { status: 500, headers: jsonHeaders() }
      );
    }

    await log(adminClient, traceId, "done", true, "completed", null, Date.now() - t0, trip.id);

    return new Response(
      JSON.stringify({ ok: true, result, trip: updatedTrip ?? null, trace_id: traceId }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (error) {
    console.error("[check-delta-fare] fatal", error);
    if (admin) {
      await log(admin, traceId, "error", false, error instanceof Error ? error.message : "unknown error");
    }
    return new Response(JSON.stringify({ ok: false, error: "Unexpected error", trace_id: traceId }), {
      status: 500,
      headers: jsonHeaders(),
    });
  }
});
