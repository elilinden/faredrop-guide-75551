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

interface ParsedFlightSegment {
  segmentIndex: number;
  flightNumber: string;
  aircraft: string | null;
  departureAirport: string;
  departureTime: string | null;
  departureTerminal: string | null;
  departureGate: string | null;
  arrivalAirport: string;
  arrivalTime: string | null;
  arrivalTerminal: string | null;
  arrivalGate: string | null;
  status: string;
  layoverDuration: string | null;
  isChangeOfPlane: boolean;
}

interface TripData {
  airline: string;
  confirmation: string;
  tripType: string | null;
  destination: string | null;
  ticketExpiration: string | null;
  fullRoute: string | null;
  totalDuration: string | null;
  passengerName: string;
  loyaltyStatus: string | null;
  fareClass: string | null;
  eticketNumber: string | null;
  isRefundable: boolean;
  departureDate: string | null;
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

  const [, hourStr, minuteStr, ampmRaw] = timeMatch;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (!isNaN(hour) && !isNaN(minute)) {
    const ampm = ampmRaw ? ampmRaw.toUpperCase() : null;
    if (ampm) {
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
    }
    const dt = new Date(baseDate);
    dt.setHours(hour, minute, 0, 0);
    return dt.toISOString();
  }

  return null;
}

function parseAnalyticsDate(encoded: string | null | undefined): Date | null {
  if (!encoded) return null;

  try {
    const decoded = decodeURIComponent(encoded);
    const parts = decoded.split("/");
    if (parts.length !== 3) return null;

    const [monthStr, dayStr, yearStr] = parts;
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);

    if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) {
      return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.log("[lookup] Failed to decode analytics date", error);
    return null;
  }
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

// List of valid IATA airport codes (top 500 most common airports)
const VALID_IATA_CODES = new Set([
  "ATL", "DFW", "DEN", "ORD", "LAX", "JFK", "LAS", "MCO", "MIA", "CLT",
  "SEA", "PHX", "EWR", "SFO", "IAH", "BOS", "FLL", "MSP", "LGA", "DTW",
  "PHL", "SLC", "DCA", "SAN", "BWI", "TPA", "AUS", "MDW", "BNA", "IAD",
  "DAL", "HOU", "PDX", "STL", "HNL", "OAK", "MSY", "RDU", "SJC", "SAT",
  "RSW", "SNA", "PIT", "CLE", "SMF", "IND", "CMH", "CVG", "PBI", "BDL",
  "MKE", "OMA", "BUF", "BUR", "OGG", "ANC", "ONT", "JAX", "RNO", "TUS",
  "ABQ", "ELP", "SDF", "MCI", "OKC", "RIC", "GEG", "TUL", "DSM", "BOI",
  "LIT", "GSO", "ICT", "CHS", "SYR", "GSP", "LEX", "FAT", "COS", "PWM",
  "MAF", "LBB", "GRR", "SBA", "MSN", "PNS", "CAK", "SAV", "FWA", "DAY",
  "BGR", "MYR", "LAN", "TYS", "AGS", "CRW", "FAR", "BIL", "CAE", "TRI",
  // International airports
  "YYZ", "YVR", "YUL", "YYC", "MEX", "CUN", "GDL", "MTY", "PVR", "SJD",
  "LHR", "CDG", "AMS", "FRA", "MAD", "FCO", "BCN", "MUC", "IST", "DUB",
  "ZRH", "VIE", "BRU", "CPH", "ARN", "OSL", "HEL", "WAW", "PRG", "BUD",
  "NRT", "ICN", "HKG", "SIN", "BKK", "KUL", "DEL", "BOM", "DXB", "DOH",
  "SYD", "MEL", "BNE", "AKL", "PER", "GRU", "EZE", "SCL", "BOG", "LIM",
  "PTY", "SJO", "SAL", "GUA"
]);

// Helper to validate if a string is a valid 3-letter IATA code
function isValidIATA(code: string | null): boolean {
  if (!code || code.length !== 3) return false;
  return VALID_IATA_CODES.has(code.toUpperCase());
}

// Helper to validate if a string is a valid flight number
function isValidFlightNumber(num: string | null): boolean {
  return !!num && /^[A-Z]{2}\d+$/.test(num);
}

// Helper to parse flight segments from HTML with strict validation
function extractTime(html: string, keyword: "Depart" | "Arrive"): string | null {
  const regex = new RegExp(`${keyword}[\\s\\S]{0,400}?td-flight-point-time[^>]*>\\s*([0-9]{1,2}:[0-9]{2}\\s*(?:AM|PM))`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractAirport(html: string, keyword: "Depart" | "Arrive"): string | null {
  const regex = new RegExp(`${keyword}[\\s\\S]{0,600}?td-train-point-city[^>]*>\\s*[^<]*\\(([A-Z]{3})\\)`, "i");
  const match = html.match(regex);
  return match ? match[1].trim().toUpperCase() : null;
}

function extractSegmentDate(html: string, keyword: "Depart" | "Arrive"): Date | null {
  const regex = new RegExp(`${keyword}[\\s\\S]{0,400}?td-flight-point-date[^>]*>\\s*([^<]+)`, "i");
  const match = html.match(regex);
  if (!match) return null;
  const cleaned = match[1].replace(/\s+/g, " ").trim();
  return extractBaseDate(cleaned);
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

  if (structuredMatches.length > 0) {
    console.log(`[lookup] Found ${structuredMatches.length} structured segment blocks`);
  }

  structuredMatches.forEach((match, index) => {
    const segmentHtml = match[1];
    const flightNum = extractFlightNumber(segmentHtml);
    const depAirport = extractAirport(segmentHtml, "Depart");
    const arrAirport = extractAirport(segmentHtml, "Arrive");
    const depTime = extractTime(segmentHtml, "Depart");
    const arrTime = extractTime(segmentHtml, "Arrive");

    console.log(`[lookup] Structured segment ${index}`, {
      flightNum,
      depAirport,
      arrAirport,
      depTime,
      arrTime,
    });

    if (!flightNum || !isValidFlightNumber(flightNum)) {
      console.log(`[lookup] Structured segment ${index} missing valid flight number`);
      return;
    }

    if (!depAirport || !arrAirport || !isValidIATA(depAirport) || !isValidIATA(arrAirport)) {
      console.log(`[lookup] Structured segment ${index} missing valid airports`);
      return;
    }

    if (!depTime || !arrTime) {
      console.log(`[lookup] Structured segment ${index} missing depart/arrival times`);
      return;
    }

    const segmentBaseDate = baseDate ?? extractSegmentDate(segmentHtml, "Depart") ?? extractSegmentDate(segmentHtml, "Arrive");
    const departIso = segmentBaseDate ? combineDateAndTime(segmentBaseDate, depTime) : null;
    let arriveIso = segmentBaseDate ? combineDateAndTime(segmentBaseDate, arrTime) : null;
    arriveIso = adjustArrivalIfNextDay(departIso, arriveIso);

    segments.push({
      segmentIndex: segments.length,
      flightNumber: flightNum,
      aircraft: null,
      departureAirport: depAirport,
      departureTime: departIso || depTime,
      departureTerminal: null,
      departureGate: null,
      arrivalAirport: arrAirport,
      arrivalTime: arriveIso || arrTime,
      arrivalTerminal: null,
      arrivalGate: null,
      status: "Scheduled",
      layoverDuration: null,
      isChangeOfPlane: false,
    });
  });

  if (segments.length > 0) {
    return segments;
  }

  // Structured parsing failed, fall back to analytics variables embedded in the page
  const analyticsOriginMatch = html.match(/[&?]v4=([A-Z]{3})/);
  const analyticsDestMatch = html.match(/[&?]v5=([A-Z]{3})/);
  const analyticsDateMatch = html.match(/[&?]v10=(\d{2}%2F\d{2}%2F\d{4})/);
  const analyticsFlightMatch = html.match(/[&?]v91=([A-Z]{2}\d{2,4})/);

  const analyticsDate = analyticsDateMatch ? parseAnalyticsDate(analyticsDateMatch[1]) : null;
  const fallbackSegmentDate = extractSegmentDate(html, "Depart");
  const effectiveBaseDate = baseDate ?? analyticsDate ?? fallbackSegmentDate;

  if (analyticsOriginMatch && analyticsDestMatch) {
    const origin = analyticsOriginMatch[1].toUpperCase();
    const destination = analyticsDestMatch[1].toUpperCase();
    const flightNum = analyticsFlightMatch ? analyticsFlightMatch[1].toUpperCase() : null;

    console.log(`[lookup] Analytics data found ${origin} → ${destination}`, {
      flightNum,
      analyticsDate: analyticsDate?.toISOString() ?? null,
    });

    const depTime = extractTime(html, "Depart");
    const arrTime = extractTime(html, "Arrive");

    console.log("[lookup] Analytics-derived times", { depTime, arrTime });

    if (flightNum && depTime && arrTime && isValidFlightNumber(flightNum) && isValidIATA(origin) && isValidIATA(destination)) {
      const departIso = effectiveBaseDate ? combineDateAndTime(effectiveBaseDate, depTime) : null;
      let arriveIso = effectiveBaseDate ? combineDateAndTime(effectiveBaseDate, arrTime) : null;
      arriveIso = adjustArrivalIfNextDay(departIso, arriveIso);

      segments.push({
        segmentIndex: 0,
        flightNumber: flightNum,
        aircraft: null,
        departureAirport: origin,
        departureTime: departIso || depTime,
        departureTerminal: null,
        departureGate: null,
        arrivalAirport: destination,
        arrivalTime: arriveIso || arrTime,
        arrivalTerminal: null,
        arrivalGate: null,
        status: "Scheduled",
        layoverDuration: null,
        isChangeOfPlane: false,
      });

      return segments;
    }
  }

  console.log("[lookup] Could not parse flight segments from HTML");
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
    scrapingBeeUrl.searchParams.set("wait", "8000"); // Wait for JavaScript to load

    let response = await fetch(scrapingBeeUrl.toString());

    if (!response.ok) {
      const errText = await response.text().catch(() => "<no body>");
      console.error("[lookup] ScrapingBee primary attempt failed:", response.status, response.statusText, errText);

      // Fallback attempt: try without JS rendering (some pages render static placeholders)
      const fallbackUrl = new URL("https://app.scrapingbee.com/api/v1/");
      fallbackUrl.searchParams.set("api_key", scrapingBeeKey);
      fallbackUrl.searchParams.set("url", config.url);
      fallbackUrl.searchParams.set("render_js", "false");
      fallbackUrl.searchParams.set("premium_proxy", "true");
      fallbackUrl.searchParams.set("wait", "0");

      console.log("[lookup] Retrying ScrapingBee without JS...");
      response = await fetch(fallbackUrl.toString());

      if (!response.ok) {
        const fallbackErrText = await response.text().catch(() => "<no body>");
        console.error("[lookup] ScrapingBee fallback failed:", response.status, response.statusText, fallbackErrText);
        // Return a graceful JSON response so UI can handle it without hanging
        return new Response(
          JSON.stringify({
            error: "Airline site could not be loaded right now. Please try again in a few minutes.",
            scraped: false,
            flights: [],
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const html = await response.text();
    console.log("[lookup] Received HTML, length:", html.length);
    
    // Log multiple sections to find where flight data might be
    console.log("[lookup] HTML start (0-1000):", html.substring(0, 1000));
    console.log("[lookup] HTML middle section (50000-51000):", html.substring(50000, 51000));
    console.log("[lookup] HTML later section (100000-101000):", html.substring(100000, 101000));
    
    // Try to find JSON data embedded in the page
    const jsonMatches = html.match(/\{[^{}]*"flight"[^{}]*\}/gi) || [];
    console.log(`[lookup] Found ${jsonMatches.length} potential JSON flight objects`);
    if (jsonMatches.length > 0) {
      console.log("[lookup] Sample JSON:", jsonMatches[0]);
    }
    
    // Look for any airport codes in the HTML
    const allIATACodes = [...html.matchAll(/\b([A-Z]{3})\b/g)];
    console.log(`[lookup] Found ${allIATACodes.length} three-letter codes in HTML`);
    const uniqueAll = [...new Set(allIATACodes.map(m => m[1]))];
    const validIATA = uniqueAll.filter(c => isValidIATA(c));
    console.log(`[lookup] Unique codes total: ${uniqueAll.length}, valid IATA: ${validIATA.length}`);
    console.log(`[lookup] First 20 codes: ${uniqueAll.slice(0, 20).join(", ")}`);
    console.log(`[lookup] First 20 VALID IATA: ${validIATA.slice(0, 20).join(", ")}`);

    // Extract a base date for segment datetimes
    const baseDate = extractBaseDate(html);
    if (baseDate) {
      console.log("[lookup] Base trip date detected:", baseDate.toISOString());
    } else {
      console.log("[lookup] No base trip date detected; using fallback times");
    }

    const analyticsDateMatch = html.match(/[&?]v10=(\d{2}%2F\d{2}%2F\d{4})/);
    const analyticsDate = analyticsDateMatch ? parseAnalyticsDate(analyticsDateMatch[1]) : null;
    if (!baseDate && analyticsDate) {
      console.log("[lookup] Using analytics date fallback:", analyticsDate.toISOString());
    }

    const baseDateForSegments = baseDate ?? analyticsDate;

    // Extract human-readable total duration first
    const rawDuration = extractWithRegex(html, [
      /total (?:duration|time)[:\s]+([\dh\sm]+)/i,
      /duration[:\s]+([\dh\sm]+)/i,
    ]);
    const totalDurationMinutes = parseDurationToMinutes(rawDuration);

    // Extract flight segments with strict validation FIRST
    const flights = parseFlightSegments(html, baseDateForSegments);
    console.log(`[lookup] Extracted ${flights.length} valid segments`);

    // Infer trip type from segments
    let inferredTripType = null;
    if (flights.length > 0) {
      const firstOrigin = flights[0]?.departureAirport;
      const lastDestination = flights[flights.length - 1]?.arrivalAirport;
      
      // If origin equals final destination, it's likely round-trip
      if (firstOrigin === lastDestination && flights.length > 1) {
        inferredTripType = "round-trip";
      } else if (flights.length === 1) {
        inferredTripType = "one-way";
      } else if (flights.length > 1 && firstOrigin !== lastDestination) {
        // Multiple segments but doesn't return to origin
        inferredTripType = "one-way";
      }
    }

    const tripData: TripData = {
      airline: airline.charAt(0).toUpperCase() + airline.slice(1),
      confirmation: confirmationCode,
      tripType: inferredTripType,
      destination: null, // Will be set from last segment below
      ticketExpiration: extractWithRegex(html, [/ticket expires?[:\s]+([\w\s,]+)/i, /expiration[:\s]+([\w\s,]+)/i]),
      fullRoute: null, // Will be built from segments below
      totalDuration: totalDurationMinutes !== null ? String(totalDurationMinutes) : null,
      passengerName: `${firstName || ""} ${lastName}`.trim(),
      loyaltyStatus: extractWithRegex(html, [/(?:skymiles|medallion)[:\s]+(\w+)/i]),
      fareClass: null, // Don't extract fare class - not useful
      eticketNumber: extractWithRegex(html, [/e-?ticket[:\s#]+([\d-]+)/i, /ticket (?:number|#)[:\s]+([\d-]+)/i]),
      isRefundable: html.toLowerCase().includes("refundable") && !html.toLowerCase().includes("non-refundable"),
      departureDate: null, // Will be set from first segment below
    };

    // Build fullRoute from valid segments only
    if (flights.length > 0) {
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
        tripData.fullRoute = codes.join(" → ");
      }
    }

    // Set destination from last valid segment
    if (flights.length > 0) {
      const lastSeg = flights[flights.length - 1];
      if (lastSeg.arrivalAirport && isValidIATA(lastSeg.arrivalAirport)) {
        tripData.destination = lastSeg.arrivalAirport;
      }
    }

    // Set departure date from first valid segment
    if (flights.length > 0 && flights[0].departureTime) {
      const firstDepartTime = flights[0].departureTime;
      if (typeof firstDepartTime === 'string' && firstDepartTime.includes('T')) {
        // It's an ISO string, extract the date
        tripData.departureDate = firstDepartTime.split('T')[0];
      }
    }

    if (!tripData.departureDate && baseDateForSegments) {
      tripData.departureDate = baseDateForSegments.toISOString().split('T')[0];
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
