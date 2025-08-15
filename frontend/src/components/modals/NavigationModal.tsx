import React, { useRef } from 'react';
import {
  X,
  ShoppingBag,
  Trophy,
  BookOpen
} from 'lucide-react';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
}

const NavigationModal: React.FC<NavigationModalProps> = ({ isOpen, onClose, category }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const nftCategories = [
    { name: 'Art', description: 'Digital art and illustrations' },
    { name: 'Collectibles', description: 'Unique collectibles and assets' },
    { name: 'Music', description: 'Music and audio NFTs' },
    { name: 'Photography', description: 'Professional photography NFTs' },
    { name: 'Video', description: 'Video and animation NFTs' },
    { name: 'Utility', description: 'NFTs with utility and function' },
    { name: 'Sports', description: 'Sports collectibles and moments' },
    { name: 'Virtual Worlds', description: 'Metaverse and virtual assets' },
  ];

  // Only override for modal types
  const isMarketplace = category === 'marketplace';
  const isRankings = category === 'rankings';
  const isResources = category === 'resources';

  const rankingsItems = [
    { name: 'Top Creators', description: 'Highest performing creators', href: '/rankings' },
    { name: 'Top Collections', description: 'Highest performing collections', href: '/rankings' },
    { name: 'Trending', description: 'Currently trending NFTs', href: '/rankings' },
    { name: 'Top Sellers', description: 'Best performing sellers', href: '/rankings' },
    { name: 'Top Buyers', description: 'Most active buyers', href: '/rankings' },
    { name: 'Activity', description: 'Recent marketplace activity', href: '/rankings' },
    { name: 'Volume Leaders', description: 'Highest volume collections', href: '/rankings' },
  ];

  const resourcesItems = [
    { name: 'Blog', description: 'Latest news and insights', href: '/blog' },
    { name: 'Help Center', description: 'Get help and support', href: '/help' },
    { name: 'API Documentation', description: 'Developer resources', href: '/api-docs' },
    { name: 'Community', description: 'Join our community', href: '/community' },
    { name: 'Newsletter', description: 'Stay updated with news', href: '/newsletter' },
    { name: 'Brand Assets', description: 'Official brand resources', href: '/brand-assets' },
  ];

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50  grid place-items-center p-4 bg-overlay backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-modal rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 bg-blue-900/30 rounded-lg flex items-center justify-center">
              {isMarketplace && <ShoppingBag className="w-5 h-5 text-primary" />}
              {isRankings && <Trophy className="w-5 h-5 text-primary" />}
              {isResources && <BookOpen className="w-5 h-5 text-primary" />}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {isMarketplace && 'Marketplace Categories'}
              {isRankings && 'Rankings'}
              {isResources && 'Resources'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {isMarketplace && nftCategories.map((cat) => (
              <button
                key={cat.name}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group w-full text-left"
                onClick={() => {
                  window.location.href = `/marketplace?category=${encodeURIComponent(cat.name)}`;
                  onClose();
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full mt-2 group-hover:scale-125 transition-transform"></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {cat.description}
                  </p>
                </div>
              </button>
            ))}
            {isRankings && rankingsItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group w-full text-left"
                onClick={onClose}
              >
                <div className="w-2 h-2 bg-primary rounded-full mt-2 group-hover:scale-125 transition-transform"></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </a>
            ))}
            {isResources && resourcesItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group w-full text-left"
                onClick={onClose}
              >
                <div className="w-2 h-2 bg-primary rounded-full mt-2 group-hover:scale-125 transition-transform"></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationModal;
