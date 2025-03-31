
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
        await supabase
          .from('user_images')
          .update({
            status: 'in_queue',
            stripe_payment_status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', imageId);
        
        fetchImages();
        
        toast({
          title: "Payment successful!",
          description: "Your image is now being processed.",
        });
      };
      
      updatePaymentStatus();
      
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, [location, toast, fetchImages]);
};
