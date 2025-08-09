import React, { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  X,
  Wallet,
  ChevronDown,
  ShoppingBag,
  Trophy,
  BookOpen,
  User,
  UserPlus,
} from 'lucide-react';

import WalletModal from '../modals/WalletModal';
import NavigationModal from '../modals/NavigationModal';
import ProfileModal from '../modals/ProfileModal';
import SearchModal from '../modals/SearchModal';
import Logo from '../Logo';
import ThemeToggler from '../ThemeToggler';
import Button from '../button/Button';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isNavigationModalOpen, setIsNavigationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeNavCategory, setActiveNavCategory] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: '',
    walletAddress: '',
  });

  const handleNavClick = (category: string) => {
    setActiveNavCategory(category);
    setIsNavigationModalOpen(true);
  };

  const handleWalletConnect = async (walletType: string) => {
    if (walletType === 'metamask') {
      setIsConnecting(true);
      try {
        // MetaMask connection logic here (commented out)
      } catch (error: any) {
        console.error('Failed to connect to MetaMask:', error);
        if (error.code === 4001) {
          alert('Connection rejected. Please approve the connection to continue.');
        } else {
          alert('Failed to connect to MetaMask. Please try again.');
        }
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert(`${walletType} connection is not implemented yet. This is a demo.`);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setWalletAddress('');
    setUserProfile(prev => ({ ...prev, walletAddress: '' }));
  }; 

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsConnected(false);
    setWalletAddress('');
    setUserProfile({
      name: '',
      email: '',
      avatar: '',
      walletAddress: '',
    });
    setIsProfileModalOpen(false);
  };

  const navItems = [
    { name: 'Marketplace', category: 'marketplace', icon: ShoppingBag },
    { name: 'Rankings', category: 'rankings', icon: Trophy },
    { name: 'Resources', category: 'resources', icon: BookOpen },
  ];
 
  return (
    <>
  <header className={`sticky top-0 z-40 bg-background transition-all duration-300 ${scrolled ? 'shadow-lg border-b border-gray-200 dark:border-gray-700' : ''}`}> 
        <div className="max-w-7xl mx-auto container px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo/>
            <div className='flex items-center space-x-8 justify-between'>
                <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="flex items-center cursor-pointer gap-2 border border-gray-600 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Search className="h-4 w-4 text-main" />
                    <span className='text-sm text-main max-sm:hidden'>Ctrl K</span>
                </button>
                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-8">
                  {navItems.map(item => (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.category)}
                      className="flex items-center gap-1 text-main hover:text-primary transition-colors duration-200"
                    >
                      <item.icon size={16} />
                      {item.name}
                      <ChevronDown size={12} />
                    </button>
                  ))}
                </nav>
                {/* Right Side Actions */}
                <div className="flex items-center space-x-4">
                  {/* Sign Up / Profile */}
                  {isLoggedIn ? (
                    <div>
                      <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {userProfile.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </button>
                      {/* Wallet Connection */}
                      {isConnected ? (
                        <div className="relative group">
                          <button className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <User size={16} />
                            <span className="hidden sm:inline">{walletAddress}</span>
                            <ChevronDown size={14} />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={handleDisconnect}
                              className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              Disconnect Wallet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsWalletModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Wallet size={16} />
                          <span className="hidden sm:inline">Connect Wallet</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={() => navigate('/login')}
                      sxclass='px-4'
                      size='md'
                    >
                      Login
                    </Button>
                  )}
                  {/* Theme Toggle */}
                  <ThemeToggler />
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 relative z-[100000]"
                  >
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="absolute top-0 left-0 w-full lg:hidden border-t border-gray-200 dark:border-gray-700 bg-surface">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {/* Mobile Search */}
                <div className="px-3 py-2 mt-10">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none w-[80%]">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="block w-full max-w-[800px] pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Mobile Navigation Links */}
                {navItems.map(item => (
                  <button
                    key={item.name}
                    onClick={() => {
                      handleNavClick(item.category);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <item.icon size={20} />
                    {item.name}
                    <ChevronDown size={14} />
                  </button>
                ))}

                {/* Mobile Sign Up */}
                {!isLoggedIn && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <UserPlus size={20} />
                    Sign Up
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modals */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleWalletConnect}
        isConnecting={isConnecting}
      />

      <NavigationModal
        isOpen={isNavigationModalOpen}
        onClose={() => setIsNavigationModalOpen(false)}
        category={activeNavCategory}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onLogout={handleLogout}
      />
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};

export default Header;
