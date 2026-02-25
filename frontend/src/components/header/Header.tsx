import React, { useState, useEffect } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import ThemeToggler from '../ThemeToggler';
import Button from '../button/Button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const Header: React.FC = () => {
  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  const handleMobileLink = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const navLinks = [
    { label: 'Marketplace', path: '/marketplace' },
    { label: 'Rankings',    path: '/rankings'    },
  ];

  return (
    <header className={`sticky top-0 z-40 bg-background transition-all duration-300 ${
      scrolled ? 'shadow-lg border-b border-muted' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">

          {/* Logo */}
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8 flex-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm text-main hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search — navigates to marketplace with focus on search */}
            <button
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-2 border border-muted rounded-lg px-3 py-1.5 hover:border-primary transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-main" />
              <span className="text-sm text-muted hidden sm:inline">Search</span>
            </button>

            {/* Dashboard — only when connected */}
            {isConnected && (
              <Button
                onClick={() => navigate('/dashboard')}
                variant="primary"
                size="sm"
                sxclass="hidden md:inline-flex px-4"
              >
                Dashboard
              </Button>
            )}

            {/* Wallet */}
            <ConnectButton showBalance={false} accountStatus="address" />

            {/* Theme */}
            <ThemeToggler />

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 text-main hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden absolute top-16 left-0 w-full bg-surface border-t border-muted shadow-lg z-50">
            <div className="px-4 py-4 flex flex-col gap-2">
              {navLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => handleMobileLink(link.path)}
                  className="text-left px-3 py-2.5 text-sm text-main hover:text-primary hover:bg-background rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
              {isConnected && (
                <button
                  onClick={() => handleMobileLink('/dashboard')}
                  className="text-left px-3 py-2.5 text-sm font-semibold text-primary hover:bg-background rounded-lg transition-colors"
                >
                  Dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;