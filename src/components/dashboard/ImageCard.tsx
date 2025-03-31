
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Download, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface ImageCardProps {
  image: any;
  onDelete: (id: string, imagePath: string) => void;
  onToonify: (imageId: string, qualityLevel: string) => void;
  onQualityChange: (imageId: string, qualityLevel: string) => void;
  refreshImages: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ 
  image, 
  onDelete, 
  onToonify, 
  onQualityChange,
  refreshImages 
}) => {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'complete':
        return { icon: <CheckCircle className="h-5 w-5 text-green-500 mr-2" />, text: 'Complete' };
      case 'in_queue':
        return { icon: <Clock className="h-5 w-5 text-yellow-500 mr-2" />, text: 'Processing' };
      case 'processing':
        return { icon: <Clock className="h-5 w-5 text-yellow-500 mr-2" />, text: 'Generating' };
      case 'not_toonified':
        return { icon: <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />, text: 'Not Toonified' };
      case 'pending_payment':
        return { icon: <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />, text: 'Payment Required' };
      default:
        return { icon: <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />, text: status };
    }
  };

  const status = getStatusDisplay(image.status);

  return (
    <div 
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
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-toonify-cyan hover:text-toonify-blue"
              onClick={() => {
                const a = document.createElement('a');
                a.href = image.toonified_image_path;
                a.download = `toonified-image-${image.id}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-red-400 hover:text-red-300"
            onClick={() => onDelete(image.id, image.original_image_path)}
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
          {image.status === 'in_queue' || image.status === 'processing' ? (
            <div className="text-center p-4 w-full">
              <div className="mb-4">
                <Sparkles className="h-8 w-8 text-toonify-pink mx-auto animate-pulse" />
              </div>
              <p className="text-gray-300 mb-3">
                {image.status === 'in_queue' ? 'Processing your image...' : 'Generating toonified version...'}
              </p>
              <Progress 
                value={image.status === 'in_queue' ? 30 : 70} 
                className="h-2 bg-white/10" 
              />
              <p className="text-xs text-gray-400 mt-2">This may take a minute</p>
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
                      refreshImages();
                    }}
                  >
                    <SelectTrigger className="w-full mb-4">
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
                className="bg-toonify-dark-navy border-2 border-toonify-purple text-white w-full"
                variant="outline"
                onClick={() => onToonify(image.id, image.quality_level)}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Toonify Now
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageCard;
