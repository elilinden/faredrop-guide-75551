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

    // Parse HTML (basic extraction - in real use, would need more sophisticated parsing)
    // For now, return a placeholder response indicating scraping was successful
    const result = {
      airline: airline.charAt(0).toUpperCase() + airline.slice(1),
      confirmation: confirmationCode,
      scraped: true,
      message: 'HTML retrieved successfully. Flight detail extraction requires airline-specific parsing.',
      htmlLength: html.length,
      flights: [
        {
          flightNumber: 'Extraction pending',
          departureAirport: 'Extraction pending',
          departureTime: 'Extraction pending',
          arrivalAirport: 'Extraction pending',
          arrivalTime: 'Extraction pending',
          status: 'Unknown'
        }
      ]
    };

    console.log('[lookup] Returning result');

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
