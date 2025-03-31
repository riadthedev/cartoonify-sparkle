
import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface ImageUploaderProps {
  onImageSelect: (imageData: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.type.match('image.*')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, JPEG, etc.)",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      onImageSelect(imageData);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const handleReset = useCallback(() => {
    setPreviewImage(null);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!previewImage ? (
        <div
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-16 h-16 mb-4 text-toonify-blue" />
          <h3 className="text-xl font-semibold mb-2">Drop your image here</h3>
          <p className="text-gray-400 mb-6">or click to browse your files</p>
          
          <input
            type="file"
            id="file-upload"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button 
              className="bg-toonify-dark-navy border-2 border-toonify-blue text-white"
              variant="outline"
            >
              <ImageIcon className="mr-2 h-4 w-4" /> Select Image
            </Button>
          </label>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-toonify-blue/50 h-80 w-full">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              className="bg-toonify-dark-navy border-2 border-toonify-purple text-white"
              variant="outline"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Toonify Me ✨
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
