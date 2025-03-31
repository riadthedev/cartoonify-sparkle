
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useProcessImage(refreshInterval = 5000) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let interval: number | undefined;
    let isActive = true; // For cleanup

    const checkAndProcessImages = async () => {
      if (!isActive) return; // Prevent processing if component unmounted
      
      try {
        setError(null);
        
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
          
          try {
            console.log('Calling process-image function for image:', imageId);
            
            // Call the process-image function with a simplified payload
            const response = await supabase.functions.invoke('process-image', {
              body: { imageId },
            });
            
            if (response.error) {
              console.error('Error invoking process-image function:', response.error);
              
              // Update the status to error if the function call failed
              await supabase
                .from('user_images')
                .update({
                  status: 'error',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', imageId);
                
              toast({
                title: "Processing Error",
                description: "There was a problem processing your image. You can try again from your dashboard.",
                variant: "destructive",
              });
              
              setError('Failed to process image: ' + (response.error.message || 'Unknown error'));
            } else {
              console.log('Process-image function completed successfully');
              toast({
                title: "Image Processed",
                description: "Your image has been successfully toonified!",
              });
            }
          } catch (functionError) {
            console.error('Exception when calling process-image function:', functionError);
            
            // Update the status to error if an exception occurred
            await supabase
              .from('user_images')
              .update({
                status: 'error',
                updated_at: new Date().toISOString(),
              })
              .eq('id', imageId);
              
            toast({
              title: "Processing Error",
              description: "An unexpected error occurred. Please try again later.",
              variant: "destructive",
            });
            
            setError('Exception when processing image: ' + 
              (functionError instanceof Error ? functionError.message : 'Unknown error'));
          }
          
          if (isActive) {
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Error checking for images to process:', error);
        if (isActive) {
          setIsProcessing(false);
          setError('Error checking for images: ' + 
            (error instanceof Error ? error.message : 'Unknown error'));
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
  }, [refreshInterval, toast]);

  return { isProcessing, error };
}
