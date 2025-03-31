
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@12.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the user from the request
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Get request data
    const { imageId, qualityLevel } = await req.json();
    
    // Get image data
    const { data: imageData, error: imageError } = await supabaseClient
      .from('user_images')
      .select('*')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      return new Response(
        JSON.stringify({ error: 'Image not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    // Set up Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });
    
    // Set price based on quality level
    const priceId = qualityLevel === 'premium' 
      ? Deno.env.get('STRIPE_PREMIUM_PRICE_ID') 
      : Deno.env.get('STRIPE_REGULAR_PRICE_ID');
    
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&image_id=${imageId}`,
      cancel_url: `${req.headers.get('origin')}/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
        imageId: imageId,
        qualityLevel: qualityLevel,
      },
    });
    
    // Update the image record with session ID
    await supabaseClient
      .from('user_images')
      .update({
        stripe_session_id: session.id,
        quality_level: qualityLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
    
    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
