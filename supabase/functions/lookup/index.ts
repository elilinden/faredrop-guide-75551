import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AirlineConfig {
  url: string;
  needsFullName: boolean;
  formSelectors: {
    confirmation: string;
    name: string;
    submit: string;
  };
  resultSelectors: {
    flightNumber?: string;
    departureAirport?: string;
    arrivalAirport?: string;
    departureTime?: string;
    arrivalTime?: string;
    status?: string;
  };
}

// Helper function to extract data using regex patterns
function extractWithRegex(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// Try to extract a "base" trip date like "Tue, Mar 31, 2026"
function extractBaseDate(html: string): Date | null {
  const datePattern = /([A-Z][a-z]{2}),?\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:,\s*(\d{4}))?/;
  const match = html.match(datePattern);
  if (!match) return null;

  const [, , monthStr, dayStr, yearStr] = match;
  const year = yearStr || String(new Date().getFullYear());
  const date = new Date(`${monthStr} ${dayStr}, ${year}`);
  if (isNaN(date.getTime())) return null;
  return date;
}

// Combine a base date + a time string like "7:00 AM" into an ISO datetime
function combineDateAndTime(baseDate: Date, timeStr: string): string | null {
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!timeMatch) return null;

  let [, hourStr, minuteStr, ampm] = timeMatch;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (!isNaN(hour) && !isNaN(minute)) {
    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
    }
    const dt = new Date(baseDate);
    dt.setHours(hour, minute, 0, 0);
    return dt.toISOString();
  }

  return null;
}

// Parse a duration string like "7h 0m" into minutes
function parseDurationToMinutes(str: string | null): number | null {
  if (!str) return null;
  const hoursMatch = str.match(/(\d+)\s*h/i);
  const minsMatch = str.match(/(\d+)\s*m/i);
  const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const m = minsMatch ? parseInt(minsMatch[1], 10) : 0;
  if (isNaN(h) && isNaN(m)) return null;
  return h * 60 + m;
}

// Helper to parse flight segments from HTML
function parseFlightSegments(html: string, baseDate: Date | null): any[] {
  const segments: any[] = [];

  // Try parentheses-style routes first: "(LGA) ... (ATL)"
  const routePatternParen = /\(([A-Z]{3})\)[\s\S]{0,80}?\(([A-Z]{3})\)/g;
  let routeMatches = [...html.matchAll(routePatternParen)];

  // Fallback to "LGA to ATL" style if needed
  if (routeMatches.length === 0) {
    const routePatternArrow = /([A-Z]{3})\s*(?:to|→|->|–)\s*([A-Z]{3})/gi;
    routeMatches = [...html.matchAll(routePatternArrow)];
  }

  // Try to extract flight numbers
  const flightPattern = /(?:Flight|Flt)[\s:]+([A-Z]{2}[\s-]?\d+)/gi;
  const flightMatches = [...html.matchAll(flightPattern)];

  // Try to extract times
  const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  const timeMatches = [...html.matchAll(timePattern)];

  // Try to match aircraft types
  const aircraftPattern = /(?:Aircraft|Plane|Equipment)[\s:]+([A-Z0-9-]+)/gi;
  const aircraftMatches = [...html.matchAll(aircraftPattern)];

  const segmentCount = Math.max(flightMatches.length, routeMatches.length, 1);

  for (let i = 0; i < segmentCount; i++) {
    const flightMatch = flightMatches[i];
    const routeMatch = routeMatches[i];
    const depTimeMatch = timeMatches[i * 2];
    const arrTimeMatch = timeMatches[i * 2 + 1];
    const aircraftMatch = aircraftMatches[i];

    const depAirport = routeMatch ? routeMatch[1] : null;
    const arrAirport = routeMatch ? routeMatch[2] : null;

    const depTimeDisplay = depTimeMatch ? depTimeMatch[1] : null;
    const arrTimeDisplay = arrTimeMatch ? arrTimeMatch[1] : null;

    // If we have a base date, convert to ISO; otherwise keep display string
    const departDateTimeIso = baseDate && depTimeDisplay ? combineDateAndTime(baseDate, depTimeDisplay) : null;
    const arriveDateTimeIso = baseDate && arrTimeDisplay ? combineDateAndTime(baseDate, arrTimeDisplay) : null;

    segments.push({
      segmentIndex: i,
      flightNumber: flightMatch ? flightMatch[1].replace(/\s+/g, "") : null,
      aircraft: aircraftMatch ? aircraftMatch[1] : null,
      departureAirport: depAirport,
      // IMPORTANT: keep the field name `departureTime` but make it ISO when possible
      // so TripDetail can use it as a datetime
      departureTime: departDateTimeIso || depTimeDisplay,
      departureTerminal: null,
      departureGate: null,
      arrivalAirport: arrAirport,
      arrivalTime: arriveDateTimeIso || arrTimeDisplay,
      arrivalTerminal: null,
      arrivalGate: null,
      status: html.match(/(?:on time|delayed|cancelled)/i)?.[0] || "Scheduled",
      layoverDuration: null,
      isChangeOfPlane: false,
    });
  }

  return segments;
}

const airlineConfigs: Record<string, AirlineConfig> = {
  delta: {
    url: "https://www.delta.com/my-trips/booked?itineraryType=existing",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="confirmationNumber"]',
      name: 'input[name="passengerLastName"]',
      submit: 'button[type="submit"]',
    },
    resultSelectors: {
      flightNumber: ".flight-number",
      departureAirport: ".departure-airport",
      arrivalAirport: ".arrival-airport",
      departureTime: ".departure-time",
      arrivalTime: ".arrival-time",
      status: ".flight-status",
    },
  },
  united: {
    url: "https://www.united.com/en/us/mytrips/",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="confirmationNumber"]',
      name: 'input[name="lastName"]',
      submit: 'button[type="submit"]',
    },
    resultSelectors: {},
  },
  american: {
    url: "https://www.aa.com/reservation/search",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="recordLocator"]',
      name: 'input[name="lastName"]',
      submit: 'button[type="submit"]',
    },
    resultSelectors: {},
  },
  alaska: {
    url: "https://www.alaskaair.com/booking/reservation-lookup",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="confirmationCode"]',
      name: 'input[name="lastName"]',
      submit: 'button[type="submit"]',
    },
    resultSelectors: {},
  },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { confirmationCode, firstName, lastName, airline } = await req.json();

    console.log("[lookup] Request received:", {
      confirmationCode,
      airline,
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
    });

    // Validate inputs
    if (!confirmationCode || !lastName || !airline) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: confirmationCode, lastName, and airline",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get airline config
    const config = airlineConfigs[airline.toLowerCase()];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unsupported airline: ${airline}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine name to use (for future form-filling scenarios)
    const nameToUse = config.needsFullName && firstName ? `${firstName} ${lastName}` : lastName;

    console.log("[lookup] Calling ScrapingBee for", airline, {
      confirmationCode,
      nameToUse,
    });

    // Call ScrapingBee
    const scrapingBeeKey = Deno.env.get("SCRAPINGBEE_API_KEY");
    if (!scrapingBeeKey) {
      console.error("[lookup] ScrapingBee API key not configured");
      return new Response(JSON.stringify({ error: "ScrapingBee API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scrapingBeeUrl = new URL("https://app.scrapingbee.com/api/v1/");
    scrapingBeeUrl.searchParams.set("api_key", scrapingBeeKey);
    scrapingBeeUrl.searchParams.set("url", config.url);
    scrapingBeeUrl.searchParams.set("render_js", "true");
    scrapingBeeUrl.searchParams.set("premium_proxy", "true");
    scrapingBeeUrl.searchParams.set("wait", "5000");

    const response = await fetch(scrapingBeeUrl.toString());

    if (!response.ok) {
      console.error("[lookup] ScrapingBee error:", response.status, response.statusText);
      return new Response(
        JSON.stringify({
          error: `Failed to scrape airline website: ${response.statusText}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const html = await response.text();
    console.log("[lookup] Received HTML, length:", html.length);

    // Extract a base date for segment datetimes
    const baseDate = extractBaseDate(html);
    if (baseDate) {
      console.log("[lookup] Base trip date detected:", baseDate.toISOString());
    } else {
      console.log("[lookup] No base trip date detected; using fallback times");
    }

    // Extract human-readable total duration first
    const rawDuration = extractWithRegex(html, [
      /total (?:duration|time)[:\s]+([\dh\sm]+)/i,
      /duration[:\s]+([\dh\sm]+)/i,
    ]);
    const totalDurationMinutes = parseDurationToMinutes(rawDuration);

    // Extract trip-level data using regex patterns
    const tripData: any = {
      airline: airline.charAt(0).toUpperCase() + airline.slice(1),
      confirmation: confirmationCode,
      tripType: extractWithRegex(html, [/trip type[:\s]+(\w+)/i, /(\w+)\s+trip/i]) || "round-trip",
      destination: extractWithRegex(html, [/destination[:\s]+([A-Z]{3})/i, /to[:\s]+([A-Z]{3})/i]) || null,
      ticketExpiration: extractWithRegex(html, [/ticket expires?[:\s]+([\w\s,]+)/i, /expiration[:\s]+([\w\s,]+)/i]),
      fullRoute: extractWithRegex(html, [/route[:\s]+([\w\s\u2192\u2013->]+)/i]),
      // IMPORTANT: return duration as *minutes* (string) so parseInt() in AddFlightModal is correct
      totalDuration: totalDurationMinutes !== null ? String(totalDurationMinutes) : null,
      passengerName: `${firstName || ""} ${lastName}`.trim(),
      loyaltyStatus: extractWithRegex(html, [/(?:skymiles|frequent flyer|loyalty)[:\s]+(\w+)/i, /(\w+)\s+member/i]),
      fareClass: extractWithRegex(html, [/(?:fare|cabin|class)[:\s]+(\w+)/i, /(economy|business|first|premium)/i]),
      eticketNumber: extractWithRegex(html, [/e-?ticket[:\s#]+([\d-]+)/i, /ticket (?:number|#)[:\s]+([\d-]+)/i]),
      isRefundable: html.toLowerCase().includes("refundable") && !html.toLower().includes("non-refundable"),
    };

    // Extract flight segments
    const flights = parseFlightSegments(html, baseDate);

    // If we didn't get fullRoute above, build from segments (LGA → ATL → TQO)
    if ((!tripData.fullRoute || tripData.fullRoute.length === 0) && flights.length > 0) {
      const codes: string[] = [];
      flights.forEach((seg, idx) => {
        if (idx === 0 && seg.departureAirport) {
          codes.push(seg.departureAirport);
        }
        if (seg.arrivalAirport) {
          codes.push(seg.arrivalAirport);
        }
      });
      if (codes.length > 0) {
        tripData.fullRoute = codes.join(" \u2192 "); // →
      }
    }

    // If no destination but we have segments, use the last arrival airport as destination IATA
    if (!tripData.destination && flights.length > 0) {
      const lastSeg = flights[flights.length - 1];
      if (lastSeg.arrivalAirport) {
        tripData.destination = lastSeg.arrivalAirport;
      }
    }

    const result = {
      ...tripData,
      flights,
      scraped: true,
      segmentCount: flights.length,
    };

    console.log("[lookup] Returning result with", flights.length, "segments");

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[lookup] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
