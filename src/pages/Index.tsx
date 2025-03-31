
import React from 'react';
import NavBar from '@/components/NavBar';
import HeroSection from '@/components/HeroSection';
import SampleGallery from '@/components/SampleGallery';
import FeaturesList from '@/components/FeaturesList';
import Footer from '@/components/Footer';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-grow">
        <HeroSection />
        <SampleGallery />
        <FeaturesList />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
