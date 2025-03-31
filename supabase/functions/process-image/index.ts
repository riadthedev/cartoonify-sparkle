
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to safely parse JSON
const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

// Helper function to fetch image data from the database
async function fetchImageData(supabaseClient, imageId) {
  console.log('Fetching image with ID:', imageId);
  
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
    throw new Error('Image not found');
  }

  console.log('Found image to process:', imageData.original_image_path);
  return imageData;
}

// Helper function to update image status
async function updateImageStatus(supabaseClient, imageId, status, additionalData = {}) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData
  };
  
  const { error } = await supabaseClient
    .from('user_images')
    .update(updateData)
    .eq('id', imageId);
    
  if (error) {
    console.error(`Error updating image to ${status}:`, error);
    throw new Error(`Error updating image status: ${error.message}`);
  }
  
  return { success: true };
}

// Helper function to fetch original image
async function fetchOriginalImage(imageUrl) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch original image: ${imageResponse.status} ${imageResponse.statusText}`);
  }
  
  return imageResponse;
}

// Helper function to process image with Gemini
async function processWithGemini(imageResponse) {
  // Get the API key
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  console.log('Initializing Google Generative AI with API key');
  
  // Initialize the Google Generative AI SDK
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  
  // Use the image generation model
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
  });
  
  // Get image data as bytes for Gemini
  const imageBytes = await imageResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
  
  console.log('Sending request to Gemini API using SDK');
  
  // Create image part
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType
    }
  };
  
  // The text prompt
  const textPart = "Transform this photo into a Studio Ghibli style cartoon.";
  
  // Generate content with the model
  const result = await model.generateContent([textPart, imagePart]);
  const response = await result.response;
  
  console.log('Received response from Gemini API');
  
  return extractGeneratedImage(response);
}

// Helper function to extract the generated image from Gemini response
function extractGeneratedImage(response) {
  // Find the image in the parts
  if (!response.candidates || response.candidates.length === 0) {
    console.error('No candidates in Gemini response');
    throw new Error('No image was generated by Gemini');
  }
  
  const parts = response.candidates[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    console.error('No parts in Gemini response');
    throw new Error('No image was generated by Gemini');
  }
  
  const generatedImage = parts.find(
    part => part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')
  );
  
  if (!generatedImage || !generatedImage.inlineData || !generatedImage.inlineData.data) {
    console.error('No image found in response parts');
    throw new Error('No image was generated by Gemini');
  }
  
  return {
    imageData: generatedImage.inlineData.data,
    mimeType: generatedImage.inlineData.mimeType
  };
}

// Helper function to save the generated image to storage
async function saveGeneratedImage(supabaseClient, imageId, imageData, mimeType) {
  // Upload the generated image to storage
  const fileName = `toonified-${imageId}.${mimeType.split('/')[1] || 'jpg'}`;
  const filePath = `toonified/${fileName}`;
  
  // Convert base64 back to binary for storage
  const binaryData = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
  
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
  
  return urlData.publicUrl;
}

// Main image processing function
async function processImage(supabaseClient, imageId) {
  console.log('Processing image with ID:', imageId);
  
  try {
    // Get image data
    const imageData = await fetchImageData(supabaseClient, imageId);
  
    // Update status to processing
    await updateImageStatus(supabaseClient, imageId, 'processing');
  
    // Get the original image
    const imageResponse = await fetchOriginalImage(imageData.original_image_path);
    
    // Process with Gemini
    const { imageData: toonifiedImage, mimeType: generatedMimeType } = await processWithGemini(imageResponse);
    
    console.log('Successfully extracted toonified image');
    
    // Save the generated image
    const toonifiedImageUrl = await saveGeneratedImage(supabaseClient, imageId, toonifiedImage, generatedMimeType);
    
    // Update the record with the processed image
    await updateImageStatus(supabaseClient, imageId, 'complete', {
      toonified_image_path: toonifiedImageUrl
    });
    
    console.log('Successfully processed and stored toonified image:', toonifiedImageUrl);
    
    return {
      success: true,
      imageUrl: toonifiedImageUrl
    };
  } catch (error) {
    console.error('Error in process image function:', error);
    
    // Try to update the image status to error
    try {
      await updateImageStatus(supabaseClient, imageId, 'error');
    } catch (updateError) {
      console.error('Error updating image status after failure:', updateError);
    }
    
    throw error;
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
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
    
    // Parse request body
    const requestText = await req.text();
    console.log('Raw request body:', requestText);
    
    const requestData = safeJsonParse(requestText);
    if (!requestData) {
      throw new Error('Invalid JSON in request body');
    }
    
    const imageId = requestData.imageId;
    if (!imageId) {
      throw new Error('Image ID is required');
    }
    
    // Process the image
    const result = await processImage(supabaseClient, imageId);
    
    // Return successful response
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    // Log the full error for debugging
    console.error('Error processing image:', error);
    
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
