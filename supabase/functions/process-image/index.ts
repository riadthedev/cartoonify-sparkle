
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
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );
  
  // Parse the request body only once at the beginning
  let imageId;
  
  try {
    // Clone the request so we can use it multiple times if needed
    const requestClone = req.clone();
    const requestData = await requestClone.json();
    imageId = requestData.imageId;
    
    console.log('Processing image with ID:', imageId);
    
    // Get image data
    const { data: imageData, error: imageError } = await supabaseClient
      .from('user_images')
      .select('*')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      console.error('Image not found or not ready:', imageError);
      return new Response(
        JSON.stringify({ error: 'Image not found or not ready for processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Found image to process:', imageData.original_image_path);
    
    // Update status to processing
    await supabaseClient
      .from('user_images')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    // Get the original image as base64
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
    
    const toonifyPrompt = `Create a cartoon version of this photo in a Studio Ghibli style. The new image should maintain the same composition and framing as the original, but with a hand-drawn animation look.`;

    console.log('Sending request to Gemini API with model: gemini-2.0-flash-exp-image-generation');
    
    // Using the gemini-2.0-flash-exp-image-generation model as specified
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
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`);
    }
    
    const generationResult = await geminiResponse.json();
    console.log('Received response from Gemini API');
    
    // Extract the generated image
    if (!generationResult || !generationResult.candidates || !generationResult.candidates[0]?.content?.parts) {
      console.error('Invalid response structure from Gemini API:', JSON.stringify(generationResult));
      throw new Error('Invalid response from Gemini API');
    }
    
    // Debug log to understand response structure
    console.log('Response structure:', JSON.stringify({
      hasCandidates: Boolean(generationResult.candidates),
      candidatesLength: generationResult.candidates?.length,
      hasContent: Boolean(generationResult.candidates?.[0]?.content),
      partsLength: generationResult.candidates?.[0]?.content?.parts?.length
    }));

    const parts = generationResult.candidates[0].content.parts;
    console.log('Parts types:', parts.map(part => {
      return {
        hasInlineData: Boolean(part.inline_data),
        mimeType: part.inline_data?.mime_type || 'none'
      };
    }));
    
    const generatedImage = parts.find(
      part => part.inline_data && part.inline_data.mime_type.startsWith('image/')
    );
    
    if (!generatedImage || !generatedImage.inline_data || !generatedImage.inline_data.data) {
      console.error('No image found in Gemini response parts');
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
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
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
    await supabaseClient
      .from('user_images')
      .update({
        toonified_image_path: toonifiedImageUrl,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
    
    console.log('Successfully processed and stored toonified image:', toonifiedImageUrl);
    
    return new Response(
      JSON.stringify({ success: true, imageUrl: toonifiedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing image:', error);
    
    // If we have an imageId from the earlier parsing, update the status to show the error
    if (imageId) {
      try {
        await supabaseClient
          .from('user_images')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', imageId);
      } catch (updateError) {
        console.error('Error updating image status after failure:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
