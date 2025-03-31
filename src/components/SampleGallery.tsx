
import React from 'react';
import { ArrowRight } from 'lucide-react';

// Sample data for before/after images
const sampleImages = [
  {
    id: 1,
    before: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=60',
    after: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=60&sat=-100&blur=3',
    title: 'Portrait Cartoon'
  },
  {
    id: 2,
    before: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=500&q=60',
    after: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=500&q=60&sat=-100&blur=3', 
    title: 'Professional Style'
  },
  {
    id: 3,
    before: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=60',
    after: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=60&sat=-100&blur=3',
    title: 'Anime Style'
  },
  {
    id: 4,
    before: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=500&q=60',
    after: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=500&q=60&sat=-100&blur=3',
    title: 'Pet Cartoon'
  }
];

const SampleGallery: React.FC = () => {
  return (
    <section className="py-16 bg-toonify-dark-navy">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-toonify-purple to-toonify-pink bg-clip-text text-transparent">
              Amazing Transformations
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Check out these incredible before and after examples from our users.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sampleImages.map((image) => (
            <div key={image.id} className="cartoon-card group">
              <div className="relative">
                <div className="flex flex-col space-y-3">
                  <div className="aspect-square rounded-xl overflow-hidden">
                    <img 
                      src={image.before} 
                      alt={`Before ${image.title}`}
                      className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-40"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowRight className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  <div className="aspect-square rounded-xl overflow-hidden border-2 border-toonify-purple/50">
                    <img 
                      src={image.after} 
                      alt={`After ${image.title}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 bg-toonify-purple text-white p-2 rounded-full shadow-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              
              <h3 className="mt-4 text-center text-gray-200 font-medium">
                {image.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SampleGallery;
