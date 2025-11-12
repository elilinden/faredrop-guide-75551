import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchPublicFare(trip: any): Promise<{ price: number; confidence: string } | null> {
  // TODO: Wire real pricing provider
  console.log(`[fetchPublicFare] Stub for trip ${trip.id}`);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { tripId } = await req.json();
    if (!tripId) {
      throw new Error('Missing tripId');
    }

    // Fetch trip and verify ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      throw new Error('Trip not found');
    }

    // Rate limit: max 1 manual check per 10 minutes
    if (trip.last_checked_at) {
      const lastChecked = new Date(trip.last_checked_at);
      const now = new Date();
      const minutesSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60);
      
      if (minutesSinceCheck < 10) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'Please wait 10 minutes between manual checks',
            retryAfter: Math.ceil(10 - minutesSinceCheck),
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Fetch public fare
    const publicFare = await fetchPublicFare(trip);

    // Update trip
    const updateData: any = {
      last_checked_at: new Date().toISOString(),
    };

    if (publicFare) {
      const diff = trip.paid_total - publicFare.price;
      
      updateData.last_public_price = publicFare.price;
      updateData.last_confidence = publicFare.confidence;

      // Use service role for inserting to price_checks
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabaseService.from('price_checks').insert({
        trip_id: trip.id,
        observed_price: publicFare.price,
        diff_vs_paid: diff,
        confidence: publicFare.confidence,
      });
    }

    const { error: updateError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        last_checked_at: updateData.last_checked_at,
        last_public_price: updateData.last_public_price,
        last_confidence: updateData.last_confidence,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[check-now] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
