import React from 'react';
import { X, 
  // Wallet, 
  Shield, Zap } from 'lucide-react';
// sushi
interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string) => void;
  isConnecting: boolean;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onConnect, isConnecting }) => {
  if (!isOpen) return null;

  const wallets = [
    {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask wallet',
      popular: true,
    },
    {
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect using WalletConnect',
      popular: true,
    },
    {
      name: 'Coinbase Wallet',
      icon: '🪙',
      description: 'Connect using Coinbase Wallet',
      popular: false,
    },
    {
      name: 'Phantom',
      icon: '👻',
      description: 'Connect using Phantom wallet',
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Secure connection
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose your preferred wallet to connect to the marketplace
            </p>
          </div>

          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => onConnect(wallet.name)}
                disabled={isConnecting}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-2xl">{wallet.icon}</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {wallet.name}
                      {isConnecting && wallet.name === 'MetaMask' && (
                        <span className="ml-2 text-sm text-blue-500">Connecting...</span>
                      )}
                    </span>
                    {wallet.popular && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {wallet.description}
                  </p>
                </div>
                <Zap className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              By connecting a wallet, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;