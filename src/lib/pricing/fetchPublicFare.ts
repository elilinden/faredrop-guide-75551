export type Confidence = 'exact-flight' | 'route-estimate' | 'unknown';

export interface PublicFareResult {
  price: number;
  confidence: Confidence;
}

/**
 * Fetch public fare for a trip.
 * 
 * TODO: Wire real pricing provider (Amadeus / Skyscanner / Duffel)
 * - For exact-flight: use carrier + flight_number + depart_datetime from segments
 * - For route-estimate: use airports + dates with flexible search
 * - Return lowest fare matching same cabin class if possible
 * 
 * Feature flag: process.env.PRICING_PROVIDER
 */
export async function fetchPublicFare(trip: any): Promise<PublicFareResult | null> {
  // Stub implementation - returns null so system updates last_checked_at without price
  // When implementing:
  // 1. Check if trip has segments with exact flight info
  // 2. Call pricing API with appropriate parameters
  // 3. Handle rate limits and errors gracefully
  // 4. Return { price, confidence } or null if unavailable
  
  console.log(`[fetchPublicFare] Stub called for trip ${trip.id} - no provider configured`);
  return null;
}
