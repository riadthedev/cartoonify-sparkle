
import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const HeroSection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleImageSelect = (imageData: string) => {
    setSelectedImage(imageData);
  };
  
  const handleToonifyClick = () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image first before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    // For now, simulate login redirect
    // In a real app, we'd check auth status here
    navigate('/login');
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-toonify-purple/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-toonify-blue/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 py-12 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-block animate-bounce-small mb-4">
            <span className="text-3xl">✨</span>
            <Sparkles className="inline-block h-8 w-8 text-toonify-pink mx-2" />
            <span className="text-3xl">🎨</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-toonify-cyan via-toonify-blue to-toonify-pink bg-clip-text text-transparent">
            Transform Your Photos Into Cartoons
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Upload your photo and our AI will instantly transform it into an amazing cartoon style illustration!
          </p>
          
          <ImageUploader onImageSelect={handleImageSelect} />
          
          {selectedImage && (
            <div className="mt-8">
              <Button 
                className="gradient-border purple-pink-gradient"
                variant="outline"
                size="lg"
                onClick={handleToonifyClick}
              >
                <Sparkles className="mr-2 h-5 w-5" /> Toonify Me Now ✨
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
