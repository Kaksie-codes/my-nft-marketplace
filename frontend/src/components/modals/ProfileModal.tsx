import React, { useEffect } from 'react';
import { X, User, Eye, Layers, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUser } from '../../context/UserContext';
import { resolveIpfsUrl } from '../../utils/ipfs';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onLogout }) => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { user } = useUser();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName =
    user?.username ||
    (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—');

  const avatarUrl = user?.avatar ? resolveIpfsUrl(user.avatar) : null;
  const avatarInitial = (user?.username?.charAt(0) || 'U').toUpperCase();
  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  const menuItems = [
    {
      icon: User,
      label: 'My Profile',
      description: 'View and edit your profile',
      onClick: () => {
        navigate(address ? `/dashboard/profile/${address}` : '/dashboard');
        onClose();
      },
    },
    {
      icon: Eye,
      label: 'My NFTs',
      description: 'NFTs in your wallet',
      onClick: () => {
        navigate('/dashboard/my-nfts');
        onClose();
      },
    },
    {
      icon: Layers,
      label: 'My Collections',
      description: 'Collections you created',
      onClick: () => {
        navigate('/dashboard/collections/create');
        onClose();
      },
    },   
    {
      icon: Shield,
      label: 'Dashboard',
      description: 'Back to dashboard',
      onClick: () => {
        navigate('/dashboard');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute top-14 right-3 w-full max-w-xs">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Account
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {avatarInitial}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {displayName}
                </h3>

                {shortAddress && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono truncate">
                    {shortAddress}
                  </p>
                )}

                {!user && address && (
                  <p className="text-[11px] text-gray-400">
                    Loading profile…
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="p-2">
            <div className="space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-2 p-2 w-full rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group text-left"
                >
                  <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-xs">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 p-2 w-full rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
              >
                <div className="w-7 h-7 bg-red-100 dark:bg-red-900/30 rounded-md flex items-center justify-center shrink-0">
                  <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                </div>
                <span className="font-medium text-red-600 dark:text-red-400 text-xs">
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;