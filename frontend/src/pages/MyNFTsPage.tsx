import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Loader2, Image, Search, SlidersHorizontal } from 'lucide-react';
import NFTCard from '../components/NFTCard';
import Button from '../components/button/Button';
import { usersApi, type NFT } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNFTImage(nft: NFT) {
  return resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');
}

function getNFTTitle(nft: NFT) {
  return typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'owned' | 'created';

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All',     value: 'all'     },
  { label: 'Owned',   value: 'owned'   },
  { label: 'Created', value: 'created' },
];

const MyNFTsPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const [nfts,        setNfts]        = useState<NFT[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [filter,      setFilter]      = useState<FilterType>('all');
  const [search,      setSearch]      = useState('');

  const LIMIT = 20;

  const loadNFTs = useCallback(async (pageNum: number, activeFilter: FilterType, reset: boolean) => {
    if (!address) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const res = await usersApi.getNFTs(address, pageNum, LIMIT, activeFilter);
      setNfts(prev => reset ? res.data : [...prev, ...res.data]);
      setTotalPages(res.pagination.pages);
      setTotal(res.pagination.total);
      setPage(pageNum);
    } catch {
      setError('Failed to load NFTs. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [address]);

  // Reload when filter changes
  useEffect(() => {
    loadNFTs(1, filter, true);
  }, [loadNFTs, filter]);

  const handleFilterChange = (f: FilterType) => {
    if (f === filter) return;
    setFilter(f);
    setSearch('');
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadNFTs(page + 1, filter, false);
  };

  // Client-side search on already-loaded NFTs
  const filtered = search.trim()
    ? nfts.filter(nft => {
        const title = getNFTTitle(nft).toLowerCase();
        const collection = nft.collection.toLowerCase();
        const q = search.toLowerCase();
        return title.includes(q) || collection.includes(q);
      })
    : nfts;

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Image size={48} className="text-muted" />
        <p className="text-main font-semibold text-lg">Connect your wallet to view your NFTs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-main">My NFTs</h1>
          {!loading && (
            <p className="text-sm text-muted mt-0.5">
              {total} NFT{total !== 1 ? 's' : ''} across all collections
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filter tabs */}
        <div className="flex bg-surface border border-muted rounded-xl p-1 gap-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-surface border border-muted rounded-xl px-3 py-2 flex-1 sm:max-w-xs">
          <Search size={15} className="text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or collection..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-main placeholder-muted w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted hover:text-main text-xs">✕</button>
          )}
        </div>

        {search && (
          <div className="flex items-center gap-1 text-muted">
            <SlidersHorizontal size={15} />
            <span className="text-xs">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted">{error}</p>
          <Button variant="outline" size="md" onClick={() => loadNFTs(1, filter, true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Image size={40} className="text-muted" />
          <p className="text-muted text-sm">
            {search
              ? `No NFTs matching "${search}"`
              : filter === 'owned'
                ? "You don't own any NFTs yet."
                : filter === 'created'
                  ? "You haven't minted any NFTs yet."
                  : "You have no NFTs yet."
            }
          </p>
          {!search && (
            <Button variant="primary" size="sm" sxclass="px-5 mt-1"
              onClick={() => navigate('/dashboard/create')}>
              Mint your first NFT
            </Button>
          )}
        </div>
      )}

      {/* ── NFT Grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(nft => (
              <NFTCard
                key={nft._id}
                image={getNFTImage(nft)}
                title={getNFTTitle(nft)}
                creatorName={nft.minter}
                owner={nft.owner}
                listing={nft.activeListing ?? nft.listing ?? null}
                category={nft.category}
                backgroundColor="bg-surface"
                onClick={() => navigate(`/nft/${nft.collection}/${nft.tokenId}`)}
              />
            ))}
          </div>

          {/* Load more */}
          {page < totalPages && !search && (
            <div className="flex justify-center pt-4 pb-8">
              <Button
                variant="outline"
                size="md"
                onClick={handleLoadMore}
                disabled={loadingMore}
                sxclass="px-8 flex items-center gap-2"
              >
                {loadingMore
                  ? <><Loader2 size={16} className="animate-spin" /> Loading...</>
                  : `Load More (${total - nfts.length} remaining)`
                }
              </Button>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default MyNFTsPage;