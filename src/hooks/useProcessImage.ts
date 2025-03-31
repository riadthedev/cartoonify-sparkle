
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useProcessImage(refreshInterval = 5000) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let interval: number | undefined;
    let isActive = true; // For cleanup

    const checkAndProcessImages = async () => {
      if (!isActive) return; // Prevent processing if component unmounted
      
      try {
        // First check if there are any images in the 'in_queue' status
        const { data, error } = await supabase
          .from('user_images')
          .select('id')
          .eq('status', 'in_queue')
          .limit(1);
        
        if (error) throw error;
        
        // If there are images to process, process them
        if (data && data.length > 0 && isActive) {
          setIsProcessing(true);
          
          const imageId = data[0].id;
          
          // Call the process-image function
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ imageId }),
          });
          
          if (!response.ok && isActive) {
            const result = await response.json();
            if (result.error) {
              console.error('Processing error:', result.error);
            }
          }
          
          if (isActive) {
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Error checking for images to process:', error);
        if (isActive) {
          setIsProcessing(false);
        }
      }
    };

    // Start polling
    checkAndProcessImages();
    interval = window.setInterval(checkAndProcessImages, refreshInterval);

    return () => {
      isActive = false; // Mark as inactive
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [refreshInterval]);

  return { isProcessing };
}
