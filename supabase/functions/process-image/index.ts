
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Create Supabase client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );
  
  let imageId = null;
  
  try {
    // Parse request body using text() instead of json() to avoid parsing issues
    const requestText = await req.text();
    console.log('Raw request body:', requestText);
    
    // Manually parse the JSON to handle potential errors
    let requestData;
    try {
      requestData = JSON.parse(requestText);
      imageId = requestData.imageId;
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    if (!imageId) {
      throw new Error('Image ID is required');
    }
    
    console.log('Processing image with ID:', imageId);
    
    // Get image data
    const { data: imageData, error: imageError } = await supabaseClient
      .from('user_images')
      .select('*')
      .eq('id', imageId)
      .maybeSingle();
    
    if (imageError) {
      console.error('Error fetching image:', imageError);
      throw new Error(`Error fetching image: ${imageError.message}`);
    }
    
    if (!imageData) {
      console.error('Image not found:', imageId);
      return new Response(
        JSON.stringify({ error: 'Image not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Found image to process:', imageData.original_image_path);
    
    // Update status to processing
    const { error: updateError } = await supabaseClient
      .from('user_images')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
      
    if (updateError) {
      console.error('Error updating image status:', updateError);
      throw new Error(`Error updating image status: ${updateError.message}`);
    }

    // Get the original image
    const imageResponse = await fetch(imageData.original_image_path);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch original image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
    
    // Process with Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const toonifyPrompt = `Transform this photo into a Studio Ghibli style cartoon. Keep the same composition but make it look hand-drawn.`;

    console.log('Sending request to Gemini API with model: gemini-2.0-flash-exp-image-generation');
    
    // Using the gemini-2.0-flash-exp-image-generation model
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: toonifyPrompt },
              {
                inline_data: {
                  mime_type: imageResponse.headers.get('content-type') || 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generation_config: {
          temperature: 0.2,
          topP: 0.95,
          topK: 32
        }
      })
    });
    
    // Handle Gemini API errors
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || 'Unknown Gemini API error';
        const errorCode = errorJson.error?.code || 0;
        
        throw new Error(`Gemini API error: ${errorMessage} (code: ${errorCode})`);
      } catch (parseError) {
        throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`);
      }
    }
    
    const generationResult = await geminiResponse.json();
    console.log('Received response from Gemini API');
    
    // Validate the response
    if (!generationResult) {
      throw new Error('Empty response from Gemini API');
    }
    
    if (!generationResult.candidates || generationResult.candidates.length === 0) {
      console.error('Response structure:', JSON.stringify(generationResult));
      throw new Error('No image candidates returned from Gemini API');
    }
    
    // Log response structure for debugging
    console.log('Response structure:', JSON.stringify({
      candidatesCount: generationResult.candidates?.length,
      hasContent: Boolean(generationResult.candidates?.[0]?.content),
      partsCount: generationResult.candidates?.[0]?.content?.parts?.length
    }));

    const parts = generationResult.candidates[0].content.parts;
    
    // Find the image in the response
    const generatedImage = parts.find(
      part => part.inline_data && part.inline_data.mime_type.startsWith('image/')
    );
    
    if (!generatedImage || !generatedImage.inline_data || !generatedImage.inline_data.data) {
      console.error('No image found in response parts:', JSON.stringify(parts));
      throw new Error('No image was generated by Gemini');
    }
    
    const toonifiedImage = generatedImage.inline_data.data;
    const mimeType = generatedImage.inline_data.mime_type;
    
    console.log('Successfully extracted toonified image, mime type:', mimeType);
    
    // Upload the generated image to storage
    const fileName = `toonified-${imageId}.${mimeType.split('/')[1] || 'jpg'}`;
    const filePath = `toonified/${fileName}`;
    
    // Convert base64 back to binary for storage
    const binaryData = Uint8Array.from(atob(toonifiedImage), c => c.charCodeAt(0));
    
    // Upload to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('images')
      .upload(filePath, binaryData, {
        contentType: mimeType,
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading toonified image:', uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('images')
      .getPublicUrl(filePath);
    
    const toonifiedImageUrl = urlData.publicUrl;
    
    // Update the record with the processed image
    const { error: finalUpdateError } = await supabaseClient
      .from('user_images')
      .update({
        toonified_image_path: toonifiedImageUrl,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
      
    if (finalUpdateError) {
      console.error('Error updating image record:', finalUpdateError);
      throw new Error(`Error updating image record: ${finalUpdateError.message}`);
    }
    
    console.log('Successfully processed and stored toonified image:', toonifiedImageUrl);
    
    return new Response(
      JSON.stringify({ success: true, imageUrl: toonifiedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    // Log the full error for debugging
    console.error('Error processing image:', error);
    
    // Try to update the image status to error if we have an imageId
    if (imageId) {
      try {
        await supabaseClient
          .from('user_images')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', imageId);
        console.log('Updated image status to error');
      } catch (updateError) {
        console.error('Error updating image status after failure:', updateError);
      }
    }
    
    // Return a friendly error message
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
