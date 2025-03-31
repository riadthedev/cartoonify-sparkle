
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
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Log request debugging information
    console.log('Received request to create checkout session');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    // Get product IDs from environment variables
    const regularProductId = Deno.env.get('STRIPE_REGULAR_PRICE_ID');
    const premiumProductId = Deno.env.get('STRIPE_PREMIUM_PRICE_ID');
    
    // Log environment variables (without exposing sensitive keys)
    console.log('Environment variables:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasStripeSecretKey: !!stripeSecretKey,
      hasRegularProductId: !!regularProductId,
      hasPremiumProductId: !!premiumProductId
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration is missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!stripeSecretKey) {
      console.error('Missing Stripe configuration');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration is missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!regularProductId || !premiumProductId) {
      console.error('Missing Stripe product IDs');
      return new Response(
        JSON.stringify({ error: 'Stripe product IDs are missing from environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create Supabase client
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
    
    // Parse request data
    let requestData;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      try {
        requestData = JSON.parse(bodyText);
        console.log('Parsed request data:', requestData);
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError, 'Body was:', bodyText);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } catch (parseError) {
      console.error('Failed to read request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to read request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
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
      .maybeSingle();
    
    if (imageError) {
      console.error('Error fetching image data:', imageError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch image data', details: imageError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!imageData) {
      console.error('Image not found:', { imageId });
      return new Response(
        JSON.stringify({ error: 'Image not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log('Found image:', { id: imageData.id, status: imageData.status });
    
    // Set up Stripe
    let stripe;
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
      console.log('Stripe client initialized successfully');
    } catch (stripeInitError) {
      console.error('Error initializing Stripe client:', stripeInitError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize Stripe client' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Set product based on quality level
    const productId = qualityLevel === 'premium' ? premiumProductId : regularProductId;
    
    const originUrl = req.headers.get('origin') || 'https://your-app-fallback-url.com';
    console.log('Creating checkout session with product:', { 
      productId, 
      imageId, 
      qualityLevel, 
      userId: user.id,
      origin: originUrl
    });
    
    try {
      // Create checkout session with direct product link
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        // For direct product checkout, we'll use a different approach
        mode: 'payment',
        success_url: `${originUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&image_id=${imageId}`,
        cancel_url: `${originUrl}/dashboard?canceled=true`,
        line_items: [
          {
            // Note: For direct product IDs, we use a different approach
            quantity: 1,
            // Use the price_data object to reference the product directly
            price_data: {
              currency: 'usd',
              product: productId,
              unit_amount: qualityLevel === 'premium' ? 1000 : 200, // $10.00 or $2.00
            }
          },
        ],
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
        message: error.message || 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
