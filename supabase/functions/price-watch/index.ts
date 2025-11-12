import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://faredrop.lovable.app';

const AMADEUS_ENV = (Deno.env.get("AMADEUS_ENV") || "test") === "production" ? "production" : "test";
const AMADEUS_HOST = AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

function missingForPricing(trip: any) {
  const miss: string[] = [];
  if (!trip.origin_iata || !/^[A-Z]{3}$/.test(trip.origin_iata)) miss.push("origin_iata");
  if (!trip.destination_iata || !/^[A-Z]{3}$/.test(trip.destination_iata)) miss.push("destination_iata");
  if (!trip.departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(trip.departure_date)) miss.push("departure_date");
  return miss;
}

const manageTripLinks: Record<string, string> = {
  AA: 'https://www.aa.com/reservation/view/find-your-reservation',
  DL: 'https://www.delta.com/my-trips/trip-details',
  UA: 'https://www.united.com/en/us/manageres/mytrips',
  AS: 'https://www.alaskaair.com/booking/reservation-lookup',
};

const airlineNames: Record<string, string> = {
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  AS: 'Alaska Airlines',
};

function computeCheckFrequency(departDate: string | null, userPrefs: any, tripOverride: number | null): number {
  // Use trip override if set
  if (tripOverride) return tripOverride;
  
  // Use fixed mode if user prefers
  if (userPrefs?.monitor_mode === 'fixed') {
    return userPrefs.monitor_frequency_minutes || 180;
  }
  
  // Auto mode: compute based on days to departure
  if (!departDate) return 180; // Default 3h if no date
  
  const now = new Date();
  const depart = new Date(departDate);
  const daysUntil = Math.floor((depart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil > 90) return 1440; // 24h
  if (daysUntil > 30) return 360;  // 6h
  if (daysUntil > 7) return 180;   // 3h
  return 60; // 1h
}

/**
 * Get Amadeus access token.
 */
async function getAmadeusAccessToken(): Promise<string> {
  const clientId = Deno.env.get("AMADEUS_CLIENT_ID");
  const clientSecret = Deno.env.get("AMADEUS_CLIENT_SECRET");
  const bearer = Deno.env.get("AMADEUS_API_KEY");

  if (clientId && clientSecret) {
    const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amadeus auth failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.access_token as string;
  }

  if (bearer) {
    return bearer.startsWith("Bearer ") ? bearer.slice(7) : bearer;
  }

  throw new Error("Missing Amadeus credentials: set AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET or AMADEUS_API_KEY.");
}

/**
 * Extract trip search parameters from trip data or segments.
 */
function mapTripToSearchParams(trip: any) {
  let origin = trip.origin_iata ?? trip.from_iata ?? trip.origin ?? trip.from;
  let destination = trip.destination_iata ?? trip.to_iata ?? trip.destination ?? trip.to;
  let departureDate = trip.depart_date ?? trip.departure_date ?? trip.outbound_date;
  let returnDate = trip.return_date ?? trip.inbound_date;

  // Try to extract from segments if not found
  if ((!origin || !destination || !departureDate) && trip.segments?.length > 0) {
    const firstSeg = trip.segments[0];
    const lastSeg = trip.segments[trip.segments.length - 1];
    
    origin = origin || firstSeg.depart_airport;
    destination = destination || lastSeg.arrive_airport;
    
    if (!departureDate && firstSeg.depart_datetime) {
      departureDate = firstSeg.depart_datetime.split('T')[0];
    }
  }

  const adults = trip.adults ?? 1;
  const cabin = trip.cabin ?? undefined;

  return { origin, destination, departureDate, returnDate, adults, cabin };
}

async function fetchPublicFare(trip: any): Promise<{ price: number; confidence: string } | null> {
  const { origin, destination, departureDate, returnDate, adults, cabin } = mapTripToSearchParams(trip);

  if (!origin || !destination || !departureDate) {
    console.warn(`[fetchPublicFare] Missing origin/destination/departureDate on trip ${trip.id}`);
    return null;
  }

  try {
    const token = await getAmadeusAccessToken();

    const url = new URL(`${AMADEUS_HOST}/v2/shopping/flight-offers`);
    url.searchParams.set("originLocationCode", origin);
    url.searchParams.set("destinationLocationCode", destination);
    url.searchParams.set("departureDate", departureDate);
    if (returnDate) url.searchParams.set("returnDate", returnDate);
    url.searchParams.set("adults", String(adults ?? 1));
    if (cabin) url.searchParams.set("travelClass", cabin);
    url.searchParams.set("currencyCode", "USD");
    url.searchParams.set("max", "10");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[fetchPublicFare] Amadeus search failed: ${res.status}`, text);
      return null;
    }

    const data = (await res.json()) as {
      data?: Array<{ price?: { grandTotal?: string; currency?: string } }>;
    };

    const first = data?.data?.[0];
    const total = first?.price?.grandTotal;

    if (!total) {
      console.log(`[fetchPublicFare] No offers found for trip ${trip.id}`);
      return null;
    }

    // Determine confidence based on exact flight info
    const hasExactFlightInfo = trip.segments?.length > 0 &&
      trip.segments.every((s: any) => s.carrier && s.flight_number && s.depart_airport && s.arrive_airport);

    console.log(`[fetchPublicFare] Found price $${total} for trip ${trip.id} (confidence: ${hasExactFlightInfo ? 'exact-flight' : 'route-estimate'})`);

    return {
      price: Number(total),
      confidence: hasExactFlightInfo ? "exact-flight" : "route-estimate",
    };
  } catch (e) {
    console.error(`[fetchPublicFare] Error for trip ${trip.id}:`, e);
    // Dev fallback if enabled
    if (Deno.env.get("ALLOW_DUMMY_PRICES") === "true") {
      console.log(`[fetchPublicFare] Using dummy price for trip ${trip.id}`);
      return { price: 123.45, confidence: "route-estimate" };
    }
    return null;
  }
}

async function sendPriceAlert(trip: any, diff: number, publicPrice: number) {
  if (!resend) {
    console.log('[sendPriceAlert] Resend not configured, skipping email');
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', trip.user_id)
    .single();

  if (!profile?.email) {
    console.log('[sendPriceAlert] No email found for user');
    return;
  }

  const airlineName = airlineNames[trip.airline] || trip.airline;
  const manageTripUrl = manageTripLinks[trip.airline];
  const tripUrl = `${appBaseUrl}/trips/${trip.id}`;

  const requiresFirstName = ['AA', 'DL'].includes(trip.airline);
  const nameFields = requiresFirstName
    ? `PNR: ${trip.confirmation_code} | First name: ${trip.first_name || 'N/A'} | Last name: ${trip.last_name}`
    : `PNR: ${trip.confirmation_code} | Last name: ${trip.last_name}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">
        💰 Price drop found on your ${airlineName} trip
      </h1>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; color: #374151;">
          We just checked and public prices look about <strong style="color: #10b981;">$${diff.toFixed(2)} lower</strong> than what you paid.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
          You paid: $${trip.paid_total.toFixed(2)} → Current: ~$${publicPrice.toFixed(2)}
        </p>
      </div>

      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        To see your actual airline credit, open the airline's Change screen:
      </p>

      <div style="margin: 20px 0;">
        <a href="${manageTripUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 8px;">
          Open ${airlineName} Manage Trip
        </a>
        <a href="${tripUrl}" style="display: inline-block; background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Open in FareDrop
        </a>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
          You'll need these to access your trip:
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f; font-family: monospace;">
          ${nameFields}
        </p>
      </div>

      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
        <strong>Important:</strong> We never log in or change your booking. Alerts are based on public prices; 
        the airline's Change preview is the source of truth. This is a ${trip.last_confidence || 'route-estimate'} signal.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'FareDrop Guide <alerts@updates.lovable.app>',
      to: [profile.email],
      subject: `Price drop found on your ${airlineName} trip: ~$${diff.toFixed(2)} cheaper`,
      html,
    });
    console.log(`[sendPriceAlert] Email sent to ${profile.email}`);
  } catch (error) {
    console.error('[sendPriceAlert] Error sending email:', error);
  }
}

async function checkTrip(trip: any, userPrefs: any) {
  console.log(`[checkTrip] Checking trip ${trip.id}`);

  // Validate trip has required pricing fields
  const miss = missingForPricing(trip);
  if (miss.length) {
    // If missing required fields but has segments, try to derive from segments
    if (!trip.segments || trip.segments.length === 0) {
      console.warn(`[checkTrip] Trip ${trip.id} missing required fields and has no segments: ${miss.join(', ')}`);
      // Schedule next check anyway to avoid breaking the queue
      const now = new Date();
      const freqMinutes = computeCheckFrequency(trip.depart_date, userPrefs, trip.monitor_frequency_minutes);
      const nextCheckAt = new Date(now.getTime() + freqMinutes * 60 * 1000);
      await supabase.from('trips').update({ 
        last_checked_at: now.toISOString(),
        next_check_at: nextCheckAt.toISOString() 
      }).eq('id', trip.id);
      return;
    }
  }

  // Add jitter to avoid bursts
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

  let publicFare = null;
  let retries = 0;
  const maxRetries = 2;

  while (retries <= maxRetries && !publicFare) {
    try {
      publicFare = await fetchPublicFare(trip);
      break;
    } catch (error) {
      retries++;
      if (retries <= maxRetries) {
        const delay = Math.pow(4, retries) * 250; // 250ms, 1s, 4s
        console.log(`[checkTrip] Retry ${retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[checkTrip] Failed after ${maxRetries} retries:`, error);
      }
    }
  }

  const now = new Date();
  
  // Compute next check time
  const freqMinutes = computeCheckFrequency(
    trip.depart_date,
    userPrefs,
    trip.monitor_frequency_minutes
  );
  const nextCheckAt = new Date(now.getTime() + freqMinutes * 60 * 1000);

  // Update last_checked_at and next_check_at regardless of result
  const updateData: any = {
    last_checked_at: now.toISOString(),
    next_check_at: nextCheckAt.toISOString(),
  };

  if (publicFare) {
    const diff = trip.paid_total - publicFare.price;
    
    updateData.last_public_price = publicFare.price;
    updateData.last_confidence = publicFare.confidence;

    // Insert into price_checks history
    await supabase.from('price_checks').insert({
      trip_id: trip.id,
      observed_price: publicFare.price,
      diff_vs_paid: diff,
      confidence: publicFare.confidence,
    });

    // Send email if drop >= threshold and no email sent in last 24h
    const userThreshold = userPrefs?.min_drop_threshold || 10;
    const tripThreshold = trip.monitor_threshold || 1.0;
    const threshold = Math.max(userThreshold, tripThreshold);
    
    const lastSignalAt = trip.last_signal_at ? new Date(trip.last_signal_at) : null;
    const hoursSinceLastSignal = lastSignalAt 
      ? (now.getTime() - lastSignalAt.getTime()) / (1000 * 60 * 60)
      : 999;

    const emailEnabled = userPrefs?.email_alerts_enabled !== false;

    if (emailEnabled && diff >= threshold && hoursSinceLastSignal >= 24) {
      await sendPriceAlert(trip, diff, publicFare.price);
      updateData.last_signal_at = now.toISOString();
    }
  }

  await supabase.from('trips').update(updateData).eq('id', trip.id);
  console.log(`[checkTrip] Updated trip ${trip.id}`);
}

Deno.serve(async (req) => {
  console.log('[price-watch] Starting scheduled check');

  try {
    // Fetch active trips with monitoring enabled, including segments
    const { data: trips, error } = await supabase
      .from('trips')
      .select(`
        *,
        segments (
          carrier,
          flight_number,
          depart_airport,
          arrive_airport,
          depart_datetime
        )
      `)
      .eq('monitoring_enabled', true)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) throw error;

    console.log(`[price-watch] Found ${trips?.length || 0} trips to check`);

    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get unique user IDs and fetch their preferences
    const userIds = [...new Set(trips.map(t => t.user_id))];
    const { data: prefsData } = await supabase
      .from('user_preferences')
      .select('*')
      .in('user_id', userIds);
    
    const prefsMap = new Map(prefsData?.map(p => [p.user_id, p]) || []);

    // Filter trips that need checking (skip if checked recently)
    const now = new Date();
    const tripsToCheck = trips.filter(trip => {
      if (!trip.last_checked_at) return true;
      
      const lastChecked = new Date(trip.last_checked_at);
      const minutesSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60);
      
      const userPrefs = prefsMap.get(trip.user_id);
      const frequency = computeCheckFrequency(trip.depart_date, userPrefs, trip.monitor_frequency_minutes);
      
      // Grace period of 5 minutes to prevent overlap
      return minutesSinceCheck >= (frequency - 5);
    });

    console.log(`[price-watch] ${tripsToCheck.length} trips need checking`);

    // Check trips in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < tripsToCheck.length; i += batchSize) {
      const batch = tripsToCheck.slice(i, i + batchSize);
      await Promise.all(batch.map(trip => {
        const userPrefs = prefsMap.get(trip.user_id);
        return checkTrip(trip, userPrefs).catch(err => {
          console.error(`[price-watch] Error checking trip ${trip.id}:`, err);
        });
      }));
    }

    return new Response(JSON.stringify({ checked: tripsToCheck.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[price-watch] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
