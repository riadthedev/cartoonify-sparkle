
import React from 'react';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Pricing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <NavBar />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-toonify-cyan to-toonify-blue bg-clip-text text-transparent mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Choose the plan that works for you. No hidden fees or complicated tiers.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Standard Plan */}
          <div className="bg-toonify-navy/50 border border-toonify-cyan/30 rounded-xl p-8 flex flex-col h-full shadow-lg shadow-toonify-cyan/10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Regular Toonify</h2>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold text-white">$2</span>
                <span className="text-gray-400 ml-2">per image</span>
              </div>
              <p className="text-gray-300">
                Basic cartoon conversion for your images
              </p>
            </div>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-toonify-cyan shrink-0 mr-2" />
                <span className="text-gray-300">Cartoon-style transformation</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-toonify-cyan shrink-0 mr-2" />
                <span className="text-gray-300">Basic pose matching</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-toonify-cyan shrink-0 mr-2" />
                <span className="text-gray-300">Standard delivery time</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-toonify-cyan shrink-0 mr-2" />
                <span className="text-gray-300">Digital download</span>
              </li>
            </ul>
            
            <Link to={user ? "/dashboard" : "/signup"} className="mt-auto">
              <Button className="w-full gradient-border blue-cyan-gradient">
                Get Started
              </Button>
            </Link>
          </div>
          
          {/* Premium Plan */}
          <div className="bg-toonify-navy/50 border border-purple-500/30 rounded-xl p-8 flex flex-col h-full shadow-lg shadow-purple-500/10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 bg-purple-500/20 w-40 h-40 rounded-full blur-3xl"></div>
            
            <div className="mb-6 relative">
              <div className="absolute -top-8 -right-8 bg-purple-500/10 px-3 py-1 rounded-full text-purple-300 text-sm font-medium">
                Premium
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Premium Toonify</h2>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">$10</span>
                <span className="text-gray-400 ml-2">per image</span>
              </div>
              <p className="text-gray-300">
                Enhanced accuracy and quality for your toonified images
              </p>
            </div>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 shrink-0 mr-2" />
                <span className="text-gray-300">High-fidelity cartoon transformation</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 shrink-0 mr-2" />
                <span className="text-gray-300">Advanced pose matching</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 shrink-0 mr-2" />
                <span className="text-gray-300">Accurate background preservation</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 shrink-0 mr-2" />
                <span className="text-gray-300">Priority processing</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 shrink-0 mr-2" />
                <span className="text-gray-300">High-resolution download</span>
              </li>
            </ul>
            
            <Link to={user ? "/dashboard" : "/signup"} className="mt-auto">
              <Button className="w-full gradient-border purple-pink-gradient bg-gradient-to-r from-purple-700/50 to-pink-700/50">
                Choose Premium
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-300 mb-4">
            Need a custom solution for your business? Contact us for enterprise pricing.
          </p>
          <Button variant="outline" className="gradient-border blue-cyan-gradient">
            Contact Sales
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
