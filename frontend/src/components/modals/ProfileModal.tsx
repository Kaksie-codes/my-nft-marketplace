import React from 'react';
import { X, User, Settings, Heart, Eye, Wallet, LogOut, Shield, Bell, HelpCircle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    name: string;
    email: string;
    avatar: string;
    walletAddress?: string;
  };
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userProfile, onLogout }) => {
  if (!isOpen) return null;

  const menuItems = [
    { icon: User, label: 'My Profile', href: '#', description: 'View and edit your profile' },
    { icon: Eye, label: 'My Collections', href: '#', description: 'View your NFT collections' },
    { icon: Heart, label: 'Favorites', href: '#', description: 'Your liked NFTs' },
    { icon: Wallet, label: 'My Wallet', href: '#', description: 'Manage your wallet' },
    { icon: Settings, label: 'Settings', href: '#', description: 'Account settings' },
    { icon: Bell, label: 'Notifications', href: '#', description: 'Notification preferences' },
    { icon: Shield, label: 'Security', href: '#', description: 'Security settings' },
    { icon: HelpCircle, label: 'Help & Support', href: '#', description: 'Get help' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4 bg-black/20">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Account
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {userProfile.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userProfile.email}
              </p>
              {userProfile.walletAddress && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                  {userProfile.walletAddress}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <item.icon className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
            >
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="font-medium text-red-600 dark:text-red-400 text-sm">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;