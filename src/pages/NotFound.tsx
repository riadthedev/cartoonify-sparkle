
import React from 'react';
import { Link } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl font-bold mb-4 bg-gradient-to-r from-toonify-cyan via-toonify-blue to-toonify-purple bg-clip-text text-transparent">
            404
          </div>
          
          <h1 className="text-3xl font-bold mb-6">Page Not Found</h1>
          
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            Oops! It seems the page you're looking for has vanished into the cartoon dimension.
          </p>
          
          <Link to="/">
            <Button 
              className="gradient-border blue-cyan-gradient"
              variant="outline"
              size="lg"
            >
              <Home className="mr-2 h-5 w-5" /> Return Home
            </Button>
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFound;
