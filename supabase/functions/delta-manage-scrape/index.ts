import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BEE_URL = "https://app.scrapingbee.com/api/v1/";

interface TripRow {
  id: string;
  airline: string;
  confirmation_code: string | null;
  first_name: string | null;
  last_name: string | null;
  passenger_name?: string | null;
  user_id: string;
}

interface BeeResponse {
  extracted_data?: Record<string, unknown>;
}

interface ParsedFlightSegment {
  segmentIndex: number;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string | null;
  arrivalTime: string | null;
}

function formatDateOnly(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function formatDisplayRange(start: Date | null, end: Date | null): string | null {
  if (!start || Number.isNaN(start.getTime())) return null;
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startText = formatter.format(start);
  if (!end || Number.isNaN(end.getTime())) {
    return startText;
  }
  return `${startText} - ${formatter.format(end)}`;
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
      console.error(`[DELTA-SCRAPE] ScrapingBee error: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as BeeResponse;
    }

    return await response.text();
  } catch (error) {
    console.error("[DELTA-SCRAPE] ScrapingBee request failed", error);
    return null;
  }
}

function parseDeltaTripMetadata(html: string) {
  const $ = cheerio.load(html);
  const trip: Record<string, string | null> = {};

  const smetricsSrc = $('script[src*="smetrics.delta.com/b/ss/deltacom2"]').attr("src");

  if (smetricsSrc) {
    const query = smetricsSrc.split("?")[1] ?? "";
    const params = new URLSearchParams(query);

    const originFromAnalytics = params.get("v4");
    const destinationFromAnalytics = params.get("v5");
    const departDateRaw = params.get("v10");
    const returnDateRaw = params.get("v11");

    if (originFromAnalytics) trip.origin_iata = originFromAnalytics.toUpperCase();
    if (destinationFromAnalytics) trip.destination_iata = destinationFromAnalytics.toUpperCase();

    if (departDateRaw) {
      const [mm, dd, yyyy] = departDateRaw.split("/");
      if (mm && dd && yyyy) {
        trip.departureDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
    }

    if (returnDateRaw) {
      const [mm, dd, yyyy] = returnDateRaw.split("/");
      if (mm && dd && yyyy) {
        trip.returnDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
    }
  }

  const timelineBlocks = $(".td-departure-arrival-container");
  const routePieces: string[] = [];
  timelineBlocks.each((_, el) => {
    const codeMatch = $(el).text().match(/\(([A-Z]{3})\)/);
    if (codeMatch) {
      routePieces.push(codeMatch[1].toUpperCase());
    }
  });

  if (routePieces.length >= 2) {
    trip.route_display = `${routePieces[0]} → ${routePieces[routePieces.length - 1]}`;
    trip.full_route = routePieces.join(" → ");
    trip.origin_iata = trip.origin_iata ?? routePieces[0];
    trip.destination_iata = trip.destination_iata ?? routePieces[routePieces.length - 1];
  }

  const firstDateText = $(".td-flight-point-date").first().text().trim();
  const lastDateText = $(".td-flight-point-date").last().text().trim();
  if (firstDateText) {
    trip.travel_dates_display = lastDateText && lastDateText !== firstDateText
      ? `${firstDateText} - ${lastDateText}`
      : firstDateText;
  }

  return trip;
}

function isValidIATA(code: string | null | undefined): boolean {
  return !!code && /^[A-Z]{3}$/.test(code);
}

function isValidFlightNumber(num: string | null | undefined): boolean {
  return !!num && /^[A-Z]{2}\d{2,4}$/.test(num);
}

function extractSegmentDate(html: string, keyword: "Depart" | "Arrive"): Date | null {
  const regex = new RegExp(`${keyword}[\\s\\S]{0,400}?td-flight-point-date[^>]*>\\s*([^<]+)`, "i");
  const match = html.match(regex);
  if (!match) return null;
  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractTime(html: string, keyword: "Depart" | "Arrive"): string | null {
  const regex = new RegExp(
    `${keyword}[\\s\\S]{0,400}?td-flight-point-time[^>]*>\\s*([0-9]{1,2}:[0-9]{2}\\s*(?:AM|PM))`,
    "i",
  );
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractAirport(html: string, keyword: "Depart" | "Arrive"): string | null {
  const regex = new RegExp(`${keyword}[\\s\\S]{0,600}?td-flight-point-city[^>]*>\\s*[^<]*\\(([A-Z]{3})\\)`, "i");
  const match = html.match(regex);
  return match ? match[1].trim().toUpperCase() : null;
}

function extractFlightNumber(segmentHtml: string): string | null {
  const patterns = [
    /class="[^"]*flight-number[^"]*">\s*([A-Z]{2})\s*(\d{2,4})/i,
    /data-flight-number="([A-Z]{2}\d{2,4})"/i,
    /\b([A-Z]{2})\s*(\d{3,4})\b/,
  ];

  for (const pattern of patterns) {
    const match = segmentHtml.match(pattern);
    if (match) {
      const letters = (match[1] ?? "").toUpperCase();
      const digitsRaw = match.length > 2 ? match[2] : "";
      const digits = typeof digitsRaw === "string" ? digitsRaw.trim() : "";
      const candidate = `${letters}${digits}`.toUpperCase();
      if (isValidFlightNumber(candidate)) {
        return candidate;
      }
      if (isValidFlightNumber(letters)) {
        return letters;
      }
    }
  }

  return null;
}

function combineDateAndTime(baseDate: Date, timeStr: string): string | null {
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return null;
  let hour = Number.parseInt(timeMatch[1], 10);
  const minute = Number.parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function adjustArrivalIfNextDay(departIso: string | null, arriveIso: string | null): string | null {
  if (!departIso || !arriveIso) return arriveIso;
  const departDate = new Date(departIso);
  const arriveDate = new Date(arriveIso);
  if (Number.isNaN(departDate.getTime()) || Number.isNaN(arriveDate.getTime())) {
    return arriveIso;
  }
  if (arriveDate <= departDate) {
    arriveDate.setDate(arriveDate.getDate() + 1);
    return arriveDate.toISOString();
  }
  return arriveIso;
}

function parseFlightSegments(html: string, baseDate: Date | null): ParsedFlightSegment[] {
  const segments: ParsedFlightSegment[] = [];
  const structuredMatches = [...html.matchAll(/<idp-flight-segment-info[^>]*>([\s\S]*?)<\/idp-flight-segment-info>/gi)];

  structuredMatches.forEach((match) => {
    const segmentHtml = match[1];
    const flightNum = extractFlightNumber(segmentHtml);
    const depAirport = extractAirport(segmentHtml, "Depart");
    const arrAirport = extractAirport(segmentHtml, "Arrive");
    const depTime = extractTime(segmentHtml, "Depart");
    const arrTime = extractTime(segmentHtml, "Arrive");

    if (!flightNum || !depAirport || !arrAirport || !depTime || !arrTime) {
      return;
    }

    const segmentBaseDate =
      baseDate ?? extractSegmentDate(segmentHtml, "Depart") ?? extractSegmentDate(segmentHtml, "Arrive");
    const departIso = segmentBaseDate ? combineDateAndTime(segmentBaseDate, depTime) : null;
    let arriveIso = segmentBaseDate ? combineDateAndTime(segmentBaseDate, arrTime) : null;
    arriveIso = adjustArrivalIfNextDay(departIso, arriveIso);

    segments.push({
      segmentIndex: segments.length,
      flightNumber: flightNum,
      departureAirport: depAirport,
      arrivalAirport: arrAirport,
      departureTime: departIso,
      arrivalTime: arriveIso,
    });
  });

  if (segments.length > 0) {
    return segments;
  }

  // Fallback: simple analytics-derived single leg
  const originMatch = html.match(/[&?]v4=([A-Z]{3})/);
  const destinationMatch = html.match(/[&?]v5=([A-Z]{3})/);
  const flightMatch = html.match(/[&?]v91=([A-Z]{2}\d{2,4})/);
  const departTime = extractTime(html, "Depart");
  const arriveTime = extractTime(html, "Arrive");

  if (originMatch && destinationMatch && flightMatch && departTime && arriveTime) {
    const origin = originMatch[1].toUpperCase();
    const destination = destinationMatch[1].toUpperCase();
    const flightNum = flightMatch[1].toUpperCase();
    const departIso = baseDate ? combineDateAndTime(baseDate, departTime) : null;
    let arriveIso = baseDate ? combineDateAndTime(baseDate, arriveTime) : null;
    arriveIso = adjustArrivalIfNextDay(departIso, arriveIso);

    segments.push({
      segmentIndex: 0,
      flightNumber: flightNum,
      departureAirport: origin,
      arrivalAirport: destination,
      departureTime: departIso,
      arrivalTime: arriveIso,
    });
  }

  return segments;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { tripId } = await req.json().catch(() => ({ tripId: null }));

    if (!tripId) {
      return new Response(JSON.stringify({ error: "tripId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DELTA-SCRAPE] Starting", { tripId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const scrapingBeeKey = Deno.env.get("SCRAPINGBEE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!scrapingBeeKey) {
      throw new Error("SCRAPINGBEE_API_KEY missing");
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

    const { data: tripData, error: tripError } = await adminClient
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !tripData) {
      throw new Error(tripError?.message ?? "Trip not found");
    }

    const trip = tripData as TripRow;

    if (trip.airline !== "DL") {
      return new Response(JSON.stringify({ skipped: true, reason: "Only Delta trips supported" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confirmation = trip.confirmation_code?.trim();
    const firstName = trip.first_name?.trim() ?? trip.passenger_name?.split(" ")[0];
    const lastName = trip.last_name?.trim() ?? trip.passenger_name?.split(" ").slice(-1)[0];

    if (!confirmation || !lastName || !firstName) {
      throw new Error("Trip is missing confirmation code or passenger names");
    }

    const jsScenario = [
      { type: "goto", url: "https://www.delta.com/my-trips/" },
      { type: "wait", css: "input[name='confirmationNumber']" },
      { type: "type", css: "input[name='confirmationNumber']", text: confirmation },
      { type: "type", css: "input[name='firstName']", text: firstName },
      { type: "type", css: "input[name='lastName']", text: lastName },
      { type: "click", css: "button[type='submit'], button[data-qa='find-my-trip-submit']" },
      { type: "wait", css: "idp-trip-details, idp-traveler-details, .trip-details, [data-qa='trip-card']" },
    ];

    const extractRules = {
      html: { selector: "html", type: "html" },
    };

    const payload = await fetchBee(scrapingBeeKey, {
      url: "https://www.delta.com/my-trips/",
      render_js: true,
      country_code: "us",
      premium_proxy: true,
      stealth_proxy: true,
      js_scenario: jsScenario,
      extract_rules: extractRules,
      wait: 20000,
      timeout: 90000,
      block_resources: ["image", "media", "font"],
    });

    if (!payload) {
      throw new Error("Failed to retrieve Delta manage trip HTML");
    }

    let html = "";
    if (typeof payload === "string") {
      html = payload;
    } else if (payload?.extracted_data && typeof payload.extracted_data.html === "string") {
      html = payload.extracted_data.html;
    }

    if (!html) {
      throw new Error("No HTML returned from ScrapingBee");
    }

    console.log("[DELTA-SCRAPE] HTML fetched", { length: html.length });

    const metadata = parseDeltaTripMetadata(html);
    const baseDate = safeDate(metadata.departureDate ?? null);
    const parsedSegments = parseFlightSegments(html, baseDate);

    const normalizedSegments = parsedSegments
      .map((seg) => {
        const match = seg.flightNumber.match(/^([A-Z]{2})(\d{2,4})$/);
        if (!match) return null;
        const departIso = seg.departureTime && seg.departureTime.includes("T") ? seg.departureTime : null;
        if (!departIso) return null;
        const arriveIso = seg.arrivalTime && seg.arrivalTime.includes("T") ? seg.arrivalTime : departIso;
        return {
          trip_id: trip.id,
          carrier: match[1],
          flight_number: match[2],
          depart_airport: seg.departureAirport,
          arrive_airport: seg.arrivalAirport,
          depart_datetime: departIso,
          arrive_datetime: arriveIso,
          segment_index: seg.segmentIndex,
        };
      })
      .filter((seg): seg is {
        trip_id: string;
        carrier: string;
        flight_number: string;
        depart_airport: string;
        arrive_airport: string;
        depart_datetime: string;
        arrive_datetime: string;
        segment_index: number;
      } => !!seg);

    const origin = normalizedSegments[0]?.depart_airport ?? metadata.origin_iata ?? null;
    const destination =
      normalizedSegments[normalizedSegments.length - 1]?.arrive_airport ?? metadata.destination_iata ?? null;

    const departDate = normalizedSegments.length > 0 ? safeDate(normalizedSegments[0].depart_datetime) : safeDate(metadata.departureDate ?? null);
    const returnDate =
      normalizedSegments.length > 1
        ? safeDate(normalizedSegments[normalizedSegments.length - 1].depart_datetime)
        : safeDate(metadata.returnDate ?? null);

    const routeParts: string[] = [];
    if (normalizedSegments.length > 0) {
      routeParts.push(normalizedSegments[0].depart_airport);
      normalizedSegments.forEach((seg) => routeParts.push(seg.arrive_airport));
    } else if (metadata.full_route) {
      routeParts.push(...metadata.full_route.split("→").map((p) => p.trim()));
    }

    const routeDisplay = routeParts.length >= 2 ? routeParts.join(" → ") : metadata.route_display ?? null;
    const fullRoute = routeParts.length >= 2
      ? routeParts.join(" → ")
      : metadata.full_route ?? routeDisplay ?? null;
    const travelDisplay = formatDisplayRange(departDate, returnDate) ?? metadata.travel_dates_display ?? null;

    console.log("[DELTA-SCRAPE] Parsed data", {
      routeDisplay,
      travelDisplay,
      segments: normalizedSegments.length,
    });

    const updatePayload: Record<string, string | null> = {};
    if (routeDisplay) {
      updatePayload.route_display = routeDisplay;
    }
    if (fullRoute) {
      updatePayload.full_route = fullRoute;
    }
    if (travelDisplay) {
      updatePayload.travel_dates_display = travelDisplay;
    }
    if (origin) updatePayload.origin_iata = origin;
    if (destination) updatePayload.destination_iata = destination;
    if (departDate) {
      const dateStr = formatDateOnly(departDate);
      updatePayload.depart_date = dateStr;
      updatePayload.departure_date = dateStr;
    }
    if (returnDate) {
      updatePayload.return_date = formatDateOnly(returnDate);
    }

    console.log("[DELTA-SCRAPE] Updating trip", updatePayload);

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await adminClient.from("trips").update(updatePayload).eq("id", trip.id);
      if (updateError) {
        throw updateError;
      }
    }

    if (normalizedSegments.length > 0) {
      console.log("[DELTA-SCRAPE] Upserting segments", normalizedSegments.length);
      await adminClient.from("segments").delete().eq("trip_id", trip.id);
      const { error: insertError } = await adminClient.from("segments").insert(normalizedSegments);
      if (insertError) {
        throw insertError;
      }
    }

    console.log("[DELTA-SCRAPE] Completed", { tripId, segments: normalizedSegments.length });

    return new Response(
      JSON.stringify({
        success: true,
        tripId,
        route_display: updatePayload.route_display,
        travel_dates_display: updatePayload.travel_dates_display,
        segments: normalizedSegments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[DELTA-SCRAPE-ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
