
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useImageOperations = (userId: string | undefined) => {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fetchImages = async () => {
    if (!userId) return;
    
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

  const handleImageSelect = async (imageData: string) => {
    if (!userId) return;
    
    setIsUploading(true);
    
    try {
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      const file = new File([blob], 'upload.jpg', { type: 'image/jpeg' });
      
      const fileExt = 'jpg';
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      const { data: insertedImageData, error: insertError } = await supabase
        .from('user_images')
        .insert({
          user_id: userId,
          original_image_path: urlData.publicUrl,
          quality_level: 'regular',
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
  };

  const handleDeleteImage = async (id: string, imagePath: string) => {
    if (!userId) return;
    
    try {
      if (imagePath) {
        const path = imagePath.split('/').pop();
        if (path) {
          const storagePath = `${userId}/${path}`;
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

  return {
    images,
    isLoading,
    isUploading,
    fetchImages,
    handleImageSelect,
    handleDeleteImage,
    setSelectedQuality: async (imageId: string, qualityLevel: string) => {
      await supabase
        .from('user_images')
        .update({ quality_level: qualityLevel })
        .eq('id', imageId);
      fetchImages();
    }
  };
};
