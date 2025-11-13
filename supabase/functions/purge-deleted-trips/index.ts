import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC signature verification for webhook security
async function verifyWebhookSignature(request: Request, body: string): Promise<boolean> {
  if (!webhookSecret) {
    console.warn('WEBHOOK_SECRET not configured - skipping signature verification');
    return true; // Allow if secret not configured (for backwards compatibility)
  }

  const signature = request.headers.get('X-Webhook-Signature');
  if (!signature) {
    console.error('Missing X-Webhook-Signature header');
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Timing-safe comparison
  return signature === expectedHex;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify webhook signature
  const requestBody = await req.text();
  const isValid = await verifyWebhookSignature(req, requestBody);
  
  if (!isValid) {
    console.error('Invalid webhook signature');
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Running purge-deleted-trips job...');

    // Hard-delete trips where deleted_at is older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: tripsToDelete, error: fetchError } = await supabase
      .from('trips')
      .select('id, airline, confirmation_code')
      .lt('deleted_at', thirtyDaysAgo.toISOString())
      .not('deleted_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching trips to delete:', fetchError);
      throw fetchError;
    }

    if (!tripsToDelete || tripsToDelete.length === 0) {
      console.log('No trips to purge.');
      return new Response(
        JSON.stringify({ message: 'No trips to purge', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tripsToDelete.length} trips to purge:`, tripsToDelete);

    // Delete the trips (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .in('id', tripsToDelete.map(t => t.id));

    if (deleteError) {
      console.error('Error deleting trips:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully purged ${tripsToDelete.length} trips.`);

    return new Response(
      JSON.stringify({ 
        message: 'Purge complete', 
        count: tripsToDelete.length,
        purged: tripsToDelete 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Purge job error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
