import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://faredrop.lovable.app';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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

async function fetchPublicFare(trip: any): Promise<{ price: number; confidence: string } | null> {
  // TODO: Wire real pricing provider (Amadeus/Skyscanner/Duffel)
  console.log(`[fetchPublicFare] Stub for trip ${trip.id}`);
  return null;
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

async function checkTrip(trip: any) {
  console.log(`[checkTrip] Checking trip ${trip.id}`);

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

  // Update last_checked_at regardless of result
  const updateData: any = {
    last_checked_at: new Date().toISOString(),
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
    const threshold = trip.monitor_threshold || 1.0;
    const lastSignalAt = trip.last_signal_at ? new Date(trip.last_signal_at) : null;
    const now = new Date();
    const hoursSinceLastSignal = lastSignalAt 
      ? (now.getTime() - lastSignalAt.getTime()) / (1000 * 60 * 60)
      : 999;

    if (diff >= threshold && hoursSinceLastSignal >= 24) {
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
    // Fetch active trips with monitoring enabled
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
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

    // Filter trips that need checking (skip if checked recently)
    const now = new Date();
    const tripsToCheck = trips.filter(trip => {
      if (!trip.last_checked_at) return true;
      
      const lastChecked = new Date(trip.last_checked_at);
      const minutesSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60);
      const frequency = trip.monitor_frequency_minutes || 180;
      
      // Grace period of 5 minutes to prevent overlap
      return minutesSinceCheck >= (frequency - 5);
    });

    console.log(`[price-watch] ${tripsToCheck.length} trips need checking`);

    // Check trips in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < tripsToCheck.length; i += batchSize) {
      const batch = tripsToCheck.slice(i, i + batchSize);
      await Promise.all(batch.map(trip => checkTrip(trip).catch(err => {
        console.error(`[price-watch] Error checking trip ${trip.id}:`, err);
      })));
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
