import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import SlidingTabs from '../components/SlidingTabs';
import NFTCard from '../components/NFTCard';
import TrendingCollectionCard from '../components/TrendingCollectionCard';
import RegularPageWrapper from '../components/RegularPageWrapper';
import { nftsApi, collectionsApi, usersApi, type NFT, type Collection, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Art',            value: 'art'            },
  { label: 'Collectibles',   value: 'collectibles'   },
  { label: 'Music',          value: 'music'          },
  { label: 'Photography',    value: 'photography'    },
  { label: 'Video',          value: 'video'          },
  { label: 'Utility',        value: 'utility'        },
  { label: 'Sports',         value: 'sports'         },
  { label: 'Virtual Worlds', value: 'virtual_worlds' },
  { label: 'Other',          value: 'other'          },
];

const ITEMS_PER_PAGE = 24;

// ── Skeletons ─────────────────────────────────────────────────────────────────

function NFTCardSkeleton() {
  return (
    <div className="bg-background rounded-[20px] animate-pulse border border-muted">
      <div className="w-full h-[220px] bg-muted/20 rounded-t-[20px]" />
      <div className="px-4 py-4 space-y-3">
        <div className="h-4 bg-muted/20 rounded w-3/4" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted/20" />
          <div className="h-3 bg-muted/20 rounded w-1/3" />
        </div>
        <div className="flex justify-between mt-2">
          <div className="h-8 bg-muted/20 rounded w-1/3" />
          <div className="h-8 bg-muted/20 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

function CollectionCardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-[180px] bg-muted/20 rounded-[10px]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-[70px] bg-muted/20 rounded-[5px]" />
        <div className="h-[70px] bg-muted/20 rounded-[5px]" />
        <div className="h-[70px] bg-muted/20 rounded-[5px]" />
      </div>
      <div className="h-5 bg-muted/20 rounded w-2/3" />
      <div className="h-4 bg-muted/20 rounded w-1/2" />
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page:       number;
  totalPages: number;
  onChange:   (p: number) => void;
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)              pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end   = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }
  return (
    <div className="flex justify-center items-center gap-2 mt-10">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-muted text-sm text-muted hover:text-main hover:border-primary disabled:opacity-30 transition">
        Prev
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis'
          ? <span key={`e${i}`} className="px-2 text-muted">...</span>
          : <button key={p} onClick={() => onChange(p)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
                page === p ? 'bg-primary text-white border-primary' : 'border-muted text-main hover:border-primary hover:bg-primary/10'
              }`}>
              {p}
            </button>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-muted text-sm text-muted hover:text-main hover:border-primary disabled:opacity-30 transition">
        Next
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface CollectionWithNFTs {
  collection:  Collection;
  nfts:        NFT[];
  creatorUser: UserProfile | null;
}

const MarketPlacePage = () => {
  const navigate                        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read categories from URL — used for rendering only, NOT in dependency arrays
  const selectedCategories = searchParams.getAll('category');

  const [activeTab,   setActiveTab]   = useState(0);
  const [search,      setSearch]      = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // NFT state
  const [nfts,       setNfts]       = useState<NFT[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile | null>>({});
  const [nftTotal,   setNftTotal]   = useState(0);
  const [nftPage,    setNftPage]    = useState(1);
  const [nftLoading, setNftLoading] = useState(true);

  // Collection state
  const [collections,     setCollections]     = useState<CollectionWithNFTs[]>([]);
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [collectionPage,  setCollectionPage]  = useState(1);
  const [colLoading,      setColLoading]      = useState(true);

  // ── Use a ref for searchParams so we can read it inside callbacks
  // without adding it to dependency arrays (which would cause infinite loops
  // because searchParams is a new object reference on every render)
  const searchParamsRef = useRef(searchParams);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);

  // ── Fetch NFTs ────────────────────────────────────────────────────────────
  // Dependencies: only primitive values (nftPage, search) — NOT searchParams
  const fetchNFTs = useCallback(async () => {
    setNftLoading(true);
    try {
      // Read categories from ref — stable reference, won't cause re-renders
      const cats = searchParamsRef.current.getAll('category');

      let allNfts: NFT[] = [];
      let total = 0;

      if (cats.length > 0) {
        const results = await Promise.all(
          cats.map(cat => nftsApi.getByCategory(cat, nftPage, ITEMS_PER_PAGE))
        );
        allNfts = results.flatMap(r => r.data);
        total   = results.reduce((sum, r) => sum + r.pagination.total, 0);
      } else {
        const res = await nftsApi.getAll(nftPage, ITEMS_PER_PAGE);
        allNfts   = res.data;
        total     = res.pagination.total;
      }

      const filtered = search.trim()
        ? allNfts.filter(n => {
            const name = typeof n.metadata?.name === 'string' ? n.metadata.name : '';
            return name.toLowerCase().includes(search.toLowerCase());
          })
        : allNfts;

      setNfts(filtered);
      setNftTotal(total);

      const uniqueMinters = [...new Set(filtered.map(n => n.minter).filter(Boolean))];
      const profiles = await Promise.all(
        uniqueMinters.map(addr => usersApi.getProfile(addr).catch(() => null))
      );
      const map: Record<string, UserProfile | null> = {};
      uniqueMinters.forEach((addr, i) => { map[addr] = profiles[i]; });
      setProfileMap(map);
    } catch (err) {
      console.error('Failed to fetch NFTs:', err);
    } finally {
      setNftLoading(false);
    }
  }, [nftPage, search]); // ← no searchParams here

  // ── Fetch Collections ─────────────────────────────────────────────────────
  const fetchCollections = useCallback(async () => {
    setColLoading(true);
    try {
      const res      = await collectionsApi.getAll({ page: collectionPage, limit: ITEMS_PER_PAGE });
      const filtered = search.trim()
        ? res.data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
        : res.data;

      const withData = await Promise.all(
        filtered.map(async (col) => {
          const [nftRes, creatorUser] = await Promise.all([
            collectionsApi.getNFTs(col.address, 1, 3).catch(() => ({ data: [] as NFT[] })),
            usersApi.getProfile(col.creator).catch(() => null),
          ]);
          return { collection: col, nfts: nftRes.data, creatorUser };
        })
      );

      setCollections(withData);
      setCollectionTotal(res.pagination.total);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setColLoading(false);
    }
  }, [collectionPage, search]); // ← no searchParams here

  // ── Re-fetch NFTs when URL categories change ──────────────────────────────
  // We stringify the array to get a stable primitive for the dependency
  const categoriesKey = searchParams.getAll('category').join(',');
  useEffect(() => { fetchNFTs(); }, [fetchNFTs, categoriesKey]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);
  useEffect(() => { setCollectionPage(1); }, [search]);

  // ── Category toggle — updates URL ─────────────────────────────────────────
  const toggleCategory = (value: string) => {
    const current = searchParamsRef.current.getAll('category');
    const next    = current.includes(value)
      ? current.filter(c => c !== value)
      : [...current, value];

    const newParams = new URLSearchParams(searchParamsRef.current);
    newParams.delete('category');
    next.forEach(c => newParams.append('category', c));
    setSearchParams(newParams, { replace: true });
    setNftPage(1);
  };

  const clearCategories = () => {
    const newParams = new URLSearchParams(searchParamsRef.current);
    newParams.delete('category');
    setSearchParams(newParams, { replace: true });
    setNftPage(1);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getNFTImage       = (nft: NFT) => resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');
  const getNFTTitle       = (nft: NFT) => typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;
  const getNFTCreatorName = (nft: NFT) => profileMap[nft.minter]?.username || `${nft.minter.slice(0, 6)}...${nft.minter.slice(-4)}`;
  const getNFTCreatorImg  = (nft: NFT) => { const a = profileMap[nft.minter]?.avatar; return a ? resolveIpfsUrl(a) : undefined; };

  const nftTotalPages = Math.ceil(nftTotal / ITEMS_PER_PAGE);
  const colTotalPages = Math.ceil(collectionTotal / ITEMS_PER_PAGE);

  const tabs = [
    { label: 'NFTs',        count: nftTotal        },
    { label: 'Collections', count: collectionTotal },
  ];

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">

        {/* Header */}
        <div className="container max-w-6xl mx-auto pt-16 pb-10 px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 text-main">Explore Marketplace</h1>
          <p className="text-lg text-muted mb-8 max-w-2xl">
            Discover, search, and filter NFTs and collections from creators on Sepolia.
          </p>

          {/* Active category pills */}
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCategories.map(cat => {
                const label = CATEGORIES.find(c => c.value === cat)?.label ?? cat;
                return (
                  <span key={cat} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
                    {label}
                    <button onClick={() => toggleCategory(cat)} className="hover:text-primary/60">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
              <button onClick={clearCategories} className="text-xs text-muted hover:text-primary underline">
                Clear all
              </button>
            </div>
          )}

          {/* Search + mobile filter toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search NFTs or Collections..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-muted bg-background text-main text-sm focus:outline-none focus:border-primary transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main">
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="md:hidden flex items-center gap-2 px-4 py-3 rounded-xl border border-muted text-sm text-main hover:border-primary transition"
            >
              <SlidersHorizontal size={16} />
              Filters
              {selectedCategories.length > 0 && (
                <span className="bg-primary text-white text-xs rounded-full px-1.5">{selectedCategories.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <SlidingTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <div className="bg-surface">
          <div className="container max-w-6xl mx-auto pt-10 pb-16 px-4 sm:px-6">

            {/* NFTs tab */}
            {activeTab === 0 && (
              <div className="flex flex-col md:flex-row gap-8">
                <aside className={`w-full md:w-52 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
                  <div className="bg-background rounded-xl p-5 sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-main">Categories</h3>
                      {selectedCategories.length > 0 && (
                        <button onClick={clearCategories} className="text-xs text-primary hover:underline">Clear all</button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {CATEGORIES.map(cat => (
                        <label key={cat.value} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.value)}
                            onChange={() => toggleCategory(cat.value)}
                            className="accent-primary w-4 h-4 rounded"
                          />
                          <span className="text-sm text-main group-hover:text-primary transition-colors">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="flex-1 min-w-0">
                  {nftLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[...Array(ITEMS_PER_PAGE)].map((_, i) => <NFTCardSkeleton key={i} />)}
                    </div>
                  ) : nfts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <p className="text-muted text-lg">No NFTs found.</p>
                      {(selectedCategories.length > 0 || search) && (
                        <button onClick={() => { clearCategories(); setSearch(''); }} className="text-primary text-sm hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {nfts.map(nft => (
                          <NFTCard
                            key={nft._id}
                            image={getNFTImage(nft)}
                            title={getNFTTitle(nft)}
                            creatorImage={getNFTCreatorImg(nft)}
                            creatorName={getNFTCreatorName(nft)}
                            owner={nft.owner}
                            listing={null}
                            category={nft.category}
                            backgroundColor="bg-background"
                            onClick={() => navigate(`/nft/${nft.collection}/${nft.tokenId}`)}
                          />
                        ))}
                      </div>
                      <Pagination page={nftPage} totalPages={nftTotalPages} onChange={setNftPage} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Collections tab */}
            {activeTab === 1 && (
              colLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {[...Array(ITEMS_PER_PAGE)].map((_, i) => <CollectionCardSkeleton key={i} />)}
                </div>
              ) : collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <p className="text-muted text-lg">No collections found.</p>
                  {search && <button onClick={() => setSearch('')} className="text-primary text-sm hover:underline">Clear search</button>}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {collections.map(({ collection, nfts: colNFTs, creatorUser }) => {
                      const bannerImg   = colNFTs[0] ? resolveIpfsUrl(typeof colNFTs[0].metadata?.image === 'string' ? colNFTs[0].metadata.image : '') : '/nft-placeholder.png';
                      const thumbnails  = colNFTs.map(n => resolveIpfsUrl(typeof n.metadata?.image === 'string' ? n.metadata.image : ''));
                      const creatorName = creatorUser?.username || `${collection.creator.slice(0, 6)}...${collection.creator.slice(-4)}`;
                      const creatorImg  = creatorUser?.avatar ? resolveIpfsUrl(creatorUser.avatar) : undefined;
                      return (
                        <div key={collection._id} className="cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => navigate(`/collection/${collection.address}`)}>
                          <TrendingCollectionCard
                            bannerImg={bannerImg}
                            thumbnails={thumbnails}
                            count={collection.nftCount ?? 0}
                            title={collection.name}
                            creatorName={creatorName}
                            creatorImg={creatorImg}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Pagination page={collectionPage} totalPages={colTotalPages} onChange={setCollectionPage} />
                </>
              )
            )}
          </div>
        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default MarketPlacePage;