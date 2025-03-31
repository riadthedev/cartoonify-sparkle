
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NavBar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-toonify-navy/80 backdrop-blur-md border-white/10">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-toonify-cyan animate-pulse-glow" />
            <span className="font-bold text-2xl bg-gradient-to-r from-toonify-cyan to-toonify-blue bg-clip-text text-transparent">
              Toonify
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium text-gray-200 hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/gallery" className="text-sm font-medium text-gray-200 hover:text-white transition-colors">
            Gallery
          </Link>
          <Link to="/pricing" className="text-sm font-medium text-gray-200 hover:text-white transition-colors">
            Pricing
          </Link>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button 
                  className="gradient-border blue-cyan-gradient"
                  variant="outline"
                >
                  <User className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </Link>
              <Button 
                onClick={() => logout()}
                variant="ghost" 
                className="text-gray-300 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button 
                  className="gradient-border purple-pink-gradient"
                  variant="outline"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-200 hover:text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden p-4 bg-toonify-dark-navy/90 backdrop-blur-md border-b border-white/10">
          <nav className="flex flex-col space-y-4">
            <Link 
              to="/" 
              className="text-sm font-medium text-gray-200 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/gallery" 
              className="text-sm font-medium text-gray-200 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Gallery
            </Link>
            <Link 
              to="/pricing" 
              className="text-sm font-medium text-gray-200 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    className="gradient-border blue-cyan-gradient w-full"
                    variant="outline"
                  >
                    <User className="mr-2 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Button 
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  variant="ghost" 
                  className="text-gray-300 hover:text-white w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    className="gradient-border purple-pink-gradient w-full"
                    variant="outline"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="text-gray-300 hover:text-white w-full">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default NavBar;
