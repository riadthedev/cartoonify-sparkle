
import React from 'react';
import { Star, Zap, Download, Paintbrush } from 'lucide-react';

const features = [
  {
    icon: <Paintbrush className="w-10 h-10 text-toonify-cyan" />,
    title: 'Multiple Cartoon Styles',
    description: 'Choose from various cartoon styles including anime, Pixar, comic book, and more.'
  },
  {
    icon: <Zap className="w-10 h-10 text-toonify-pink" />,
    title: 'Instant Transformation',
    description: 'Our AI processes your image in seconds, delivering high-quality cartoons fast.'
  },
  {
    icon: <Star className="w-10 h-10 text-toonify-orange" />,
    title: 'High Resolution Output',
    description: 'Download your cartoon in high resolution, perfect for printing and sharing.'
  },
  {
    icon: <Download className="w-10 h-10 text-toonify-purple" />,
    title: 'Easy to Share',
    description: 'Share your toonified images directly to social media or download them.'
  }
];

const FeaturesList: React.FC = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-toonify-blue to-toonify-cyan bg-clip-text text-transparent">
              Why Choose Toonify
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Our cutting-edge AI technology provides amazing cartoon transformations.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-toonify-dark-navy/50 rounded-2xl p-6 border border-white/5 
              hover:border-white/20 transition-all duration-300 hover:transform hover:-translate-y-1"
            >
              <div className="bg-gradient-to-br from-toonify-navy to-toonify-dark-navy rounded-xl p-4 mb-4 inline-block">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesList;
