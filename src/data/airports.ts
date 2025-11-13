export interface Airport {
  name: string;
  city?: string;
  country?: string;
  iata: string;
  icao?: string;
  latitude?: number;
  longitude?: number;
  iso?: string;
  status?: number;
  continent?: string;
  type?: string;
  size?: string;
  lon?: string;
  lat?: string;
  [key: string]: any;
}

import rawAirports from "./airports.json";

export const AIRPORTS: Airport[] = (rawAirports as Airport[])
  .filter(a => a.iata && a.iata.trim().length === 3 && a.status === 1)
  .map(a => ({
    ...a,
    iata: a.iata.toUpperCase(),
  }));
