
import { supabase, SUPABASE_URL_EXPORT } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ToonifyPaymentHandlerProps {
  refreshImages: () => void;
}

export const useToonifyPayment = ({ refreshImages }: ToonifyPaymentHandlerProps) => {
  const { toast } = useToast();

  const handleToonifyClick = async (imageId: string, qualityLevel: string) => {
    try {
      console.log('Starting checkout process for image:', imageId, 'with quality:', qualityLevel);
      
      const supabaseUrl = SUPABASE_URL_EXPORT;
      console.log('Using Supabase URL:', supabaseUrl);
      
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not defined. Check your environment variables.');
      }
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          imageId,
          qualityLevel,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || `Server responded with ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorMessage = `Server responded with ${response.status}: ${response.statusText}. Response was not valid JSON.`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Checkout session created successfully:', data);
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Payment error",
        description: `There was a problem initiating payment: ${error.message}. Please try again later.`,
        variant: "destructive",
      });
    }
  };

  return { handleToonifyClick };
};
