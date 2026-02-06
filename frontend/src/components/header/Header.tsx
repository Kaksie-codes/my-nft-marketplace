import React, { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  X,
  ChevronDown,
  ShoppingBag,
  Trophy,
  BookOpen,
  UserPlus,
  Upload,
} from 'lucide-react';

import NavigationModal from '../modals/NavigationModal';
import ProfileModal from '../modals/ProfileModal';
import SearchModal from '../modals/SearchModal';
import Logo from '../Logo';
import ThemeToggler from '../ThemeToggler';
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi';
import MintNFTModal from '../modals/MintNFTModal';
import Button from '../button/Button';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavigationModalOpen, setIsNavigationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [activeNavCategory, setActiveNavCategory] = useState('');

  const { isConnected } = useAccount(); // Get wallet connection status
  const [searchQuery, setSearchQuery] = useState('');

  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: '',
    walletAddress: '',
  });

  console.log(setUserProfile);

  const handleNavClick = (category: string) => {
    setActiveNavCategory(category);
    setIsNavigationModalOpen(true);
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
            {/* Logo */}
            <Logo />

            {/* Main Navigation Container */}
            <div className='flex items-center space-x-8 justify-between'>
              {/* Search Button */}
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
                {/* Mint NFT Button - Only show when wallet is connected */}
                {
                  isConnected && (
                    <Button
                      // title='Dashboard'
                      onClick={() => navigate('/dashboard')}
                      variant='primary'
                      size='md'
                      sxclass='hidden md:inline-flex items-center gap-2 px-4 py-2'
                      >
                      {/* <Upload size={16} /> */}
                      Dashboard
                    </Button>
                  )
                }
                {isConnected && (
                  <button
                    onClick={() => setIsMintModalOpen(true)}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    <Upload size={18} />
                    Mint NFT
                  </button>
                )}
                {/* Wallet Connection */}
                <ConnectButton 
                  showBalance={true}
                  // chainStatus="icon"
                  accountStatus="address"
                />
                {/* Profile Button */}
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {userProfile.name.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>
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

                {/* Mobile Mint NFT Button - Only show when wallet is connected */}
                {isConnected && (
                  <button
                    onClick={() => {
                      setIsMintModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all font-semibold"
                  >
                    <Upload size={20} />
                    Mint NFT
                  </button>
                )}

                {/* Mobile Sign Up */}
                {!isConnected && (
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
      {/* <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleWalletConnect}
        isConnecting={isConnecting}
      /> */}

      <NavigationModal
        isOpen={isNavigationModalOpen}
        onClose={() => setIsNavigationModalOpen(false)}
        category={activeNavCategory}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onLogout={() => {}}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
      <MintNFTModal
        isOpen={isMintModalOpen}
        onClose={() => setIsMintModalOpen(false)}
        onSuccess={(tokenId:bigint) => {
          console.log('NFT minted successfully! Token ID:', tokenId);
          // Optionally navigate to the NFT page or show a success message
        }}
      />
    </>
  );
};

export default Header;
