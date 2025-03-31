
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
  
  try {
    const { imageId } = await req.json();
    console.log('Processing image with ID:', imageId);
    
    // Get image data
    const { data: imageData, error: imageError } = await supabaseClient
      .from('user_images')
      .select('*')
      .eq('id', imageId)
      .eq('status', 'in_queue')
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
    const base64EncodedImage = `data:${imageResponse.headers.get('content-type') || 'image/jpeg'};base64,${base64Image}`;
    
    // Process with Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const toonifyPrompt = `Redraw this image exactly in the 2D animation style, strictly preserving the original content, composition, subject, pose, facial expression, clothing, and plain beige background.

Do not add or change anything — no new objects, no new backgrounds, and no stylistic embellishments that were not present in the reference photo.

The goal is a faithful recreation in hand-drawn style: soft lines, warm colors, painterly textures, and gentle shading — but everything else must remain true to the original image. avoid photo realism it should be in the cartoon anime form. ensure the background is as close to the original as possible, it should have studio ghibili art style`;

    console.log('Sending request to Gemini API');
    
    // Add exponential backoff for rate limiting
    let retries = 0;
    const maxRetries = 3;
    let generationResult;
    
    while (retries <= maxRetries) {
      try {
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
              temperature: 0.4,
              topP: 0.95,
              topK: 32
            }
          })
        });
        
        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('Gemini API error:', errorText);
          
          // If rate limited, wait and retry
          if (geminiResponse.status === 429 && retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000; // Exponential backoff
            console.log(`Rate limited. Retrying in ${delay}ms (retry ${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          
          throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`);
        }
        
        generationResult = await geminiResponse.json();
        console.log('Received response from Gemini');
        break; // Success, exit the retry loop
      } catch (error) {
        if (retries < maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          console.log(`Error, retrying in ${delay}ms (retry ${retries + 1}/${maxRetries}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          throw error; // Rethrow after max retries
        }
      }
    }
    
    // Extract the generated image
    if (!generationResult || !generationResult.candidates || !generationResult.candidates[0]?.content?.parts) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const generatedImage = generationResult.candidates[0].content.parts.find(
      part => part.inline_data && part.inline_data.mime_type.startsWith('image/')
    );
    
    if (!generatedImage) {
      throw new Error('No image was generated by Gemini');
    }
    
    const toonifiedImage = generatedImage.inline_data.data;
    const mimeType = generatedImage.inline_data.mime_type;
    
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
    
    console.log('Successfully processed and stored toonified image');
    
    return new Response(
      JSON.stringify({ success: true, imageUrl: toonifiedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing image:', error);
    
    // Get the image ID from the request if possible
    let imageId;
    try {
      const body = await req.json();
      imageId = body.imageId;
    } catch (e) {
      // Ignore parsing errors
    }
    
    // If we have an imageId, update the status to show the error
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
