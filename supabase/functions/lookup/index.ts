import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Helper to parse flight segments from HTML
function parseFlightSegments(html: string): any[] {
  const segments: any[] = [];
  
  // Try to extract flight numbers
  const flightPattern = /(?:Flight|Flt)[\s:]+([A-Z]{2}[\s-]?\d+)/gi;
  const flightMatches = [...html.matchAll(flightPattern)];
  
  // Try to extract routes (airport codes)
  const routePattern = /([A-Z]{3})\s*(?:to|→|->|–)\s*([A-Z]{3})/gi;
  const routeMatches = [...html.matchAll(routePattern)];
  
  // Try to extract times
  const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  const timeMatches = [...html.matchAll(timePattern)];
  
  // Try to match aircraft types
  const aircraftPattern = /(?:Aircraft|Plane|Equipment)[\s:]+([A-Z0-9-]+)/gi;
  const aircraftMatches = [...html.matchAll(aircraftPattern)];
  
  const segmentCount = Math.max(flightMatches.length, routeMatches.length, 1);
  
  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      segmentIndex: i,
      flightNumber: flightMatches[i] ? flightMatches[i][1].replace(/\s+/g, '') : null,
      aircraft: aircraftMatches[i] ? aircraftMatches[i][1] : null,
      departureAirport: routeMatches[i] ? routeMatches[i][1] : null,
      departureTime: timeMatches[i * 2] ? timeMatches[i * 2][1] : null,
      departureTerminal: null,
      departureGate: null,
      arrivalAirport: routeMatches[i] ? routeMatches[i][2] : null,
      arrivalTime: timeMatches[i * 2 + 1] ? timeMatches[i * 2 + 1][1] : null,
      arrivalTerminal: null,
      arrivalGate: null,
      status: html.match(/(?:on time|delayed|cancelled)/i)?.[0] || 'Scheduled',
      layoverDuration: null,
      isChangeOfPlane: false
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
      submit: 'button[type="submit"]'
    },
    resultSelectors: {
      flightNumber: '.flight-number',
      departureAirport: '.departure-airport',
      arrivalAirport: '.arrival-airport',
      departureTime: '.departure-time',
      arrivalTime: '.arrival-time',
      status: '.flight-status'
    }
  },
  united: {
    url: "https://www.united.com/en/us/mytrips/",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="confirmationNumber"]',
      name: 'input[name="lastName"]',
      submit: 'button[type="submit"]'
    },
    resultSelectors: {}
  },
  american: {
    url: "https://www.aa.com/reservation/search",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="recordLocator"]',
      name: 'input[name="lastName"]',
      submit: 'button[type="submit"]'
    },
    resultSelectors: {}
  },
  alaska: {
    url: "https://www.alaskaair.com/booking/reservation-lookup",
    needsFullName: false,
    formSelectors: {
      confirmation: 'input[name="confirmationCode"]',
      name: 'input[name="lastName"]',
      submit: 'button[type="submit"]'
    },
    resultSelectors: {}
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { confirmationCode, firstName, lastName, airline } = await req.json();

    console.log('[lookup] Request received:', { confirmationCode, airline, hasFirstName: !!firstName, hasLastName: !!lastName });

    // Validate inputs
    if (!confirmationCode || !lastName || !airline) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: confirmationCode, lastName, and airline' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get airline config
    const config = airlineConfigs[airline.toLowerCase()];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unsupported airline: ${airline}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine name to use
    const nameToUse = config.needsFullName && firstName
      ? `${firstName} ${lastName}`
      : lastName;

    console.log('[lookup] Calling ScrapingBee for', airline);

    // Call ScrapingBee
    const scrapingBeeKey = Deno.env.get("SCRAPINGBEE_API_KEY");
    if (!scrapingBeeKey) {
      console.error('[lookup] ScrapingBee API key not configured');
      return new Response(
        JSON.stringify({ error: 'ScrapingBee API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapingBeeUrl = new URL("https://app.scrapingbee.com/api/v1/");
    scrapingBeeUrl.searchParams.set("api_key", scrapingBeeKey);
    scrapingBeeUrl.searchParams.set("url", config.url);
    scrapingBeeUrl.searchParams.set("render_js", "true");
    scrapingBeeUrl.searchParams.set("premium_proxy", "true");
    scrapingBeeUrl.searchParams.set("wait", "5000");

    const response = await fetch(scrapingBeeUrl.toString());

    if (!response.ok) {
      console.error('[lookup] ScrapingBee error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to scrape airline website: ${response.statusText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('[lookup] Received HTML, length:', html.length);

    // Extract trip-level data using regex patterns
    const tripData: any = {
      airline: airline.charAt(0).toUpperCase() + airline.slice(1),
      confirmation: confirmationCode,
      tripType: extractWithRegex(html, [
        /trip type[:\s]+(\w+)/i,
        /(\w+)\s+trip/i
      ]) || 'round-trip',
      destination: extractWithRegex(html, [
        /destination[:\s]+([A-Z]{3})/i,
        /to[:\s]+([A-Z]{3})/i
      ]),
      ticketExpiration: extractWithRegex(html, [
        /ticket expires?[:\s]+([\w\s,]+)/i,
        /expiration[:\s]+([\w\s,]+)/i
      ]),
      fullRoute: extractWithRegex(html, [
        /route[:\s]+([\w\s\u2192\u2013\->]+)/i
      ]),
      totalDuration: extractWithRegex(html, [
        /total (?:duration|time)[:\s]+([\dh\sm]+)/i,
        /duration[:\s]+([\dh\sm]+)/i
      ]),
      passengerName: `${firstName} ${lastName}`,
      loyaltyStatus: extractWithRegex(html, [
        /(?:skymiles|frequent flyer|loyalty)[:\s]+(\w+)/i,
        /(\w+)\s+member/i
      ]),
      fareClass: extractWithRegex(html, [
        /(?:fare|cabin|class)[:\s]+(\w+)/i,
        /(economy|business|first|premium)/i
      ]),
      eticketNumber: extractWithRegex(html, [
        /e-?ticket[:\s#]+([\d-]+)/i,
        /ticket (?:number|#)[:\s]+([\d-]+)/i
      ]),
      isRefundable: html.toLowerCase().includes('refundable') && !html.toLowerCase().includes('non-refundable')
    };

    // Extract flight segments
    const flights = parseFlightSegments(html);

    const result = {
      ...tripData,
      flights,
      scraped: true,
      segmentCount: flights.length
    };

    console.log('[lookup] Returning result with', flights.length, 'segments');

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lookup] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
