
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PaymentSuccessProps {
  fetchImages: () => Promise<void>;
}

export const usePaymentSuccess = ({ fetchImages }: PaymentSuccessProps) => {
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const success = queryParams.get('success');
    const sessionId = queryParams.get('session_id');
    const imageId = queryParams.get('image_id');

    if (success === 'true' && sessionId && imageId) {
      const updatePaymentStatus = async () => {
        try {
          // Update payment status
          await supabase
            .from('user_images')
            .update({
              status: 'in_queue',
              stripe_payment_status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', imageId);
          
          // Refresh images to show updated state
          await fetchImages();
          
          // Show success message
          toast({
            title: "Payment successful!",
            description: "Your image is now being processed.",
          });
          
          // Call the process-image function to start processing
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          
          if (!accessToken) {
            throw new Error('Authentication required. Please log in again.');
          }
          
          // Call process-image function to start toonification
          const response = await supabase.functions.invoke('process-image', {
            body: { imageId },
          });
          
          if (response.error) {
            console.error('Error starting image processing:', response.error);
            toast({
              title: "Processing started",
              description: "Your image is now in queue for processing.",
            });
          }
        } catch (error) {
          console.error('Error updating payment status:', error);
          toast({
            title: "Payment processed",
            description: "We'll start processing your image shortly.",
          });
        }
        
        // Clean up the URL parameters AFTER processing is complete
        window.history.replaceState({}, document.title, '/dashboard');
      };
      
      updatePaymentStatus();
    }
  }, [location.search]); // Only run when the URL search parameters change
};
