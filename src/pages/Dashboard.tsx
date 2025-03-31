
import React, { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useProcessImage } from '@/hooks/useProcessImage';
import ImageUploader from '@/components/ImageUploader';
import ImageCard from '@/components/dashboard/ImageCard';
import EmptyState from '@/components/dashboard/EmptyState';
import LoadingState from '@/components/dashboard/LoadingState';
import { useImageOperations } from '@/components/dashboard/useImageOperations';
import { useToonifyPayment } from '@/components/dashboard/ToonifyPaymentHandler';
import { usePaymentSuccess } from '@/components/dashboard/usePaymentSuccess';

const Dashboard: React.FC = () => {
  const [selectedQuality, setSelectedQuality] = useState('regular');
  const { user } = useAuth();
  const { isProcessing } = useProcessImage(3000);
  
  const {
    images,
    isLoading,
    fetchImages,
    handleImageSelect,
    handleDeleteImage,
    setSelectedQuality: handleQualityChange
  } = useImageOperations(user?.id);
  
  const { handleToonifyClick } = useToonifyPayment({ refreshImages: fetchImages });
  
  // Handle payment success redirects
  usePaymentSuccess({ fetchImages });

  useEffect(() => {
    if (user) {
      fetchImages();
    }
  }, [user]);

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
        </div>
        
        {isLoading ? (
          <LoadingState />
        ) : images.length === 0 ? (
          <EmptyState onImageSelect={handleImageSelect} />
        ) : (
          <div>
            <div className="mb-8">
              <ImageUploader onImageSelect={handleImageSelect} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <ImageCard 
                  key={image.id}
                  image={image}
                  onDelete={handleDeleteImage}
                  onToonify={handleToonifyClick}
                  onQualityChange={handleQualityChange}
                  refreshImages={fetchImages}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
