import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

type ParsedTrip = {
  pnr?: string;
  airline_code?: string;
  passenger_names?: string[];
  ticket_amount?: number | null;
  currency?: string | null;
  origin_iata?: string;
  destination_iata?: string;
  departure_date?: string;
  return_date?: string | null;
  flight_numbers?: string[];
  adults?: number | null;
  cabin?: Cabin | null;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------- helpers: mapping, dates, validators ----------
const aliasToIata: Record<string, string> = {
  "NYC-LAGUARDIA": "LGA",
  "LAGUARDIA": "LGA",
  "LA GUARDIA": "LGA",
  "JFK": "JFK",
  "LGA": "LGA",
  "EWR": "EWR",
  "ATLANTA": "ATL",
  "ATL": "ATL",
  "TULUM, MX": "TQO",
  "TULUM": "TQO",
  "TQO": "TQO",
};

function labelToIata(s: string): string | undefined {
  const key = s.trim().toUpperCase().replace(/\s+/g, " ");
  return aliasToIata[key];
}

const mon3 = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function toISODate(d: string | undefined | null): string | undefined {
  if (!d) return undefined;
  const ymd = /^\s*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*$/;
  const dmy = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*$/;
  const long = /^\s*(\d{1,2})\s*([A-Za-z]{3,})\s*(\d{4})\s*$/;
  let Y = 0, M = 0, D = 0;
  if (ymd.test(d)) {
    const [, y, m, dd] = d.match(ymd)!;
    Y = +y; M = +m; D = +dd;
  } else if (dmy.test(d)) {
    const [, dd, m, y] = d.match(dmy)!;
    Y = +((y.length === 2) ? `20${y}` : y); M = +m; D = +dd;
  } else if (long.test(d)) {
    const [, dd, mon, y] = d.match(long)!;
    Y = +y; M = mon3.indexOf(mon.slice(0, 3).toUpperCase()) + 1; D = +dd;
  } else return undefined;
  return `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`;
}

function parseDdMonYyyy(s: string) {
  const m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\b/);
  if (!m) return undefined;
  const d = Number(m[1]);
  const mm = mon3.indexOf(m[2].slice(0, 3).toUpperCase()) + 1;
  const yyyy = Number(m[3]);
  if (mm < 1) return undefined;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function extractIssueDateIso(text: string) {
  const m = text.match(/\bIssue Date:\s*(\d{2})([A-Za-z]{3})(\d{2,4})\b/i);
  if (!m) return undefined;
  const d = Number(m[1]);
  const mm = mon3.indexOf(m[2].toUpperCase()) + 1;
  const yy = m[3].length === 2 ? Number("20" + m[3]) : Number(m[3]);
  return `${yy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDdMonNoYear(s: string, baseIso?: string) {
  const m = s.match(/\b(\d{1,2})\s*([A-Za-z]{3})\b/);
  if (!m) return undefined;
  const d = Number(m[1]);
  const mm = mon3.indexOf(m[2].toUpperCase()) + 1;
  if (mm < 1) return undefined;
  const base = baseIso ? new Date(baseIso) : new Date();
  const y0 = base.getUTCFullYear();
  const candidate = new Date(Date.UTC(y0, mm - 1, d));
  const today = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const year = candidate >= today ? y0 : y0 + 1;
  return `${year}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function extractDepartureDate(text: string) {
  const mFull = text.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/i);
  if (mFull) return parseDdMonYyyy(mFull[0]);
  const mNoYear = text.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*\d{1,2}\s*[A-Za-z]{3}\b/i);
  if (mNoYear) return parseDdMonNoYear(mNoYear[0], extractIssueDateIso(text));
  return undefined;
}

function extractRoute(text: string) {
  const mIata = text.match(/\b([A-Z]{3})\s*[-–—]\s*([A-Z]{3})\b/);
  if (mIata) return { origin_iata: mIata[1], destination_iata: mIata[2] };

  const hasOrigin = text.match(/\b(NYC-?LAGUARDIA|LAGUARDIA|LA GUARDIA|JFK|LGA|EWR)\b/i);
  const hasDest = text.match(/\b(TULUM,?\s*MX|TQO)\b/i);
  const origin_iata = hasOrigin ? labelToIata(hasOrigin[0]) : undefined;
  const destination_iata = hasDest ? labelToIata("TULUM, MX") : undefined;
  if (origin_iata && destination_iata) return { origin_iata, destination_iata };
  return {};
}

function validateForPricing(trip: Partial<ParsedTrip>) {
  const errs: string[] = [];
  if (!trip.origin_iata || !/^[A-Z]{3}$/.test(trip.origin_iata)) errs.push("origin_iata");
  if (!trip.destination_iata || !/^[A-Z]{3}$/.test(trip.destination_iata)) errs.push("destination_iata");
  if (!trip.departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(trip.departure_date)) errs.push("departure_date");
  return errs;
}

// ---------- quick regex parse ----------
function quickRegexParse(text: string): Partial<ParsedTrip> {
  const out: Partial<ParsedTrip> = {};
  const pnrMatch = text.match(/\b([A-Z0-9]{6})\b/);
  if (pnrMatch) out.pnr = pnrMatch[1];

  const flights = Array.from(text.matchAll(/\bDELTA\s+(\d{2,4})\b/gi)).map(m => `DL${m[1]}`);
  if (flights.length) {
    out.flight_numbers = Array.from(new Set(flights));
    out.airline_code = "DL";
  }

  Object.assign(out, extractRoute(text));
  const dep = extractDepartureDate(text);
  if (dep) out.departure_date = dep;

  const amt =
    text.match(/TICKET AMOUNT\s*\$?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)\s*(USD|EUR|GBP)?/i) ||
    text.match(/METHOD OF PAYMENT[\s\S]{0,80}?([\$€£]\s?\d[\d,\.\s]*)\s*(USD|EUR|GBP)?/i);
  if (amt) {
    out.ticket_amount = Number(amt[1].replace(/[,\s\$€£]/g, ""));
    out.currency = (amt[2]?.toUpperCase()) || (/\$/.test(amt[0]) ? "USD" : null);
  }

  out.adults = 1;
  out.cabin = "ECONOMY";
  return out;
}

// ---------- AI fallback ----------
async function aiParse(text: string): Promise<Partial<ParsedTrip>> {
  if (!OPENAI_API_KEY) return {};
  
  const schema = {
    type: "object",
    properties: {
      pnr: { type: "string", pattern: "^[A-Z0-9]{6}$" },
      airline_code: { type: "string", pattern: "^[A-Z0-9]{2}$" },
      passenger_names: { type: "array", items: { type: "string" } },
      ticket_amount: { type: "number" },
      currency: { type: "string" },
      origin_iata: { type: "string", pattern: "^[A-Z]{3}$" },
      destination_iata: { type: "string", pattern: "^[A-Z]{3}$" },
      departure_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      return_date: { type: "string", nullable: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      flight_numbers: { type: "array", items: { type: "string" } },
      adults: { type: "number", nullable: true },
      cabin: { type: "string", nullable: true }
    },
    required: ["origin_iata", "destination_iata", "departure_date"],
    additionalProperties: false
  };

  const body = {
    model: "gpt-4o-mini",
    response_format: { 
      type: "json_schema", 
      json_schema: { name: "Trip", schema, strict: true } 
    },
    messages: [
      { 
        role: "system", 
        content: "Extract a flight itinerary from the user's pasted confirmation. Output ONLY JSON conforming to the provided schema. Use IATA airport codes and ISO dates (YYYY-MM-DD). If unknown, omit the field." 
      },
      { role: "user", content: text }
    ]
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${OPENAI_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      console.error("OpenAI API error:", res.status, await res.text());
      return {};
    }
    
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return {};
    
    return JSON.parse(content);
  } catch (e) {
    console.error("AI parse error:", e);
    return {};
  }
}

// ---------- handler ----------
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text } = body;
    
    // Input validation
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing 'text' string" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Enforce 50KB maximum size
    if (text.length > 51200) {
      return new Response(
        JSON.stringify({ ok: false, error: "Text input exceeds maximum size of 50KB" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) quick regex pass
    let parsed: Partial<ParsedTrip> = { ...quickRegexParse(text) };

    // 2) AI fallback if minimal fields missing
    const missing = validateForPricing(parsed);
    if (missing.length && OPENAI_API_KEY) {
      const ai = await aiParse(text);
      parsed = { ...ai, ...parsed }; // prefer regex matches when both exist
    }

    // Final normalize
    if (parsed.origin_iata) parsed.origin_iata = parsed.origin_iata.toUpperCase();
    if (parsed.destination_iata) parsed.destination_iata = parsed.destination_iata.toUpperCase();
    if (parsed.airline_code) parsed.airline_code = parsed.airline_code.toUpperCase();
    if (parsed.departure_date) parsed.departure_date = toISODate(parsed.departure_date) ?? parsed.departure_date;
    if (parsed.return_date) parsed.return_date = toISODate(parsed.return_date) ?? null;
    if (!parsed.adults) parsed.adults = 1;

    const stillMissing = validateForPricing(parsed);
    if (stillMissing.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          trip: parsed,
          message: "We couldn't extract enough details. Please add origin, destination, and departure date."
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return parsed data only - client code handles database operations
    return new Response(
      JSON.stringify({ ok: true, trip: parsed }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-magic-paste error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Bad request" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
