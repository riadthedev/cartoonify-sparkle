
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@latest"; 

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to safely parse JSON
const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
};

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 1024;

  for (let i = 0; i < len; i += chunkSize) {
    const end = Math.min(i + chunkSize, len);
    for (let j = i; j < end; j++) {
      binary += String.fromCharCode(bytes[j]);
    }
  }

  return btoa(binary);
}

// Helper function to fetch image data from the database
async function fetchImageData(supabaseClient, imageId) {
  console.log("Fetching image with ID:", imageId);

  const { data: imageData, error: imageError } = await supabaseClient
    .from("user_images")
    .select("*")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError) {
    console.error("Error fetching image:", imageError);
    throw new Error(`Error fetching image: ${imageError.message}`);
  }

  if (!imageData) {
    console.error("Image not found:", imageId);
    throw new Error("Image not found");
  }

  console.log("Found image to process:", imageData.original_image_path);
  return imageData;
}

// Helper function to update image status
async function updateImageStatus(supabaseClient, imageId, status, additionalData = {}) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData,
  };

  const { error } = await supabaseClient
    .from("user_images")
    .update(updateData)
    .eq("id", imageId);

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
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    throw new Error("Gemini API key not configured");
  }

  console.log("Initializing Google Generative AI with API key");

  // Initialize correctly following the example
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  console.log("Successfully initialized Gemini API client");

  // Get image data as bytes for Gemini
  const imageBytes = await imageResponse.arrayBuffer();
  const base64Image = arrayBufferToBase64(imageBytes);
  const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

  // Prepare the prompt as a string
  const prompt = "Generate an image that is a Studio Ghibli style cartoon version of the provided photo.";
  
  console.log("Sending request to Gemini API");

  try {
    // Call the API with the correct structure for the current Gemini API version
    const geminiModel = "gemini-2.0-flash-exp-image-generation";
    console.log(`Using model: ${geminiModel}`);
    
    // Get the specific generative model
    const model = genAI.getGenerativeModel({ model: geminiModel });
    console.log("Successfully got generative model");
    
    // Create the correct request format
    const request = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { 
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ]
    };
    
    console.log("Request format:", JSON.stringify(request).substring(0, 200) + "...");
    
    // Call generateContent on the model instance with the correct format
    const result = await model.generateContent(request);
    
    console.log("Successfully received response from Gemini API");
    console.log("Result structure:", JSON.stringify(Object.keys(result)).substring(0, 200));
    
    // Extract the image from the response
    if (result.response) {
      console.log("Response structure:", JSON.stringify(Object.keys(result.response)).substring(0, 200));
      
      if (result.response.candidates && result.response.candidates.length > 0) {
        console.log("Has candidates, checking parts...");
        
        const candidate = result.response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          console.log(`Found ${candidate.content.parts.length} parts in response`);
          
          for (const part of candidate.content.parts) {
            console.log("Part type:", Object.keys(part).join(", "));
            
            if (part.inline_data) {
              console.log(`Found inline_data with mime_type: ${part.inline_data.mime_type}`);
              return {
                imageData: part.inline_data.data,
                mimeType: part.inline_data.mime_type,
              };
            }
          }
        }
      }
    }
    
    console.log("No image found in response, full response:", JSON.stringify(result).substring(0, 500) + "...");
    throw new Error("No image was generated by Gemini");
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw error;
  }
}

// Helper function to save the generated image to storage
async function saveGeneratedImage(supabaseClient, imageId, imageData, mimeType) {
  const fileName = `toonified-${imageId}.${mimeType.split("/")[1] || "jpg"}`;
  const filePath = `toonified/${fileName}`;

  const binaryData = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0));

  const { error: uploadError } = await supabaseClient.storage
    .from("images")
    .upload(filePath, binaryData, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading toonified image:", uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Main image processing function
async function processImage(supabaseClient, imageId) {
  console.log("Processing image with ID:", imageId);

  try {
    const imageData = await fetchImageData(supabaseClient, imageId);
    await updateImageStatus(supabaseClient, imageId, "processing");
    const imageResponse = await fetchOriginalImage(imageData.original_image_path);
    const { imageData: toonifiedImage, mimeType: generatedMimeType } = await processWithGemini(imageResponse);

    console.log("Successfully extracted toonified image");

    const toonifiedImageUrl = await saveGeneratedImage(supabaseClient, imageId, toonifiedImage, generatedMimeType);
    await updateImageStatus(supabaseClient, imageId, "complete", {
      toonified_image_path: toonifiedImageUrl,
    });

    console.log("Successfully processed and stored toonified image:", toonifiedImageUrl);

    return {
      success: true,
      imageUrl: toonifiedImageUrl,
    };
  } catch (error) {
    console.error("Error in process image function:", error);
    try {
      await updateImageStatus(supabaseClient, imageId, "error");
    } catch (updateError) {
      console.error("Error updating image status after failure:", updateError);
    }
    throw error;
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const requestText = await req.text();
    console.log("Raw request body:", requestText);

    const requestData = safeJsonParse(requestText);
    if (!requestData) {
      throw new Error("Invalid JSON in request body");
    }

    const imageId = requestData.imageId;
    if (!imageId) {
      throw new Error("Image ID is required");
    }

    const result = await processImage(supabaseClient, imageId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing image:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
