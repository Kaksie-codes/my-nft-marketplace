

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import SlidingTabs from '../components/SlidingTabs';
import NFTCard from '../components/NFTCard';
import NFTCollectionCard from '../components/NFTCollectionCard';
import RegularPageWrapper from '../components/RegularPageWrapper';

const categories = [
  'Art', 'Collectibles', 'Music', 'Photography', 'Video', 'Utility', 'Sports', 'Virtual Worlds'
];

const baseNFTs = [
  { image: '/nft-1.png', title: 'Galactic Cat', creatorImage: '/art.png', creatorName: 'Jack Smith', price: '1.2 ETH', highestBid: '0.8 ETH', category: 'Art' },
  { image: '/nft-2.png', title: 'Galactic Dog', creatorImage: '/collectibles.png', creatorName: 'Jane Doe', price: '2.1 ETH', highestBid: '1.5 ETH', category: 'Collectibles' },
  { image: '/nft-3.png', title: 'Galactic Bird', creatorImage: '/music_notes.png', creatorName: 'Alex Ray', price: '0.9 ETH', highestBid: '0.5 ETH', category: 'Music' },
  { image: '/nft-1.png', title: 'Galactic Fish', creatorImage: '/Planet.png', creatorName: 'Sam Lee', price: '1.7 ETH', highestBid: '1.2 ETH', category: 'Photography' },
  { image: '/nft-2.png', title: 'Galactic Fox', creatorImage: '/VideoCamera.png', creatorName: 'Chris Kim', price: '2.5 ETH', highestBid: '2.1 ETH', category: 'Video' },
  { image: '/nft-3.png', title: 'Galactic Wolf', creatorImage: '/MagicWand.png', creatorName: 'Pat Green', price: '1.3 ETH', highestBid: '1.0 ETH', category: 'Utility' },
];
// Simulate 40 NFTs for 10 pages
const nftImages = ['/nft-1.png', '/nft-2.png', '/nft-3.png'];
const nfts = Array.from({ length: 200 }, (_, i) => {
  const base = baseNFTs[i % baseNFTs.length];
  return {
    ...base,
    title: base.title + ' #' + (i + 1),
    image: nftImages[i % nftImages.length],
  };
});

const collections = [
  { image: '/collectibles.png', title: 'Cool Collection', items: 12, owner: 'Jack Smith' },
  { image: '/art.png', title: 'Rare Art', items: 8, owner: 'Jane Doe' },
  { image: '/Planet.png', title: 'Pixel Wonders', items: 15, owner: 'Alex Ray' },
  { image: '/MagicWand.png', title: 'Crypto Critters', items: 20, owner: 'Sam Lee' },
  { image: '/Paintbrush.png', title: 'Mystic Gallery', items: 10, owner: 'Chris Kim' },
  { image: '/video.png', title: 'Digital Dreams', items: 18, owner: 'Pat Green' },
];

const MarketPlacePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Auto-select category from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat && categories.includes(cat)) {
      setSelectedCategories([cat]);
    }
  }, [location.search]);
  const tabs = [
    { label: 'NFTs', count: nfts.length },
    { label: 'Collections', count: collections.length },
  ];

  // Filtered data
  const filteredNFTs = nfts.filter(nft => {
    const matchesSearch = nft.title.toLowerCase().includes(search.toLowerCase()) || nft.creatorName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(nft.category);
    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredNFTs.length / itemsPerPage);
  const paginatedNFTs = filteredNFTs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const filteredCollections = collections.filter(col =>
    col.title.toLowerCase().includes(search.toLowerCase()) ||
    col.owner.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">
        <div className="container max-w-6xl mx-auto pt-16 pb-10">
          <h1 className="text-5xl font-extrabold mb-4 text-main">Explore Marketplace</h1>
          <p className="text-lg text-muted mb-8 max-w-2xl">Discover, search, and filter thousands of NFTs and collections from top creators. Find your next digital collectible or explore curated collections in our marketplace.</p>
          <div className="mb-8">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search NFTs or Collections..."
              className="w-full max-w-xl px-5 py-3 rounded-xl border border-surface bg-background text-main text-lg focus:outline-none focus:border-primary transition"
            />
          </div>        
        </div>
          <SlidingTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div className="bg-surface">
            <div className="container max-w-6xl mx-auto pt-16 pb-10">
              {activeTab === 0 ? (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Sidebar for category filters under NFT tab only */}
                  <aside className="w-full md:w-64 flex-shrink-0 mb-8 md:mb-0">
                    <div className="bg-background rounded-xl p-6 shadow">
                      <h3 className="text-lg font-bold text-main mb-4">Categories</h3>
                      <div className="flex flex-col gap-3">
                        {categories.map(cat => (
                          <label key={cat} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat)}
                              onChange={e => {
                                setSelectedCategories(prev =>
                                  e.target.checked
                                    ? [...prev, cat]
                                    : prev.filter(c => c !== cat)
                                );
                              }}
                              className="accent-primary w-4 h-4 rounded focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-main text-sm">{cat}</span>
                          </label>
                        ))}
                      </div>
                      {selectedCategories.length > 0 && (
                        <button
                          className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow hover:bg-primary/80 transition border border-primary"
                          onClick={() => setSelectedCategories([])}
                          type="button"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </aside>
                  {/* Main NFT grid */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {paginatedNFTs.length > 0 ? paginatedNFTs.map((nft, i) => (
                        <NFTCard
                          key={i}
                          {...nft}
                          onClick={() => navigate(`/nft/${encodeURIComponent(nft.title)}`)}
                        />
                      )) : <div className="col-span-2 text-center text-muted text-lg">No NFTs found.</div>}
                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="col-span-2 flex justify-center mt-8">
                          <nav className="flex gap-2">
                            {/* Windowed pagination logic */}
                            {(() => {
                              const windowSize = 5;
                              const pages = [];
                              if (totalPages <= windowSize) {
                                for (let i = 1; i <= totalPages; i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      className={`px-3 py-1 rounded-lg border text-sm font-bold transition ${page === i ? 'bg-primary text-white border-primary' : 'bg-background text-main border-surface hover:bg-primary/10'}`}
                                      onClick={() => setPage(i)}
                                    >
                                      {i}
                                    </button>
                                  );
                                }
                              } else {
                                // Always show first page
                                pages.push(
                                  <button
                                    key={1}
                                    className={`px-3 py-1 rounded-lg border text-sm font-bold transition ${page === 1 ? 'bg-primary text-white border-primary' : 'bg-background text-main border-surface hover:bg-primary/10'}`}
                                    onClick={() => setPage(1)}
                                  >
                                    1
                                  </button>
                                );
                                // Show left ellipsis if needed
                                if (page > 3) {
                                  pages.push(<span key="left-ellipsis" className="px-2">...</span>);
                                }
                                // Show middle pages
                                const start = Math.max(2, page - 1);
                                const end = Math.min(totalPages - 1, page + 1);
                                for (let i = start; i <= end; i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      className={`px-3 py-1 rounded-lg border text-sm font-bold transition ${page === i ? 'bg-primary text-white border-primary' : 'bg-background text-main border-surface hover:bg-primary/10'}`}
                                      onClick={() => setPage(i)}
                                    >
                                      {i}
                                    </button>
                                  );
                                }
                                // Show right ellipsis if needed
                                if (page < totalPages - 2) {
                                  pages.push(<span key="right-ellipsis" className="px-2">...</span>);
                                }
                                // Always show last page
                                pages.push(
                                  <button
                                    key={totalPages}
                                    className={`px-3 py-1 rounded-lg border text-sm font-bold transition ${page === totalPages ? 'bg-primary text-white border-primary' : 'bg-background text-main border-surface hover:bg-primary/10'}`}
                                    onClick={() => setPage(totalPages)}
                                  >
                                    {totalPages}
                                  </button>
                                );
                              }
                              return pages;
                            })()}
                          </nav>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {filteredCollections.length > 0 ? filteredCollections.map((col, i) => (
                    <NFTCollectionCard
                      key={i}
                      {...col}
                      onClick={() => navigate(`/collection/${encodeURIComponent(col.title)}`)}
                    />
                  )) : <div className="col-span-3 text-center text-muted text-lg">No collections found.</div>}
                </div>
              )}
            </div>
          </div>
      </div>
    </RegularPageWrapper>
  );
};

export default MarketPlacePage;
