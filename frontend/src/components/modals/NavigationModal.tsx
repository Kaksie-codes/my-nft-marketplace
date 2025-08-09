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

  const navigationData = {
    marketplace: {
      title: 'Marketplace',
      icon: ShoppingBag,
      items: [
        { name: 'All NFTs', href: '#', description: 'Browse all available NFTs' },
        { name: 'Art', href: '#', description: 'Digital art and illustrations' },
        { name: 'Photography', href: '#', description: 'Professional photography NFTs' },
        { name: 'Gaming', href: '#', description: 'Gaming assets and collectibles' },
        { name: 'Music', href: '#', description: 'Music and audio NFTs' },
        { name: 'Domain Names', href: '#', description: 'Blockchain domain names' },
        { name: 'Virtual Worlds', href: '#', description: 'Metaverse and virtual assets' },
        { name: 'Sports', href: '#', description: 'Sports collectibles and moments' },
      ]
    },
    rankings: {
      title: 'Rankings',
      icon: Trophy,
      items: [
        { name: 'Top Collections', href: '#', description: 'Highest performing collections' },
        { name: 'Trending', href: '#', description: 'Currently trending NFTs' },
        { name: 'Top Sellers', href: '#', description: 'Best performing sellers' },
        { name: 'Top Buyers', href: '#', description: 'Most active buyers' },
        { name: 'Activity', href: '#', description: 'Recent marketplace activity' },
        { name: 'Volume Leaders', href: '#', description: 'Highest volume collections' },
      ]
    },
    resources: {
      title: 'Resources',
      icon: BookOpen,
      items: [
        { name: 'Blog', href: '#', description: 'Latest news and insights' },
        { name: 'Help Center', href: '#', description: 'Get help and support' },
        { name: 'API Documentation', href: '#', description: 'Developer resources' },
        { name: 'Community', href: '#', description: 'Join our community' },
        { name: 'Newsletter', href: '#', description: 'Stay updated with news' },
        { name: 'Brand Assets', href: '#', description: 'Official brand resources' },
      ]
    }
  };

  const currentCategory = navigationData[category as keyof typeof navigationData];
  if (!currentCategory) return null;

  const CategoryIcon = currentCategory.icon;

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
              <CategoryIcon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {currentCategory.title}
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
            {currentCategory.items.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
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
