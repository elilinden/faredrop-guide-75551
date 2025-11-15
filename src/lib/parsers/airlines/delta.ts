// Delta My Trips HTML parser for browser/Vite (client-side)
// Uses lightweight string parsing only - no Cheerio needed

export type ParsedTripDelta = {
  pnr?: string;
  origin_iata?: string;
  destination_iata?: string;
  departure_date?: string;
  return_date?: string | null;
  flight_numbers?: string[];
  confidence?: "exact-flight" | "route-estimate" | "unknown";
};

function collectBeaconSources(html: string): string[] {
  const sources: string[] = [];
  const regex = /<script[^>]+src=["']([^"']*smetrics\.delta\.com\/b\/ss\/[^"']*)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    sources.push(match[1]);
  }
  return sources;
}

function parseBeaconParams(html: string): URLSearchParams | null {
  const sources = collectBeaconSources(html);
  if (!sources.length) return null;

  const merged = new URLSearchParams();
  let found = false;

  for (const src of sources) {
    const idx = src.indexOf("?");
    if (idx === -1) continue;
    const qs = src.slice(idx + 1);
    const params = new URLSearchParams(qs);
    params.forEach((value, key) => merged.set(key, value));
    found = true;
  }

  return found ? merged : null;
}

function mmddyyyyToISO(s?: string | null): string | undefined {
  if (!s) return undefined;
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, mm, dd, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBodyText(html: string): string {
  return stripHtml(html);
}

function extractFlightNumbers(text: string): string[] {
  const set = new Set<string>();
  const regex = /\b((?:DL|AA|UA|AS|B6|WN)\s?\d{1,4})\b/gi;
  text.replace(regex, (_match, full: string) => {
    const normalized = full.replace(/\s+/g, "").toUpperCase();
    set.add(normalized);
    return full;
  });
  return Array.from(set);
}

export function parseDeltaMyTripsHTML(html: string): ParsedTripDelta {
  const out: ParsedTripDelta = { confidence: "unknown" };

  const beaconParams = parseBeaconParams(html);
  if (beaconParams) {
    out.pnr = beaconParams.get("v91") ?? undefined;
    out.origin_iata = beaconParams.get("v4") ?? undefined;
    out.destination_iata = beaconParams.get("v5") ?? undefined;

    const departIso = mmddyyyyToISO(beaconParams.get("v10"));
    if (departIso) out.departure_date = departIso;

    const returnIso = mmddyyyyToISO(beaconParams.get("v11"));
    if (returnIso && returnIso !== departIso) out.return_date = returnIso;

    if (out.origin_iata && out.destination_iata) {
      out.confidence = "route-estimate";
    }
  }

  const bodyText = extractBodyText(html);

  if (!out.pnr) {
    const pnrMatch = bodyText.match(/\b([A-Z0-9]{6})\b/);
    if (pnrMatch) out.pnr = pnrMatch[1];
  }

  if (!out.origin_iata || !out.destination_iata) {
    const routeMatch = bodyText.match(/\b([A-Z]{3})\s*[-–>\u2192]\s*([A-Z]{3})\b/);
    if (routeMatch) {
      if (!out.origin_iata) out.origin_iata = routeMatch[1];
      if (!out.destination_iata) out.destination_iata = routeMatch[2];
    }
  }

  const flightNumbers = extractFlightNumbers(bodyText);
  if (flightNumbers.length) {
    out.flight_numbers = flightNumbers;
  }

  return out;
}
