
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  ImagePlus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  Sparkles, 
  Trash2 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useProcessImage } from '@/hooks/useProcessImage';

const Dashboard: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState('regular');
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const { isProcessing } = useProcessImage(3000);

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
  }, [location, toast]);

  useEffect(() => {
    if (user) {
      fetchImages();
    }
  }, [user]);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        title: "Error fetching images",
        description: "There was a problem loading your images.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${user!.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        const { data: imageData, error: insertError } = await supabase
          .from('user_images')
          .insert({
            user_id: user!.id,
            original_image_path: urlData.publicUrl,
            quality_level: selectedQuality,
            status: 'not_toonified',
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        fetchImages();
        
        toast({
          title: "Image uploaded",
          description: "Your image has been uploaded successfully.",
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Upload failed",
          description: "There was a problem uploading your image.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleToonifyClick = async (imageId: string, qualityLevel: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          imageId,
          qualityLevel,
        }),
      });
      
      const { url, error } = await response.json();
      
      if (error) throw new Error(error);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Payment error",
        description: "There was a problem initiating payment.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (id: string, imagePath: string) => {
    try {
      if (imagePath) {
        const path = imagePath.split('/').pop();
        if (path) {
          const storagePath = `${user!.id}/${path}`;
          await supabase.storage.from('images').remove([storagePath]);
        }
      }
      
      const { error } = await supabase
        .from('user_images')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setImages(images.filter(img => img.id !== id));
      
      toast({
        title: "Image deleted",
        description: "Your image has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting your image.",
        variant: "destructive",
      });
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'complete':
        return { icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2" />, text: 'Complete' };
      case 'in_queue':
        return { icon: <Clock className="h-5 w-5 text-yellow-500 mr-2" />, text: 'Processing' };
      case 'not_toonified':
        return { icon: <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />, text: 'Not Toonified' };
      case 'pending_payment':
        return { icon: <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />, text: 'Payment Required' };
      default:
        return { icon: <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />, text: status };
    }
  };

  useEffect(() => {
    if (!isProcessing && user) {
      fetchImages();
    }
  }, [isProcessing, user]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
            <p className="text-gray-400">Manage your toonified images</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <input
              type="file"
              id="upload-image"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <label htmlFor="upload-image">
              <Button 
                className="gradient-border blue-cyan-gradient w-full md:w-auto"
                variant="outline"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>Uploading<span className="animate-pulse">...</span></>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Upload New Image
                  </>
                )}
              </Button>
            </label>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin mr-2">
              <Sparkles className="h-8 w-8 text-toonify-pink" />
            </div>
            <p>Loading your images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-white/10">
            <ImagePlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No images yet</h3>
            <p className="text-gray-400 mb-6">Upload your first image to get started</p>
            <label htmlFor="upload-image">
              <Button 
                className="gradient-border purple-pink-gradient"
                variant="outline"
              >
                <Upload className="mr-2 h-4 w-4" /> Upload Image
              </Button>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => {
              const status = getStatusDisplay(image.status);
              return (
                <div 
                  key={image.id} 
                  className="bg-toonify-dark-navy/70 rounded-2xl p-6 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:border-white/20"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center">
                        {status.icon}
                        <span className="font-medium">{status.text}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded on {new Date(image.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Quality: {image.quality_level === 'premium' ? 'Premium' : 'Regular'}
                      </p>
                    </div>
                    
                    <div className="flex">
                      {image.status === 'complete' && (
                        <Button size="sm" variant="ghost" className="text-toonify-cyan hover:text-toonify-blue">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteImage(image.id, image.original_image_path)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="rounded-xl overflow-hidden mb-4 aspect-square">
                    <img 
                      src={image.original_image_path} 
                      alt="Original" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {image.status === 'complete' ? (
                    <div className="rounded-xl overflow-hidden border-2 border-toonify-purple/30 aspect-square">
                      <img 
                        src={image.toonified_image_path} 
                        alt="Toonified" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center aspect-square bg-white/5">
                      {image.status === 'in_queue' ? (
                        <div className="text-center p-4">
                          <div className="animate-spin mb-2">
                            <Sparkles className="h-8 w-8 text-toonify-pink" />
                          </div>
                          <p className="text-gray-300">Processing your image...</p>
                          <p className="text-xs text-gray-400 mt-1">This may take a minute</p>
                        </div>
                      ) : (
                        <div className="text-center w-full p-4">
                          {image.status === 'not_toonified' && (
                            <>
                              <p className="mb-4 text-gray-300">Select quality level:</p>
                              <Select 
                                value={image.quality_level} 
                                onValueChange={async (value) => {
                                  await supabase
                                    .from('user_images')
                                    .update({ quality_level: value })
                                    .eq('id', image.id);
                                  fetchImages();
                                }}
                                className="mb-4 w-full"
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select quality" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">Regular ($2)</SelectItem>
                                  <SelectItem value="premium">Premium ($10)</SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          )}
                          <Button 
                            className="gradient-border purple-pink-gradient w-full"
                            variant="outline"
                            onClick={() => handleToonifyClick(image.id, image.quality_level)}
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Toonify Now
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
