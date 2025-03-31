
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Upload, ImagePlus, CheckCircle, Clock, AlertCircle, Download, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Mock data for the user's images
const mockImages = [
  { 
    id: 1, 
    original: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=60',
    toonified: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=60&sat=-100&blur=3',
    status: 'complete',
    createdAt: '2023-10-15'
  },
  { 
    id: 2, 
    original: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=500&q=60',
    toonified: null,
    status: 'in_queue',
    createdAt: '2023-10-20'
  },
  { 
    id: 3, 
    original: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=60',
    toonified: null,
    status: 'not_toonified',
    createdAt: '2023-10-25'
  },
];

const Dashboard: React.FC = () => {
  const [images, setImages] = useState(mockImages);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      
      // Simulate file upload
      setTimeout(() => {
        setIsUploading(false);
        const newImage = {
          id: Date.now(),
          original: URL.createObjectURL(e.target.files![0]),
          toonified: null,
          status: 'not_toonified',
          createdAt: new Date().toISOString().split('T')[0]
        };
        
        setImages([newImage, ...images]);
        
        toast({
          title: "Image uploaded",
          description: "Your image has been uploaded successfully.",
        });
      }, 1500);
    }
  };

  const handleToonifyClick = (id: number) => {
    // In a real app, this would redirect to Stripe payment
    // For demo purposes, we'll just update the status
    toast({
      title: "Redirecting to payment",
      description: "You'll be redirected to the payment page.",
    });
    
    // Simulate status change after "payment"
    setTimeout(() => {
      setImages(images.map(img => 
        img.id === id ? { ...img, status: 'in_queue' } : img
      ));
      
      // And then simulate the process completing
      setTimeout(() => {
        setImages(images.map(img => 
          img.id === id ? { 
            ...img, 
            status: 'complete',
            toonified: img.original + '&sat=-100&blur=3'
          } : img
        ));
        
        toast({
          title: "Toonification complete",
          description: "Your image has been toonified successfully!",
        });
      }, 5000);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar isLoggedIn={true} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
            <p className="text-gray-400">Manage your toonified images</p>
          </div>
          
          <input
            type="file"
            id="upload-image"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <label htmlFor="upload-image">
            <Button 
              className="gradient-border blue-cyan-gradient mt-4 md:mt-0"
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
        
        {images.length === 0 ? (
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
            {images.map((image) => (
              <div 
                key={image.id} 
                className="bg-toonify-dark-navy/70 rounded-2xl p-6 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:border-white/20"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center">
                      {image.status === 'complete' && (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      )}
                      {image.status === 'in_queue' && (
                        <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                      )}
                      {image.status === 'not_toonified' && (
                        <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      
                      <span className="font-medium">
                        {image.status === 'complete' && 'Complete'}
                        {image.status === 'in_queue' && 'In Queue'}
                        {image.status === 'not_toonified' && 'Not Toonified'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Uploaded on {image.createdAt}</p>
                  </div>
                  
                  {image.status === 'complete' && (
                    <Button size="sm" variant="ghost" className="text-toonify-cyan hover:text-toonify-blue">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="rounded-xl overflow-hidden mb-4 aspect-square">
                  <img 
                    src={image.original} 
                    alt="Original" 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {image.status === 'complete' ? (
                  <div className="rounded-xl overflow-hidden border-2 border-toonify-purple/30 aspect-square">
                    <img 
                      src={image.toonified} 
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
                      <Button 
                        className="gradient-border purple-pink-gradient"
                        variant="outline"
                        onClick={() => handleToonifyClick(image.id)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" /> Toonify Now
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
