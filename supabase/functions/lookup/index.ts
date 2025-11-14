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

// Helper to validate if a string is a valid 3-letter IATA code
function isValidIATA(code: string | null): boolean {
  return !!code && /^[A-Z]{3}$/.test(code);
}

// Helper to validate if a string is a valid flight number
function isValidFlightNumber(num: string | null): boolean {
  return !!num && /^[A-Z]{2}\d+$/.test(num);
}

// Helper to parse flight segments from HTML with strict validation
function parseFlightSegments(html: string, baseDate: Date | null): any[] {
  const segments: any[] = [];

  // Look for flight segment blocks with strict pattern matching
  // Pattern: Flight number followed by route with times
  const segmentBlockPattern = /(?:Flight|Flt|DL|UA|AA|AS)\s*#?\s*(\d{1,4})\b[\s\S]{0,200}?([A-Z]{3})\s+(?:to|→|-|–)\s+([A-Z]{3})[\s\S]{0,200}?(\d{1,2}:\d{2}\s*(?:AM|PM))[\s\S]{0,100}?(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
  
  const blockMatches = [...html.matchAll(segmentBlockPattern)];
  
  for (let i = 0; i < blockMatches.length; i++) {
    const match = blockMatches[i];
    const flightNum = match[1];
    const depAirport = match[2];
    const arrAirport = match[3];
    const depTime = match[4];
    const arrTime = match[5];

    // Validate IATA codes
    if (!isValidIATA(depAirport) || !isValidIATA(arrAirport)) {
      console.log(`[lookup] Skipping invalid segment: ${depAirport} → ${arrAirport}`);
      continue;
    }

    // Build full flight number (assuming DL for Delta, adjust per airline)
    const fullFlightNumber = `DL${flightNum}`;
    
    if (!isValidFlightNumber(fullFlightNumber)) {
      console.log(`[lookup] Skipping invalid flight number: ${fullFlightNumber}`);
      continue;
    }

    // Convert times to ISO if we have a base date
    const departDateTimeIso = baseDate && depTime ? combineDateAndTime(baseDate, depTime) : null;
    const arriveDateTimeIso = baseDate && arrTime ? combineDateAndTime(baseDate, arrTime) : null;

    // Look for aircraft info near this segment
    const aircraftMatch = match[0].match(/(?:Aircraft|Equipment)[\s:]+([A-Z0-9-]{3,10})/i);
    const statusMatch = match[0].match(/(?:On Time|Delayed|Cancelled)/i);

    segments.push({
      segmentIndex: i,
      flightNumber: fullFlightNumber,
      aircraft: aircraftMatch ? aircraftMatch[1] : null,
      departureAirport: depAirport,
      departureTime: departDateTimeIso || depTime,
      departureTerminal: null,
      departureGate: null,
      arrivalAirport: arrAirport,
      arrivalTime: arriveDateTimeIso || arrTime,
      arrivalTerminal: null,
      arrivalGate: null,
      status: statusMatch ? statusMatch[0] : "Scheduled",
      layoverDuration: null,
      isChangeOfPlane: false,
    });

    console.log(`[lookup] Parsed valid segment ${i}: ${fullFlightNumber} ${depAirport} → ${arrAirport}`);
  }

  // If the complex pattern didn't work, try a simpler fallback with strict validation
  if (segments.length === 0) {
    console.log("[lookup] Trying fallback segment parsing...");
    
    // Try to find any text containing flight info patterns
    // Look for patterns like: "DL 123" or "Flight 123"
    const flightPattern = /\b(?:DL|Delta)\s*(\d{1,4})\b/gi;
    const flightMatches = [...html.matchAll(flightPattern)];
    console.log(`[lookup] Found ${flightMatches.length} potential flight numbers`);
    
    // Look for airport code pairs (3 capital letters followed by "to" or arrow followed by 3 capital letters)
    const routePattern = /\b([A-Z]{3})\s*(?:to|-|–|→)\s*([A-Z]{3})\b/g;
    const routeMatches = [...html.matchAll(routePattern)];
    console.log(`[lookup] Found ${routeMatches.length} potential routes`);
    
    // Look for time patterns
    const timePattern = /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/gi;
    const timeMatches = [...html.matchAll(timePattern)];
    console.log(`[lookup] Found ${timeMatches.length} potential times`);

    // Try to match them up
    const minCount = Math.min(flightMatches.length, routeMatches.length);
    console.log(`[lookup] Attempting to match ${minCount} potential segments`);
    
    for (let i = 0; i < minCount; i++) {
      const flightNum = `DL${flightMatches[i][1]}`;
      const depAirport = routeMatches[i][1];
      const arrAirport = routeMatches[i][2];
      
      console.log(`[lookup] Validating segment ${i}: ${flightNum} ${depAirport}->${arrAirport}`);
      
      // Strict validation
      if (!isValidFlightNumber(flightNum) || !isValidIATA(depAirport) || !isValidIATA(arrAirport)) {
        console.log(`[lookup] Fallback: Skipping invalid segment ${i}`);
        continue;
      }

      const depTime = timeMatches[i * 2]?.[1];
      const arrTime = timeMatches[i * 2 + 1]?.[1];

      if (!depTime || !arrTime) {
        console.log(`[lookup] Fallback: Missing times for segment ${i}, dep=${depTime}, arr=${arrTime}`);
        continue;
      }

      const departDateTimeIso = baseDate && depTime ? combineDateAndTime(baseDate, depTime) : null;
      const arriveDateTimeIso = baseDate && arrTime ? combineDateAndTime(baseDate, arrTime) : null;

      segments.push({
        segmentIndex: i,
        flightNumber: flightNum,
        aircraft: null,
        departureAirport: depAirport,
        departureTime: departDateTimeIso || depTime,
        departureTerminal: null,
        departureGate: null,
        arrivalAirport: arrAirport,
        arrivalTime: arriveDateTimeIso || arrTime,
        arrivalTerminal: null,
        arrivalGate: null,
        status: "Scheduled",
        layoverDuration: null,
        isChangeOfPlane: false,
      });

      console.log(`[lookup] Fallback: Parsed segment ${i}: ${flightNum} ${depAirport} → ${arrAirport}`);
    }
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
    
    // Log a sample of the HTML for debugging (first 2000 chars)
    console.log("[lookup] HTML sample:", html.substring(0, 2000));

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

    // Extract flight segments with strict validation FIRST
    const flights = parseFlightSegments(html, baseDate);
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

    const tripData: any = {
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
