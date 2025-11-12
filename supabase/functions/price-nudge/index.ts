import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:5173";
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting price nudge check...");

    // Fetch active trips with monitoring enabled
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select(`
        id,
        airline,
        confirmation_code,
        last_name,
        first_name,
        paid_total,
        brand,
        monitoring_enabled,
        monitor_threshold,
        last_signal_at,
        last_signal_price,
        user_id,
        depart_date,
        segments (
          carrier,
          flight_number,
          depart_airport,
          arrive_airport,
          depart_datetime
        ),
        profiles!inner (
          email
        )
      `)
      .eq("status", "active")
      .eq("monitoring_enabled", true)
      .not("brand", "ilike", "%basic%");

    if (tripsError) {
      console.error("Error fetching trips:", tripsError);
      throw tripsError;
    }

    console.log(`Found ${trips?.length || 0} trips to monitor`);

    let emailsSent = 0;
    let signalsCreated = 0;

    for (const trip of trips || []) {
      try {
        // Rate limiting: skip if we sent a signal in the last 24 hours
        if (trip.last_signal_at) {
          const lastSignalTime = new Date(trip.last_signal_at).getTime();
          const now = Date.now();
          const hoursSinceLastSignal = (now - lastSignalTime) / (1000 * 60 * 60);

          if (hoursSinceLastSignal < 24) {
            console.log(`Skipping trip ${trip.id}: last signal was ${hoursSinceLastSignal.toFixed(1)}h ago`);
            continue;
          }
        }

        // TODO: Fetch public fare (stub for now)
        // When implemented, wire to Amadeus/Skyscanner/Duffel
        const publicPrice = await fetchPublicFare(trip);

        if (publicPrice === null) {
          console.log(`No public price found for trip ${trip.id}`);
          continue;
        }

        const diff = trip.paid_total - publicPrice.price;
        const threshold = trip.monitor_threshold || 20;

        console.log(
          `Trip ${trip.id}: paid $${trip.paid_total}, current $${publicPrice.price}, diff $${diff}, threshold $${threshold}`
        );

        if (diff >= threshold) {
          // Insert signal
          const { error: signalError } = await supabase.from("price_signals").insert({
            trip_id: trip.id,
            observed_price: publicPrice.price,
            diff_vs_paid: diff,
            confidence: publicPrice.confidence,
          });

          if (signalError) {
            console.error(`Error inserting signal for trip ${trip.id}:`, signalError);
            continue;
          }

          signalsCreated++;

          // Update trip
          await supabase
            .from("trips")
            .update({
              last_signal_at: new Date().toISOString(),
              last_signal_price: publicPrice.price,
            })
            .eq("id", trip.id);

          // Send email
          const profileData: any = trip.profiles;
          const email = profileData?.email;
          if (!email) {
            console.log(`No email for trip ${trip.id}`);
            continue;
          }

          const manageTripUrls: Record<string, string> = {
            AA: "https://www.aa.com/reservation/view/find-your-reservation",
            DL: "https://www.delta.com/my-trips/trip-details",
            UA: "https://www.united.com/en/us/manageres/mytrips",
            AS: "https://www.alaskaair.com/booking/reservation-lookup",
          };

          const nameFields =
            trip.airline === "AA" || trip.airline === "DL"
              ? `<strong>First name:</strong> ${trip.first_name || "N/A"}<br><strong>Last name:</strong> ${trip.last_name}`
              : `<strong>Last name:</strong> ${trip.last_name}${
                  trip.first_name ? `<br><em>(First name: ${trip.first_name}, sometimes requested)</em>` : ""
                }`;

          const confidencePill =
            publicPrice.confidence === "exact-flight"
              ? '<span style="display:inline-block;padding:2px 8px;background:#10b981;color:white;border-radius:4px;font-size:11px;font-weight:600;">Exact flight</span>'
              : '<span style="display:inline-block;padding:2px 8px;background:#f59e0b;color:white;border-radius:4px;font-size:11px;font-weight:600;">Route estimate</span>';

          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "FareDrop Guide <onboarding@resend.dev>",
                to: [email],
                subject: `Possible price drop on your ${trip.airline} trip`,
                html: `
                  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#333;">Price Drop Alert</h2>
                    <p>We think your fare might be lower by about <strong>$${diff.toFixed(2)}</strong>.</p>
                    <p>To see the actual credit, open the airline's Change screen. ${confidencePill}</p>
                    
                    <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
                      <p style="margin:0 0 8px;font-weight:600;">Your trip:</p>
                      <p style="margin:4px 0;"><strong>Confirmation code:</strong> ${trip.confirmation_code}</p>
                      ${nameFields}
                    </div>

                    <div style="margin:24px 0;">
                      <a href="${appBaseUrl}/trips/${trip.id}" 
                         style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-right:8px;">
                        Open Guided Reprice
                      </a>
                      <a href="${manageTripUrls[trip.airline]}" 
                         style="display:inline-block;background:#6b7280;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
                        Manage Trip
                      </a>
                    </div>

                    <p style="font-size:12px;color:#666;margin-top:24px;">
                      Alerts are based on public prices; the airline's Change preview is the source of truth.
                    </p>
                  </div>
                `,
              }),
            });

            if (!emailResponse.ok) {
              const errorData = await emailResponse.text();
              throw new Error(`Resend API error: ${errorData}`);
            }

            emailsSent++;
            console.log(`Sent email to ${email} for trip ${trip.id}`);
          } catch (emailError) {
            console.error(`Failed to send email for trip ${trip.id}:`, emailError);
          }
        }
      } catch (tripError) {
        console.error(`Error processing trip ${trip.id}:`, tripError);
      }
    }

    console.log(`Price nudge complete: ${emailsSent} emails sent, ${signalsCreated} signals created`);

    return new Response(
      JSON.stringify({
        success: true,
        tripsChecked: trips?.length || 0,
        emailsSent,
        signalsCreated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in price-nudge function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Stub function to fetch public fare
// TODO: Wire to Amadeus Self-Service, Skyscanner, or Duffel
async function fetchPublicFare(trip: any): Promise<{ price: number; confidence: string } | null> {
  // If we have segments with exact flight info, we could search exact flights
  const hasExactFlightInfo =
    trip.segments?.length > 0 &&
    trip.segments.every(
      (s: any) => s.carrier && s.flight_number && s.depart_airport && s.arrive_airport && s.depart_datetime
    );

  // For now, return null to skip
  // When implementing, return { price: number, confidence: 'exact-flight' | 'route-estimate' }
  console.log(`TODO: Fetch public fare for trip ${trip.id}. Has exact flight info: ${hasExactFlightInfo}`);
  return null;
}
