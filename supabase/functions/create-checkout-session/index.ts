
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
    // Log request debugging information
    console.log('Received request to create checkout session');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration:', { 
        hasUrl: !!supabaseUrl, 
        hasAnonKey: !!supabaseAnonKey 
      });
      throw new Error('Supabase configuration is missing');
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the user from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    console.log('Authenticated user:', { id: user.id, email: user.email });
    
    // Get request data
    const requestData = await req.json();
    console.log('Request data:', requestData);
    
    const { imageId, qualityLevel } = requestData;

    if (!imageId || !qualityLevel) {
      console.error('Missing required parameters:', { imageId, qualityLevel });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get image data
    const { data: imageData, error: imageError } = await supabaseClient
      .from('user_images')
      .select('*')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      console.error('Image not found:', { error: imageError, imageId });
      return new Response(
        JSON.stringify({ error: 'Image not found', details: imageError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log('Found image:', { id: imageData.id, status: imageData.status });
    
    // Set up Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const regularPriceId = Deno.env.get('STRIPE_REGULAR_PRICE_ID');
    const premiumPriceId = Deno.env.get('STRIPE_PREMIUM_PRICE_ID');
    
    console.log('Stripe configuration:', { 
      hasSecretKey: !!stripeSecretKey,
      hasRegularPriceId: !!regularPriceId,
      hasPremiumPriceId: !!premiumPriceId,
    });
    
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured properly - missing secret key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    
    // Set price based on quality level
    const priceId = qualityLevel === 'premium' ? premiumPriceId : regularPriceId;
    
    if (!priceId) {
      console.error('Price ID not configured:', qualityLevel === 'premium' ? 'STRIPE_PREMIUM_PRICE_ID' : 'STRIPE_REGULAR_PRICE_ID');
      return new Response(
        JSON.stringify({ error: 'Price ID not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const originUrl = req.headers.get('origin');
    console.log('Creating checkout session with:', { 
      priceId, 
      imageId, 
      qualityLevel, 
      userId: user.id,
      origin: originUrl
    });
    
    try {
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
        success_url: `${originUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&image_id=${imageId}`,
        cancel_url: `${originUrl}/dashboard?canceled=true`,
        metadata: {
          userId: user.id,
          imageId: imageId,
          qualityLevel: qualityLevel,
        },
      });
      
      console.log('Checkout session created:', session.id);
      
      // Update the image record with session ID
      const { error: updateError } = await supabaseClient
        .from('user_images')
        .update({
          stripe_session_id: session.id,
          quality_level: qualityLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', imageId);
      
      if (updateError) {
        console.error('Error updating image record:', updateError);
      }
      
      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (stripeError) {
      console.error('Stripe error creating checkout session:', stripeError);
      return new Response(
        JSON.stringify({ 
          error: 'Stripe checkout session creation failed', 
          details: stripeError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error creating checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unhandled server error', 
        message: error.message || 'Unknown error',
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
