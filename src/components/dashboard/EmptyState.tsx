
import React from 'react';
import { ImagePlus } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';

interface EmptyStateProps {
  onImageSelect: (imageData: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onImageSelect }) => {
  return (
    <div className="text-center py-16 rounded-2xl border-2 border-dashed border-white/10">
      <ImagePlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">No images yet</h3>
      <p className="text-gray-400 mb-6">Upload your first image to get started</p>
      <div className="max-w-md mx-auto">
        <ImageUploader onImageSelect={onImageSelect} />
      </div>
    </div>
  );
};

export default EmptyState;
