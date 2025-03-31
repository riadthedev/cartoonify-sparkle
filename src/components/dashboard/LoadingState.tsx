
import React from 'react';
import { Sparkles } from 'lucide-react';

const LoadingState: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin mr-2">
        <Sparkles className="h-8 w-8 text-toonify-pink" />
      </div>
      <p>Loading your images...</p>
    </div>
  );
};

export default LoadingState;
