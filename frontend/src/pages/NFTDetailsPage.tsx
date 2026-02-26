import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  ArrowLeft, Globe, Tag, Gavel, Clock, ExternalLink,
  Copy, Check, User, Layers, Calendar, Hash, Loader2, ArrowRight,
  X, CheckCircle, AlertCircle,
} from 'lucide-react';
import RegularPageWrapper from '../components/RegularPageWrapper';
import Button from '../components/button/Button';
import NFTCard from '../components/NFTCard';
import FlipCountdown from '../components/FlipCountdown';
import { nftsApi, collectionsApi, usersApi, type NFT, type Collection, type UserProfile, type Listing } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';
import { MARKETPLACE_ABI } from '../lib/abi/Marketplace';
import { CONTRACT_ADDRESSES } from '../lib/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toEth(wei?: string): string {
  if (!wei || wei === '0') return '—';
  try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(4)} ETH`; }
  catch { return '—'; }
}

function formatCategory(cat?: string): string {
  if (!cat) return '';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Tilt image ────────────────────────────────────────────────────────────────

function TiltImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
  };

  const handleMouseLeave = () => {
    const el = imgRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.4s ease';
    el.style.transform  = 'rotateY(0deg) rotateX(0deg) scale(1)';
    setTimeout(() => { if (el) el.style.transition = ''; }, 400);
  };

  return (
    <div
      className="w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-6 min-h-[320px]"
      style={{ perspective: '800px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={imgRef} style={{ transition: 'transform 0.1s ease', willChange: 'transform' }}>
        <img
          src={src}
          alt={alt}
          className="max-h-[400px] max-w-full rounded-xl shadow-2xl object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-muted hover:text-primary transition-colors flex-shrink-0">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// ── Transaction Modal ─────────────────────────────────────────────────────────

type ModalStep = 'confirm' | 'pending' | 'success' | 'error';

interface TxModalProps {
  mode: 'buy' | 'bid' | 'cancel';
  listing: { listingId: string; price: string; highestBid?: string };
  nftName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function TxModal({ mode, listing, nftName, onClose, onSuccess }: TxModalProps) {
  const [step,     setStep]     = useState<ModalStep>('confirm');
  const [txHash,   setTxHash]   = useState<`0x${string}` | undefined>();
  const [txError,  setTxError]  = useState('');
  const [bidInput, setBidInput] = useState('');
  const [bidError, setBidError] = useState('');

  const { writeContract } = useWriteContract();

  const { isSuccess: txConfirmed, isError: txFailed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed) setStep('success');
  }, [txConfirmed]);

  useEffect(() => {
    if (txFailed) {
      setTxError('Transaction failed on-chain.');
      setStep('error');
    }
  }, [txFailed]);

  const handleBuy = () => {
    setStep('pending');
    writeContract({
      address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
      abi:          MARKETPLACE_ABI,
      functionName: 'buy',
      args:         [BigInt(listing.listingId)],
      value:        BigInt(listing.price),
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: (err) => {
        setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
        setStep('error');
      },
    });
  };

  const handleCancel = () => {
    setStep('pending');
    writeContract({
      address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
      abi:          MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args:         [BigInt(listing.listingId)],
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: (err) => {
        setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
        setStep('error');
      },
    });
  };

  const handleBid = () => {
    setBidError('');
    const minBid = listing.highestBid && listing.highestBid !== '0'
      ? parseFloat(formatEther(BigInt(listing.highestBid)))
      : parseFloat(formatEther(BigInt(listing.price)));

    if (!bidInput || isNaN(parseFloat(bidInput)) || parseFloat(bidInput) <= 0) {
      setBidError('Enter a valid bid amount.');
      return;
    }
    if (parseFloat(bidInput) <= minBid) {
      setBidError(`Bid must be greater than ${minBid.toFixed(4)} ETH.`);
      return;
    }

    setStep('pending');
    writeContract({
      address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
      abi:          MARKETPLACE_ABI,
      functionName: 'placeBid',
      args:         [BigInt(listing.listingId)],
      value:        parseEther(bidInput),
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: (err) => {
        setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
        setStep('error');
      },
    });
  };

  const minBidEth = listing.highestBid && listing.highestBid !== '0'
    ? toEth(listing.highestBid)
    : toEth(listing.price);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'pending') onClose(); }}
    >
      <div className="bg-surface border border-muted rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-main">
            {mode === 'buy' ? 'Confirm Purchase' : mode === 'bid' ? 'Place a Bid' : 'Cancel Listing'}
          </h2>
          {step !== 'pending' && (
            <button onClick={onClose} className="text-muted hover:text-main transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── Confirm ── */}
        {step === 'confirm' && (
          <>
            <div className="bg-background rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider">NFT</p>
              <p className="text-main font-semibold">{nftName}</p>
            </div>

            {mode === 'buy' && (
              <>
                <div className="bg-background rounded-xl p-4 space-y-1">
                  <p className="text-xs text-muted uppercase tracking-wider">Total Price</p>
                  <p className="text-2xl font-extrabold text-main">{toEth(listing.price)}</p>
                  <p className="text-xs text-muted">This amount will be deducted from your wallet.</p>
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={handleBuy}
                  sxclass="flex items-center justify-center gap-2">
                  <Tag size={16} /> Confirm Purchase
                </Button>
              </>
            )}

            {mode === 'bid' && (
              <>
                <div className="bg-background rounded-xl p-4 space-y-1">
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">
                    Your Bid (ETH) — min. {minBidEth}
                  </p>
                  <div className="relative">
                    <input
                      type="number" min="0" step="0.001" value={bidInput}
                      onChange={e => { setBidInput(e.target.value); setBidError(''); }}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 pr-14 bg-surface border rounded-xl text-main text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition ${
                        bidError ? 'border-red-500' : 'border-muted'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-semibold">ETH</span>
                  </div>
                  {bidError && <p className="text-red-500 text-xs mt-1">{bidError}</p>}
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={handleBid}
                  disabled={!bidInput} sxclass="flex items-center justify-center gap-2">
                  <Gavel size={16} /> Place Bid
                </Button>
              </>
            )}

            {mode === 'cancel' && (
              <>
                <div className="bg-background rounded-xl p-4 space-y-1">
                  <p className="text-sm text-muted">
                    This will cancel your listing and return the NFT to your wallet.
                    {listing.highestBid && listing.highestBid !== '0' && (
                      <span className="block mt-2 text-yellow-500 font-medium">
                        ⚠️ There is an active bid of {toEth(listing.highestBid)}. Cancelling will refund the bidder.
                      </span>
                    )}
                  </p>
                </div>
                <Button variant="outline" size="lg" fullWidth onClick={handleCancel}
                  sxclass="flex items-center justify-center gap-2 border-red-500 text-red-500 hover:bg-red-500/10">
                  <X size={16} /> Confirm Cancel
                </Button>
              </>
            )}

            <Button variant="outline" size="md" fullWidth onClick={onClose}>
              {mode === 'cancel' ? 'Keep Listing' : 'Cancel'}
            </Button>
          </>
        )}

        {/* ── Pending ── */}
        {step === 'pending' && (
          <div className="text-center space-y-4 py-4">
            <Loader2 size={48} className="animate-spin text-primary mx-auto" />
            <p className="text-main font-semibold">
              {mode === 'buy' ? 'Processing Purchase...' : mode === 'bid' ? 'Placing Bid...' : 'Cancelling Listing...'}
            </p>
            <p className="text-muted text-sm">
              Confirm the transaction in your wallet and wait for it to be mined.
            </p>
            {txHash && (
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                View on Etherscan <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <p className="text-main font-semibold">
              {mode === 'buy' ? '🎉 Purchase Successful!' : mode === 'bid' ? '🎉 Bid Placed!' : '✅ Listing Cancelled'}
            </p>
            <p className="text-muted text-sm">
              {mode === 'buy'
                ? `You are now the owner of ${nftName}.`
                : mode === 'bid'
                ? `Your bid has been placed on ${nftName}.`
                : `Your listing has been cancelled and the NFT will be returned to your wallet.`}
            </p>
            {txHash && (
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                View on Etherscan <ExternalLink size={13} />
              </a>
            )}
            <Button variant="primary" size="md" fullWidth onClick={onSuccess}>Done</Button>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className="text-center space-y-4 py-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <p className="text-main font-semibold">Something went wrong</p>
            <p className="text-red-500 text-sm break-words">{txError}</p>
            <div className="flex gap-3">
              <Button variant="outline" size="md" fullWidth onClick={() => setStep('confirm')}>Try Again</Button>
              <Button variant="outline" size="md" fullWidth onClick={onClose}>Close</Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const NFTDetailPage = () => {
  const { collection: collectionAddress, tokenId } = useParams<{ collection: string; tokenId: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const [nft,            setNft]            = useState<NFT | null>(null);
  const [collection,     setCollection]     = useState<Collection | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [ownerProfile,   setOwnerProfile]   = useState<UserProfile | null>(null);
  const [moreNFTs,       setMoreNFTs]       = useState<NFT[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [modalMode,      setModalMode]      = useState<'buy' | 'bid' | 'cancel' | null>(null);

  const listing = (nft as (NFT & { activeListing: Listing | null }) | null)?.activeListing ?? null;

  // ── Who actually owns / is selling this NFT? ─────────────────────────────
  // When an NFT is listed, the marketplace contract holds it in escrow.
  // nft.owner becomes the marketplace address. The true "owner" from the
  // user's perspective is listing.seller (the address that listed it).
  const marketplaceAddr  = CONTRACT_ADDRESSES.marketplace.toLowerCase();
  const isEscrowed       = nft?.owner?.toLowerCase() === marketplaceAddr;
  // The real owner: seller if escrowed, otherwise nft.owner
  const effectiveOwner   = isEscrowed && listing?.seller
    ? listing.seller.toLowerCase()
    : nft?.owner?.toLowerCase() ?? '';

  // isOwner: true if connected wallet is the seller (escrowed) or direct owner
  const isOwner = !!(
    isConnected &&
    address &&
    effectiveOwner &&
    address.toLowerCase() === effectiveOwner
  );

  // isSeller: true only when the NFT is actively listed by connected wallet
  const isSeller = !!(
    isConnected &&
    address &&
    listing?.seller &&
    address.toLowerCase() === listing.seller.toLowerCase()
  );

  const fetchAll = useCallback(async () => {
    if (!collectionAddress || !tokenId) return;
    setLoading(true);
    setError('');
    try {
      const nftData = await nftsApi.getOne(collectionAddress, tokenId);
      setNft(nftData);

      // Determine the real owner for profile fetching
      const nftListing = (nftData as NFT & { activeListing: Listing | null }).activeListing;
      const realOwnerAddr = nftData.owner.toLowerCase() === CONTRACT_ADDRESSES.marketplace.toLowerCase()
        ? nftListing?.seller ?? nftData.owner
        : nftData.owner;

      const [col, creator, owner] = await Promise.all([
        collectionsApi.getOne(collectionAddress).catch(() => null),
        usersApi.getProfile(nftData.minter).catch(() => null),
        realOwnerAddr !== nftData.minter
          ? usersApi.getProfile(realOwnerAddr).catch(() => null)
          : Promise.resolve(null),
      ]);
      setCollection(col);
      setCreatorProfile(creator);
      setOwnerProfile(owner);

      const more = await collectionsApi.getNFTs(collectionAddress, 1, 6).catch(() => ({ data: [] as NFT[] }));
      setMoreNFTs(more.data.filter(n => n.tokenId !== nftData.tokenId).slice(0, 3));
    } catch (err) {
      console.error('Failed to load NFT:', err);
      setError('NFT not found or failed to load.');
    } finally {
      setLoading(false);
    }
  }, [collectionAddress, tokenId]);

  const silentRefetch = useCallback(async () => {
    if (!collectionAddress || !tokenId) return;
    try {
      const nftData = await nftsApi.getOne(collectionAddress, tokenId);
      setNft(nftData);
    } catch {
      // Non-critical
    }
  }, [collectionAddress, tokenId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handleFocus = () => fetchAll();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAll]);

  // ── Derived values ────────────────────────────────────────────────────────

  const nftImage   = resolveIpfsUrl(typeof nft?.metadata?.image === 'string' ? nft.metadata.image : '');
  const nftName    = typeof nft?.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft?.tokenId}`;
  const nftDesc    = typeof nft?.metadata?.description === 'string' ? nft.metadata.description : '';
  const nftAttribs = Array.isArray(nft?.metadata?.attributes)
    ? nft!.metadata!.attributes as { trait_type: string; value: string }[]
    : [];

  const creatorName = creatorProfile?.username || (nft ? shortAddr(nft.minter) : '');
  const creatorImg  = creatorProfile?.avatar ? resolveIpfsUrl(creatorProfile.avatar) : undefined;

  // Owner display: use seller profile if escrowed, else ownerProfile
  const displayOwnerAddr = effectiveOwner;
  const ownerName = address?.toLowerCase() === effectiveOwner
    ? 'You'
    : (ownerProfile?.username || (effectiveOwner ? shortAddr(effectiveOwner) : ''));
  const ownerImg  = ownerProfile?.avatar ? resolveIpfsUrl(ownerProfile.avatar) : undefined;

  const isAuction  = listing?.type === 'auction';
  const auctionEnd = listing?.endTime ? new Date(listing.endTime) : null;

  if (loading) {
    return (
      <RegularPageWrapper>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </RegularPageWrapper>
    );
  }

  if (error || !nft) {
    return (
      <RegularPageWrapper>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <p className="text-muted text-lg">{error || 'NFT not found.'}</p>
          <Button variant="outline" size="md" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </RegularPageWrapper>
    );
  }

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-8 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* ── Left: Image ── */}
            <div className="space-y-4">
              <TiltImage src={nftImage} alt={nftName} />

              {collection && (
                <button onClick={() => navigate(`/collection/${collectionAddress}`)}
                  className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors">
                  <Layers size={14} />
                  <span>{collection.name}</span>
                  <ArrowRight size={12} />
                </button>
              )}

              {nftAttribs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Attributes</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {nftAttribs.map((attr, i) => (
                      <div key={i} className="bg-surface rounded-xl p-3 border border-muted text-center">
                        <p className="text-xs text-primary font-semibold uppercase truncate">{attr.trait_type}</p>
                        <p className="text-sm text-main font-medium mt-0.5 truncate">{attr.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Info ── */}
            <div className="space-y-6">

              <div className="flex items-center gap-2 flex-wrap">
                {nft.category && (
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {formatCategory(nft.category)}
                  </span>
                )}
                <span className="text-xs text-muted flex items-center gap-1">
                  <Hash size={11} /> Token #{nft.tokenId}
                </span>
              </div>

              <h1 className="text-4xl font-extrabold text-main leading-tight">{nftName}</h1>

              {/* Creator + Owner */}
              <div className="flex gap-6 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase tracking-wider">Creator</span>
                  <button onClick={() => navigate(`/profile/${nft.minter}`)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {creatorImg
                      ? <img src={creatorImg} alt="" className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><User size={14} className="text-primary" /></div>
                    }
                    <span className="text-sm font-semibold text-main">{creatorName}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {/* Label changes to "Seller" when listed, "Owner" otherwise */}
                  <span className="text-xs text-muted uppercase tracking-wider">
                    {isEscrowed ? 'Seller' : 'Owner'}
                  </span>
                  <button onClick={() => navigate(`/profile/${displayOwnerAddr}`)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {ownerImg
                      ? <img src={ownerImg} alt="" className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><User size={14} className="text-primary" /></div>
                    }
                    <span className="text-sm font-semibold text-main">{ownerName}</span>
                  </button>
                </div>
              </div>

              {nftDesc && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-main text-sm leading-relaxed">{nftDesc}</p>
                </div>
              )}

              {/* ── Listing / Action card ── */}
              <div className="bg-surface border border-muted rounded-2xl p-5 space-y-4">
                {listing ? (
                  <>
                    {isAuction && auctionEnd && (
                      <div>
                        <div className="flex items-center gap-2 text-muted text-xs mb-3">
                          <Clock size={13} /> Auction ends in
                        </div>
                        <FlipCountdown endTime={auctionEnd} />
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-1">
                        {isAuction ? 'Highest Bid' : 'Price'}
                      </p>
                      <p className="text-3xl font-extrabold text-main">
                        {isAuction
                          ? toEth(listing.highestBid || listing.price)
                          : toEth(listing.price)
                        }
                      </p>
                      {isAuction && listing.highestBid && listing.highestBid !== '0' && (
                        <p className="text-xs text-muted mt-1">Starting bid: {toEth(listing.price)}</p>
                      )}
                    </div>

                    {/* isSeller → Cancel Listing */}
                    {isSeller ? (
                      <Button
                        variant="outline"
                        size="lg"
                        sxclass="w-full flex items-center justify-center gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => setModalMode('cancel')}
                      >
                        <X size={16} /> Cancel Listing
                      </Button>
                    ) : !isConnected ? (
                      <Button variant="primary" size="lg" sxclass="w-full">
                        Connect Wallet to {isAuction ? 'Bid' : 'Buy'}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        sxclass="w-full flex items-center justify-center gap-2"
                        onClick={() => setModalMode(isAuction ? 'bid' : 'buy')}
                      >
                        {isAuction
                          ? <><Gavel size={16} /> Place Bid</>
                          : <><Tag size={16} /> Buy Now</>
                        }
                      </Button>
                    )}
                  </>
                ) : isOwner ? (
                  <>
                    <p className="text-sm text-muted">You own this NFT. List it for sale on the marketplace.</p>
                    <Button
                      variant="primary" size="lg"
                      sxclass="w-full flex items-center justify-center gap-2"
                      onClick={() => navigate(`/dashboard/list/${collectionAddress}/${tokenId}`)}
                    >
                      <Tag size={16} /> List for Sale
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted text-sm py-2">
                    <Tag size={14} />
                    <span>Not listed for sale</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Details</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Contract Address</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-main">{shortAddr(collectionAddress!)}</span>
                      <CopyButton text={collectionAddress!} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Token ID</span>
                    <span className="font-mono text-main">#{nft.tokenId}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Token Standard</span>
                    <span className="text-main">ERC-721</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Blockchain</span>
                    <span className="text-main">Sepolia</span>
                  </div>
                  {nft.mintedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted flex items-center gap-1"><Calendar size={13} /> Minted</span>
                      <span className="text-main">
                        {new Date(nft.mintedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-2">
                    <a href={`https://sepolia.etherscan.io/token/${collectionAddress}?a=${nft.tokenId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
                      <ExternalLink size={13} /> Etherscan
                    </a>
                    {typeof nft.metadata?.image === 'string' && (
                      <a href={resolveIpfsUrl(nft.metadata.image)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
                        <Globe size={13} /> View Original
                      </a>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* More from this collection */}
          {moreNFTs.length > 0 && (
            <div className="mt-20 mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-main">More from this collection</h2>
                <Button variant="outline" size="md" sxclass="px-5 flex items-center gap-2"
                  onClick={() => navigate(`/collection/${collectionAddress}`)}>
                  View Collection <ArrowRight size={16} />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {moreNFTs.map(n => {
                  const img   = resolveIpfsUrl(typeof n.metadata?.image === 'string' ? n.metadata.image : '');
                  const title = typeof n.metadata?.name === 'string' ? n.metadata.name : `Token #${n.tokenId}`;
                  return (
                    <NFTCard key={n._id} image={img} title={title}
                      creatorImage={creatorImg} creatorName={creatorName}
                      owner={n.owner} listing={n.listing ?? null} category={n.category}
                      backgroundColor="bg-surface"
                      onClick={() => navigate(`/nft/${collectionAddress}/${n.tokenId}`)}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {modalMode && listing && (
        <TxModal
          mode={modalMode}
          listing={listing}
          nftName={nftName}
          onClose={() => setModalMode(null)}
          onSuccess={() => {
            setModalMode(null);
            setTimeout(() => silentRefetch(), 3000);
          }}
        />
      )}

    </RegularPageWrapper>
  );
};

export default NFTDetailPage;





// import { useEffect, useState, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
// import { formatEther, parseEther } from 'viem';
// import {
//   ArrowLeft, Globe, Tag, Gavel, Clock, ExternalLink,
//   Copy, Check, User, Layers, Calendar, Hash, Loader2, ArrowRight,
//   X, CheckCircle, AlertCircle,
// } from 'lucide-react';
// import RegularPageWrapper from '../components/RegularPageWrapper';
// import Button from '../components/button/Button';
// import NFTCard from '../components/NFTCard';
// import FlipCountdown from '../components/FlipCountdown';
// import { nftsApi, collectionsApi, usersApi, type NFT, type Collection, type UserProfile, type Listing } from '../utils/apiClient';
// import { resolveIpfsUrl } from '../utils/ipfs';
// import { MARKETPLACE_ABI } from '../lib/abi/Marketplace';
// import { CONTRACT_ADDRESSES } from '../lib/config';

// // ── Helpers ───────────────────────────────────────────────────────────────────

// function shortAddr(addr: string) {
//   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
// }

// function toEth(wei?: string): string {
//   if (!wei || wei === '0') return '—';
//   try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(4)} ETH`; }
//   catch { return '—'; }
// }

// function formatCategory(cat?: string): string {
//   if (!cat) return '';
//   return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
// }

// // ── Tilt image ────────────────────────────────────────────────────────────────

// function TiltImage({ src, alt }: { src: string; alt: string }) {
//   const imgRef = useRef<HTMLDivElement>(null);

//   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
//     const el = imgRef.current;
//     if (!el) return;
//     const rect = el.getBoundingClientRect();
//     const x = (e.clientX - rect.left) / rect.width  - 0.5;
//     const y = (e.clientY - rect.top)  / rect.height - 0.5;
//     el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
//   };

//   const handleMouseLeave = () => {
//     const el = imgRef.current;
//     if (!el) return;
//     el.style.transition = 'transform 0.4s ease';
//     el.style.transform  = 'rotateY(0deg) rotateX(0deg) scale(1)';
//     setTimeout(() => { if (el) el.style.transition = ''; }, 400);
//   };

//   return (
//     <div
//       className="w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-6 min-h-[320px]"
//       style={{ perspective: '800px' }}
//       onMouseMove={handleMouseMove}
//       onMouseLeave={handleMouseLeave}
//     >
//       <div ref={imgRef} style={{ transition: 'transform 0.1s ease', willChange: 'transform' }}>
//         <img
//           src={src}
//           alt={alt}
//           className="max-h-[400px] max-w-full rounded-xl shadow-2xl object-contain"
//           onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
//           draggable={false}
//         />
//       </div>
//     </div>
//   );
// }

// // ── Copy button ───────────────────────────────────────────────────────────────

// function CopyButton({ text }: { text: string }) {
//   const [copied, setCopied] = useState(false);
//   const copy = () => {
//     navigator.clipboard.writeText(text);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };
//   return (
//     <button onClick={copy} className="text-muted hover:text-primary transition-colors flex-shrink-0">
//       {copied ? <Check size={14} /> : <Copy size={14} />}
//     </button>
//   );
// }

// // ── Transaction Modal ─────────────────────────────────────────────────────────

// type ModalStep = 'confirm' | 'pending' | 'success' | 'error';

// interface TxModalProps {
//   mode: 'buy' | 'bid';
//   listing: { listingId: string; price: string; highestBid?: string };
//   nftName: string;
//   onClose: () => void;
//   onSuccess: () => void; // called when user clicks Done after success
// }

// function TxModal({ mode, listing, nftName, onClose, onSuccess }: TxModalProps) {
//   const [step,     setStep]     = useState<ModalStep>('confirm');
//   const [txHash,   setTxHash]   = useState<`0x${string}` | undefined>();
//   const [txError,  setTxError]  = useState('');
//   const [bidInput, setBidInput] = useState('');
//   const [bidError, setBidError] = useState('');

//   const { writeContract } = useWriteContract();

//   const { isSuccess: txConfirmed, isError: txFailed } =
//     useWaitForTransactionReceipt({ hash: txHash });

//   // Move to success step when tx is mined — do NOT close modal here.
//   // Closing is handled by the Done button so the user sees the success state.
//   useEffect(() => {
//     if (txConfirmed) setStep('success');
//   }, [txConfirmed]);

//   useEffect(() => {
//     if (txFailed) {
//       setTxError('Transaction failed on-chain.');
//       setStep('error');
//     }
//   }, [txFailed]);

//   const handleBuy = () => {
//     setStep('pending');
//     writeContract({
//       address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
//       abi:          MARKETPLACE_ABI,
//       functionName: 'buy',
//       args:         [BigInt(listing.listingId)],
//       value:        BigInt(listing.price),
//     }, {
//       onSuccess: (hash) => setTxHash(hash),
//       onError: (err) => {
//         setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
//         setStep('error');
//       },
//     });
//   };

//   const handleBid = () => {
//     setBidError('');
//     const minBid = listing.highestBid && listing.highestBid !== '0'
//       ? parseFloat(formatEther(BigInt(listing.highestBid)))
//       : parseFloat(formatEther(BigInt(listing.price)));

//     if (!bidInput || isNaN(parseFloat(bidInput)) || parseFloat(bidInput) <= 0) {
//       setBidError('Enter a valid bid amount.');
//       return;
//     }
//     if (parseFloat(bidInput) <= minBid) {
//       setBidError(`Bid must be greater than ${minBid.toFixed(4)} ETH.`);
//       return;
//     }

//     setStep('pending');
//     writeContract({
//       address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
//       abi:          MARKETPLACE_ABI,
//       functionName: 'placeBid',
//       args:         [BigInt(listing.listingId)],
//       value:        parseEther(bidInput),
//     }, {
//       onSuccess: (hash) => setTxHash(hash),
//       onError: (err) => {
//         setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
//         setStep('error');
//       },
//     });
//   };

//   const minBidEth = listing.highestBid && listing.highestBid !== '0'
//     ? toEth(listing.highestBid)
//     : toEth(listing.price);

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
//       onClick={(e) => { if (e.target === e.currentTarget && step !== 'pending') onClose(); }}
//     >
//       <div className="bg-surface border border-muted rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">

//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <h2 className="text-lg font-bold text-main">
//             {mode === 'buy' ? 'Confirm Purchase' : 'Place a Bid'}
//           </h2>
//           {step !== 'pending' && (
//             <button onClick={onClose} className="text-muted hover:text-main transition-colors">
//               <X size={20} />
//             </button>
//           )}
//         </div>

//         {/* ── Confirm ── */}
//         {step === 'confirm' && (
//           <>
//             <div className="bg-background rounded-xl p-4 space-y-2">
//               <p className="text-xs text-muted uppercase tracking-wider">NFT</p>
//               <p className="text-main font-semibold">{nftName}</p>
//             </div>

//             {mode === 'buy' ? (
//               <>
//                 <div className="bg-background rounded-xl p-4 space-y-1">
//                   <p className="text-xs text-muted uppercase tracking-wider">Total Price</p>
//                   <p className="text-2xl font-extrabold text-main">{toEth(listing.price)}</p>
//                   <p className="text-xs text-muted">This amount will be deducted from your wallet.</p>
//                 </div>
//                 <Button variant="primary" size="lg" fullWidth onClick={handleBuy}
//                   sxclass="flex items-center justify-center gap-2">
//                   <Tag size={16} /> Confirm Purchase
//                 </Button>
//               </>
//             ) : (
//               <>
//                 <div className="bg-background rounded-xl p-4 space-y-1">
//                   <p className="text-xs text-muted uppercase tracking-wider mb-2">
//                     Your Bid (ETH) — min. {minBidEth}
//                   </p>
//                   <div className="relative">
//                     <input
//                       type="number"
//                       min="0"
//                       step="0.001"
//                       value={bidInput}
//                       onChange={e => { setBidInput(e.target.value); setBidError(''); }}
//                       placeholder="0.00"
//                       className={`w-full px-4 py-3 pr-14 bg-surface border rounded-xl text-main text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition ${
//                         bidError ? 'border-red-500' : 'border-muted'
//                       }`}
//                     />
//                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-semibold">ETH</span>
//                   </div>
//                   {bidError && <p className="text-red-500 text-xs mt-1">{bidError}</p>}
//                 </div>
//                 <Button variant="primary" size="lg" fullWidth onClick={handleBid}
//                   disabled={!bidInput}
//                   sxclass="flex items-center justify-center gap-2">
//                   <Gavel size={16} /> Place Bid
//                 </Button>
//               </>
//             )}

//             <Button variant="outline" size="md" fullWidth onClick={onClose}>
//               Cancel
//             </Button>
//           </>
//         )}

//         {/* ── Pending ── */}
//         {step === 'pending' && (
//           <div className="text-center space-y-4 py-4">
//             <Loader2 size={48} className="animate-spin text-primary mx-auto" />
//             <p className="text-main font-semibold">
//               {mode === 'buy' ? 'Processing Purchase...' : 'Placing Bid...'}
//             </p>
//             <p className="text-muted text-sm">
//               Confirm the transaction in your wallet and wait for it to be mined.
//             </p>
//             {txHash && (
//               <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
//                 className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
//                 View on Etherscan <ExternalLink size={13} />
//               </a>
//             )}
//           </div>
//         )}

//         {/* ── Success ── */}
//         {step === 'success' && (
//           <div className="text-center space-y-4 py-4">
//             <CheckCircle size={48} className="text-green-500 mx-auto" />
//             <p className="text-main font-semibold">
//               {mode === 'buy' ? '🎉 Purchase Successful!' : '🎉 Bid Placed!'}
//             </p>
//             <p className="text-muted text-sm">
//               {mode === 'buy'
//                 ? `You are now the owner of ${nftName}.`
//                 : `Your bid has been placed on ${nftName}.`}
//             </p>
//             {txHash && (
//               <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
//                 className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
//                 View on Etherscan <ExternalLink size={13} />
//               </a>
//             )}
//             {/* Done closes modal AND triggers silent refetch in parent */}
//             <Button variant="primary" size="md" fullWidth onClick={onSuccess}>
//               Done
//             </Button>
//           </div>
//         )}

//         {/* ── Error ── */}
//         {step === 'error' && (
//           <div className="text-center space-y-4 py-4">
//             <AlertCircle size={48} className="text-red-500 mx-auto" />
//             <p className="text-main font-semibold">Something went wrong</p>
//             <p className="text-red-500 text-sm break-words">{txError}</p>
//             <div className="flex gap-3">
//               <Button variant="outline" size="md" fullWidth onClick={() => setStep('confirm')}>
//                 Try Again
//               </Button>
//               <Button variant="outline" size="md" fullWidth onClick={onClose}>
//                 Close
//               </Button>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// // ── Main Page ─────────────────────────────────────────────────────────────────

// const NFTDetailPage = () => {
//   const { collection: collectionAddress, tokenId } = useParams<{ collection: string; tokenId: string }>();
//   const navigate = useNavigate();
//   const { address, isConnected } = useAccount();

//   const [nft,            setNft]            = useState<NFT | null>(null);
//   const [collection,     setCollection]     = useState<Collection | null>(null);
//   const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
//   const [ownerProfile,   setOwnerProfile]   = useState<UserProfile | null>(null);
//   const [moreNFTs,       setMoreNFTs]       = useState<NFT[]>([]);
//   const [loading,        setLoading]        = useState(true);
//   const [error,          setError]          = useState('');
//   const [modalMode,      setModalMode]      = useState<'buy' | 'bid' | null>(null);

//   const isOwner = !!(isConnected && address && nft?.owner &&
//     address.toLowerCase() === nft.owner.toLowerCase());

//   // Full fetch — shows loading spinner, used on mount
//   const fetchAll = useCallback(async () => {
//     if (!collectionAddress || !tokenId) return;
//     setLoading(true);
//     setError('');
//     try {
//       const nftData = await nftsApi.getOne(collectionAddress, tokenId);
//       setNft(nftData);

//       const [col, creator, owner] = await Promise.all([
//         collectionsApi.getOne(collectionAddress).catch(() => null),
//         usersApi.getProfile(nftData.minter).catch(() => null),
//         nftData.owner !== nftData.minter
//           ? usersApi.getProfile(nftData.owner).catch(() => null)
//           : Promise.resolve(null),
//       ]);
//       setCollection(col);
//       setCreatorProfile(creator);
//       setOwnerProfile(owner);

//       const more = await collectionsApi.getNFTs(collectionAddress, 1, 6).catch(() => ({ data: [] as NFT[] }));
//       setMoreNFTs(more.data.filter(n => n.tokenId !== nftData.tokenId).slice(0, 3));
//     } catch (err) {
//       console.error('Failed to load NFT:', err);
//       setError('NFT not found or failed to load.');
//     } finally {
//       setLoading(false);
//     }
//   }, [collectionAddress, tokenId]);

//   // Silent fetch — no loading spinner, used after buy/bid so UI updates smoothly
//   const silentRefetch = useCallback(async () => {
//     if (!collectionAddress || !tokenId) return;
//     try {
//       const nftData = await nftsApi.getOne(collectionAddress, tokenId);
//       setNft(nftData);
//     } catch {
//       // Non-critical — user can refresh manually if needed
//     }
//   }, [collectionAddress, tokenId]);

//   useEffect(() => { fetchAll(); }, [fetchAll]);

//   // Refetch when user comes back to this tab (e.g. after listing)
//   useEffect(() => {
//     const handleFocus = () => fetchAll();
//     window.addEventListener('focus', handleFocus);
//     return () => window.removeEventListener('focus', handleFocus);
//   }, [fetchAll]);

//   // ── Derived values ────────────────────────────────────────────────────────

//   const nftImage   = resolveIpfsUrl(typeof nft?.metadata?.image === 'string' ? nft.metadata.image : '');
//   const nftName    = typeof nft?.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft?.tokenId}`;
//   const nftDesc    = typeof nft?.metadata?.description === 'string' ? nft.metadata.description : '';
//   const nftAttribs = Array.isArray(nft?.metadata?.attributes)
//     ? nft!.metadata!.attributes as { trait_type: string; value: string }[]
//     : [];

//   const creatorName = creatorProfile?.username || (nft ? shortAddr(nft.minter) : '');
//   const creatorImg  = creatorProfile?.avatar ? resolveIpfsUrl(creatorProfile.avatar) : undefined;
//   const ownerName   = isOwner ? 'You' : (ownerProfile?.username || (nft ? shortAddr(nft.owner) : ''));
//   const ownerImg    = ownerProfile?.avatar ? resolveIpfsUrl(ownerProfile.avatar) : undefined;

//   const listing    = (nft as NFT & { activeListing: Listing | null })?.activeListing ?? null;
//   const isAuction  = listing?.type === 'auction';
//   const auctionEnd = listing?.endTime ? new Date(listing.endTime) : null;

//   // ── Loading ───────────────────────────────────────────────────────────────

//   if (loading) {
//     return (
//       <RegularPageWrapper>
//         <div className="min-h-screen bg-background flex items-center justify-center">
//           <Loader2 size={32} className="animate-spin text-primary" />
//         </div>
//       </RegularPageWrapper>
//     );
//   }

//   if (error || !nft) {
//     return (
//       <RegularPageWrapper>
//         <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
//           <p className="text-muted text-lg">{error || 'NFT not found.'}</p>
//           <Button variant="outline" size="md" onClick={() => navigate(-1)}>Go Back</Button>
//         </div>
//       </RegularPageWrapper>
//     );
//   }

//   return (
//     <RegularPageWrapper>
//       <div className="min-h-screen bg-background text-main">
//         <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">

//           {/* Back button */}
//           <button
//             onClick={() => navigate(-1)}
//             className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-8 group"
//           >
//             <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
//             <span className="text-sm font-medium">Back</span>
//           </button>

//           {/* Main grid */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

//             {/* ── Left: Image ── */}
//             <div className="space-y-4">
//               <TiltImage src={nftImage} alt={nftName} />

//               {collection && (
//                 <button
//                   onClick={() => navigate(`/collection/${collectionAddress}`)}
//                   className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors"
//                 >
//                   <Layers size={14} />
//                   <span>{collection.name}</span>
//                   <ArrowRight size={12} />
//                 </button>
//               )}

//               {nftAttribs.length > 0 && (
//                 <div>
//                   <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Attributes</h3>
//                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
//                     {nftAttribs.map((attr, i) => (
//                       <div key={i} className="bg-surface rounded-xl p-3 border border-muted text-center">
//                         <p className="text-xs text-primary font-semibold uppercase truncate">{attr.trait_type}</p>
//                         <p className="text-sm text-main font-medium mt-0.5 truncate">{attr.value}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* ── Right: Info ── */}
//             <div className="space-y-6">

//               <div className="flex items-center gap-2 flex-wrap">
//                 {nft.category && (
//                   <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
//                     {formatCategory(nft.category)}
//                   </span>
//                 )}
//                 <span className="text-xs text-muted flex items-center gap-1">
//                   <Hash size={11} /> Token #{nft.tokenId}
//                 </span>
//               </div>

//               <h1 className="text-4xl font-extrabold text-main leading-tight">{nftName}</h1>

//               {/* Creator + Owner */}
//               <div className="flex gap-6 flex-wrap">
//                 <div className="flex flex-col gap-1">
//                   <span className="text-xs text-muted uppercase tracking-wider">Creator</span>
//                   <button onClick={() => navigate(`/profile/${nft.minter}`)}
//                     className="flex items-center gap-2 hover:opacity-80 transition-opacity">
//                     {creatorImg
//                       ? <img src={creatorImg} alt="" className="w-8 h-8 rounded-full object-cover" />
//                       : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><User size={14} className="text-primary" /></div>
//                     }
//                     <span className="text-sm font-semibold text-main">{creatorName}</span>
//                   </button>
//                 </div>

//                 <div className="flex flex-col gap-1">
//                   <span className="text-xs text-muted uppercase tracking-wider">Owner</span>
//                   <button onClick={() => navigate(`/profile/${nft.owner}`)}
//                     className="flex items-center gap-2 hover:opacity-80 transition-opacity">
//                     {ownerImg
//                       ? <img src={ownerImg} alt="" className="w-8 h-8 rounded-full object-cover" />
//                       : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><User size={14} className="text-primary" /></div>
//                     }
//                     <span className="text-sm font-semibold text-main">{ownerName}</span>
//                   </button>
//                 </div>
//               </div>

//               {nftDesc && (
//                 <div>
//                   <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Description</h3>
//                   <p className="text-main text-sm leading-relaxed">{nftDesc}</p>
//                 </div>
//               )}

//               {/* ── Listing / Action card ── */}
//               <div className="bg-surface border border-muted rounded-2xl p-5 space-y-4">
//                 {listing ? (
//                   <>
//                     {isAuction && auctionEnd && (
//                       <div>
//                         <div className="flex items-center gap-2 text-muted text-xs mb-3">
//                           <Clock size={13} /> Auction ends in
//                         </div>
//                         <FlipCountdown endTime={auctionEnd} />
//                       </div>
//                     )}

//                     <div>
//                       <p className="text-xs text-muted uppercase tracking-wider mb-1">
//                         {isAuction ? 'Highest Bid' : 'Price'}
//                       </p>
//                       <p className="text-3xl font-extrabold text-main">
//                         {isAuction
//                           ? toEth(listing.highestBid || listing.price)
//                           : toEth(listing.price)
//                         }
//                       </p>
//                       {isAuction && listing.highestBid && listing.highestBid !== '0' && (
//                         <p className="text-xs text-muted mt-1">
//                           Starting bid: {toEth(listing.price)}
//                         </p>
//                       )}
//                     </div>

//                     {isOwner ? (
//                       <Button variant="outline" size="lg" sxclass="w-full">
//                         Cancel Listing
//                       </Button>
//                     ) : !isConnected ? (
//                       <Button variant="primary" size="lg" sxclass="w-full">
//                         Connect Wallet to {isAuction ? 'Bid' : 'Buy'}
//                       </Button>
//                     ) : (
//                       <Button
//                         variant="primary"
//                         size="lg"
//                         sxclass="w-full flex items-center justify-center gap-2"
//                         onClick={() => setModalMode(isAuction ? 'bid' : 'buy')}
//                       >
//                         {isAuction
//                           ? <><Gavel size={16} /> Place Bid</>
//                           : <><Tag size={16} /> Buy Now</>
//                         }
//                       </Button>
//                     )}
//                   </>
//                 ) : isOwner ? (
//                   <>
//                     <p className="text-sm text-muted">You own this NFT. List it for sale on the marketplace.</p>
//                     <Button
//                       variant="primary"
//                       size="lg"
//                       sxclass="w-full flex items-center justify-center gap-2"
//                       onClick={() => navigate(`/dashboard/list/${collectionAddress}/${tokenId}`)}
//                     >
//                       <Tag size={16} /> List for Sale
//                     </Button>
//                   </>
//                 ) : (
//                   <div className="flex items-center gap-2 text-muted text-sm py-2">
//                     <Tag size={14} />
//                     <span>Not listed for sale</span>
//                   </div>
//                 )}
//               </div>

//               {/* Details */}
//               <div>
//                 <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Details</h3>
//                 <div className="space-y-2.5">
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-muted">Contract Address</span>
//                     <div className="flex items-center gap-2">
//                       <span className="font-mono text-main">{shortAddr(collectionAddress!)}</span>
//                       <CopyButton text={collectionAddress!} />
//                     </div>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-muted">Token ID</span>
//                     <span className="font-mono text-main">#{nft.tokenId}</span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-muted">Token Standard</span>
//                     <span className="text-main">ERC-721</span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-muted">Blockchain</span>
//                     <span className="text-main">Sepolia</span>
//                   </div>
//                   {nft.mintedAt && (
//                     <div className="flex items-center justify-between text-sm">
//                       <span className="text-muted flex items-center gap-1"><Calendar size={13} /> Minted</span>
//                       <span className="text-main">
//                         {new Date(nft.mintedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
//                       </span>
//                     </div>
//                   )}
//                   <div className="flex items-center gap-4 pt-2">
//                     <a href={`https://sepolia.etherscan.io/token/${collectionAddress}?a=${nft.tokenId}`}
//                       target="_blank" rel="noopener noreferrer"
//                       className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
//                       <ExternalLink size={13} /> Etherscan
//                     </a>
//                     {typeof nft.metadata?.image === 'string' && (
//                       <a href={resolveIpfsUrl(nft.metadata.image)} target="_blank" rel="noopener noreferrer"
//                         className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
//                         <Globe size={13} /> View Original
//                       </a>
//                     )}
//                   </div>
//                 </div>
//               </div>

//             </div>
//           </div>

//           {/* More from this collection */}
//           {moreNFTs.length > 0 && (
//             <div className="mt-20 mb-10">
//               <div className="flex items-center justify-between mb-6">
//                 <h2 className="text-2xl font-bold text-main">More from this collection</h2>
//                 <Button variant="outline" size="md" sxclass="px-5 flex items-center gap-2"
//                   onClick={() => navigate(`/collection/${collectionAddress}`)}>
//                   View Collection <ArrowRight size={16} />
//                 </Button>
//               </div>
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
//                 {moreNFTs.map(n => {
//                   const img   = resolveIpfsUrl(typeof n.metadata?.image === 'string' ? n.metadata.image : '');
//                   const title = typeof n.metadata?.name === 'string' ? n.metadata.name : `Token #${n.tokenId}`;
//                   return (
//                     <NFTCard
//                       key={n._id}
//                       image={img}
//                       title={title}
//                       creatorImage={creatorImg}
//                       creatorName={creatorName}
//                       owner={n.owner}
//                       listing={n.listing ?? null}
//                       category={n.category}
//                       backgroundColor="bg-surface"
//                       onClick={() => navigate(`/nft/${collectionAddress}/${n.tokenId}`)}
//                     />
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//         </div>
//       </div>

//       {/* ── Buy / Bid Modal ── */}
//       {modalMode && listing && (
//         <TxModal
//           mode={modalMode}
//           listing={listing}
//           nftName={nftName}
//           onClose={() => setModalMode(null)}
//           onSuccess={() => {
//             // Close modal, then silently refetch after 3s to give
//             // the indexer time to process the SaleCompleted / BidPlaced event
//             setModalMode(null);
//             setTimeout(() => silentRefetch(), 3000);
//           }}
//         />
//       )}

//     </RegularPageWrapper>
//   );
// };

// export default NFTDetailPage;