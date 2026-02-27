import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import {
  ImageOff, ChevronLeft, ChevronRight,
  Wallet, LayoutGrid, Layers, X,
} from 'lucide-react';
import NFTCard from '../components/NFTCard';
import RegularPageWrapper from '../components/RegularPageWrapper';
import Button from '../components/button/Button';
import { usersApi, type NFT, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

const LIMIT = 24;

function getNFTImage(nft: NFT): string {
  return resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');
}
function getNFTTitle(nft: NFT): string {
  return typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;
}
function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-[20px] border border-muted animate-pulse">
      <div className="w-full h-[220px] bg-muted/20 rounded-t-[20px]" />
      <div className="px-4 py-4 space-y-3">
        <div className="h-4 bg-muted/20 rounded w-3/4" />
        <div className="h-3 bg-muted/20 rounded w-1/2" />
        <div className="h-3 bg-muted/20 rounded w-1/3 mt-4" />
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPrev, onNext }: {
  page: number; totalPages: number; onPrev: () => void; onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-10">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 1}
        sxclass="flex items-center gap-1.5 px-4">
        <ChevronLeft size={16} /> Prev
      </Button>
      <span className="text-sm text-muted">
        Page <span className="text-main font-semibold">{page}</span> of{' '}
        <span className="text-main font-semibold">{totalPages}</span>
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page === totalPages}
        sxclass="flex items-center gap-1.5 px-4">
        Next <ChevronRight size={16} />
      </Button>
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-surface text-muted border-muted hover:border-primary hover:text-primary'
      }`}
    >
      {label}
      {active && <X size={10} />}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const MyNFTsPage = () => {
  const { address, isConnected } = useAccount();
  const navigate                 = useNavigate();

  const [nfts,       setNfts]       = useState<NFT[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  // Active category filter (server-side)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // All categories the user has — fetched once so pills don't vanish when filtering
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [filtersReady,  setFiltersReady]  = useState(false);

  // The connected user's own profile — used as the creator on every card
  // because every NFT on this page was minted by them
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  // ── Fetch own profile once ────────────────────────────────────────────────

  useEffect(() => {
    if (!address) return;
    usersApi.getProfile(address).then(setMyProfile).catch(() => null);
  }, [address]);

  // ── Fetch all categories once for filter pills ────────────────────────────

  const fetchFilterOptions = useCallback(async () => {
    if (!address) return;
    try {
      const res  = await usersApi.getNFTs(address, 1, 200, 'owned');
      const cats = [...new Set(res.data.map(n => n.category).filter(Boolean))].sort();
      setAllCategories(cats);
    } catch {
      // non-critical
    } finally {
      setFiltersReady(true);
    }
  }, [address]);

  useEffect(() => {
    if (address) fetchFilterOptions();
  }, [address, fetchFilterOptions]);

  // ── Fetch NFTs (server-side, reruns on page / category change) ────────────

  const fetchNFTs = useCallback(async (
    targetPage: number,
    category:   string | null,
  ) => {
    if (!address) return;
    setLoading(true);
    setError('');
    try {
      const res = await usersApi.getNFTs(
        address, targetPage, LIMIT, 'owned',
        category ?? undefined,
      );
      setNfts(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.pages);
    } catch {
      setError('Failed to load your NFTs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) fetchNFTs(page, activeCategory);
  }, [address, page, activeCategory, fetchNFTs]);

  const handleCategoryFilter = (cat: string | null) => {
    setActiveCategory(cat);
    setPage(1);
  };

  // ── Creator info derived from own profile ─────────────────────────────────
  // Every NFT on this page was minted by the connected wallet. So the creator
  // shown on every card is always the user themselves — their username if set,
  // otherwise their shortened address. Never the collection deployer's address.
  const myName = myProfile?.username || (address ? shortAddr(address) : '');
  const myImg  = myProfile?.avatar   ? resolveIpfsUrl(myProfile.avatar) : undefined;

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <RegularPageWrapper>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-main">Connect your wallet</h2>
          <p className="text-muted text-sm text-center max-w-xs">
            Connect your wallet to see all the NFTs you own.
          </p>
        </div>
      </RegularPageWrapper>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-main">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LayoutGrid size={18} className="text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-main">My NFTs</h1>
              </div>
              <p className="text-muted text-sm ml-12">
                {loading
                  ? 'Loading…'
                  : total > 0
                    ? `${total} NFT${total !== 1 ? 's' : ''}${activeCategory ? ' matching filter' : ' in your wallet'}`
                    : activeCategory ? 'No NFTs match this filter' : 'No NFTs in your wallet yet'}
              </p>
            </div>
            {total > 0 && !loading && (
              <p className="text-xs text-muted ml-12 sm:ml-0">Page {page} of {totalPages}</p>
            )}
          </div>

          {/* Category filter pills */}
          {filtersReady && allCategories.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap mb-6">
              <Pill label="All" active={activeCategory === null} onClick={() => handleCategoryFilter(null)} />
              {allCategories.map(cat => (
                <Pill
                  key={cat}
                  label={formatCategory(cat)}
                  active={activeCategory === cat}
                  onClick={() => handleCategoryFilter(activeCategory === cat ? null : cat)}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-muted">{error}</p>
              <Button variant="outline" size="sm"
                onClick={() => fetchNFTs(page, activeCategory)}>
                Retry
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(LIMIT)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty — no NFTs at all */}
          {!loading && !error && nfts.length === 0 && !activeCategory && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center">
                <ImageOff size={28} className="text-muted" />
              </div>
              <h3 className="text-main font-semibold">No NFTs yet</h3>
              <p className="text-muted text-sm max-w-xs">
                Mint an NFT into one of your collections or a public collection to see it here.
              </p>
              <div className="flex gap-3 mt-2">
                <Button variant="primary" size="md" sxclass="flex items-center gap-2"
                  onClick={() => navigate('/dashboard/create')}>
                  Mint an NFT
                </Button>
                <Button variant="outline" size="md" sxclass="flex items-center gap-2"
                  onClick={() => navigate('/dashboard/collections/create')}>
                  <Layers size={15} /> New Collection
                </Button>
              </div>
            </div>
          )}

          {/* Empty — filter active but no results */}
          {!loading && !error && nfts.length === 0 && activeCategory && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ImageOff size={28} className="text-muted" />
              <p className="text-muted text-sm">No NFTs in this category.</p>
              <button onClick={() => handleCategoryFilter(null)}
                className="text-primary text-sm hover:underline">
                Clear filter
              </button>
            </div>
          )}

          {/* NFT grid */}
          {!loading && !error && nfts.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {nfts.map(nft => (
                  <NFTCard
                    key={nft._id}
                    image={getNFTImage(nft)}
                    title={getNFTTitle(nft)}
                    creatorImage={myImg}
                    creatorName={myName}
                    owner={nft.owner}
                    listing={nft.listing ?? null}
                    category={nft.category}
                    backgroundColor="bg-surface"
                    onClick={() => navigate(`/nft/${nft.collection}/${nft.tokenId}`)}
                  />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage(p => Math.max(1, p - 1))}
                onNext={() => setPage(p => Math.min(totalPages, p + 1))}
              />
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default MyNFTsPage;