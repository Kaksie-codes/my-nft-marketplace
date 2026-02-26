import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, User, Hash, Copy, Check, ExternalLink } from 'lucide-react';
import NFTCard from '../components/NFTCard';
import RegularPageWrapper from '../components/RegularPageWrapper';
import Button from '../components/button/Button';
import { collectionsApi, usersApi, type Collection, type NFT, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';
import { formatEther } from 'viem';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toEth(wei?: string): string {
  if (!wei || wei === '0') return '—';
  try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(4)} ETH`; }
  catch { return '—'; }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted hover:text-primary transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CollectionNFTsPage = () => {
  const { collectionAddress } = useParams<{ collectionAddress: string }>();
  const navigate = useNavigate();

  const [collection,     setCollection]     = useState<(Collection & { nftCount: number }) | null>(null);
  const [nfts,           setNfts]           = useState<NFT[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [page,           setPage]           = useState(1);
  const [totalPages,     setTotalPages]     = useState(1);
  const [loadingMore,    setLoadingMore]    = useState(false);

  const LIMIT = 12;

  // Initial load — collection info + first page of NFTs + creator profile
  const loadInitial = useCallback(async () => {
    if (!collectionAddress) return;
    setLoading(true);
    setError('');
    try {
      const [col, nftRes] = await Promise.all([
        collectionsApi.getOne(collectionAddress),
        collectionsApi.getNFTs(collectionAddress, 1, LIMIT),
      ]);
      setCollection(col);
      setNfts(nftRes.data);
      setTotalPages(nftRes.pagination.pages);
      setPage(1);

      // Fetch creator profile separately — non-blocking
      usersApi.getProfile(col.creator).then(setCreatorProfile).catch(() => null);
    } catch {
      setError('Collection not found or failed to load.');
    } finally {
      setLoading(false);
    }
  }, [collectionAddress]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const loadMore = async () => {
    if (!collectionAddress || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await collectionsApi.getNFTs(collectionAddress, nextPage, LIMIT);
      setNfts(prev => [...prev, ...res.data]);
      setPage(nextPage);
    } catch {
      // silent — user can try again
    } finally {
      setLoadingMore(false);
    }
  };

  const getNFTImage = (nft: NFT) =>
    resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

  const getNFTTitle = (nft: NFT) =>
    typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

  const creatorName = creatorProfile?.username || (collection ? shortAddr(collection.creator) : '');
  const creatorImg  = creatorProfile?.avatar ? resolveIpfsUrl(creatorProfile.avatar) : undefined;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <RegularPageWrapper>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </RegularPageWrapper>
    );
  }

  if (error || !collection) {
    return (
      <RegularPageWrapper>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <p className="text-muted text-lg">{error || 'Collection not found.'}</p>
          <Button variant="outline" size="md" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </RegularPageWrapper>
    );
  }

  // Use first NFT image as collection banner if available
  const bannerImage = nfts[0] ? getNFTImage(nfts[0]) : null;

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">

        {/* ── Banner ── */}
        <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
          {bannerImage && (
            <img src={bannerImage} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <div className="container max-w-6xl mx-auto px-4 sm:px-6">

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-primary transition-colors mt-6 mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* ── Collection header ── */}
          <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
            {/* Collection icon — first NFT image or gradient fallback */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-surface shadow-xl flex-shrink-0 -mt-16 relative z-10 bg-gradient-to-br from-primary to-secondary">
              {bannerImage && (
                <img src={bannerImage} alt={collection.name} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-extrabold text-main">{collection.name}</h1>
                <p className="text-muted text-sm font-mono">{collection.symbol}</p>
              </div>

              {/* Creator */}
              <button
                onClick={() => navigate(`/profile/${collection.creator}`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {creatorImg
                  ? <img src={creatorImg} alt="" className="w-6 h-6 rounded-full object-cover" />
                  : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"><User size={12} className="text-primary" /></div>
                }
                <span className="text-sm text-muted">by <span className="text-main font-semibold">{creatorName}</span></span>
              </button>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-main">{collection.nftCount ?? nfts.length}</span>
                  <span className="text-xs text-muted uppercase tracking-wider">Items</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-main">{toEth(collection.mintPrice)}</span>
                  <span className="text-xs text-muted uppercase tracking-wider">Mint Price</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-main">{collection.maxSupply}</span>
                  <span className="text-xs text-muted uppercase tracking-wider">Max Supply</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-main">{collection.maxPerWallet}</span>
                  <span className="text-xs text-muted uppercase tracking-wider">Per Wallet</span>
                </div>
              </div>

              {/* Contract address */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <Hash size={12} />
                <span className="font-mono">{shortAddr(collection.address)}</span>
                <CopyButton text={collection.address} />
                <a
                  href={`https://sepolia.etherscan.io/address/${collection.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* ── NFT Grid ── */}
          {nfts.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <p className="text-lg">No NFTs in this collection yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
                {nfts.map(nft => (
                  <NFTCard
                    key={nft._id}
                    image={getNFTImage(nft)}
                    title={getNFTTitle(nft)}
                    creatorImage={creatorImg}
                    creatorName={creatorName}
                    owner={nft.owner}
                    listing={nft.listing ?? null}
                    category={nft.category}
                    backgroundColor="bg-surface"
                    onClick={() => navigate(`/nft/${collectionAddress}/${nft.tokenId}`)}
                  />
                ))}
              </div>

              {/* Load more */}
              {page < totalPages && (
                <div className="flex justify-center pb-16">
                  <Button variant="outline" size="md" onClick={loadMore} disabled={loadingMore}
                    sxclass="px-8 flex items-center gap-2">
                    {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default CollectionNFTsPage;