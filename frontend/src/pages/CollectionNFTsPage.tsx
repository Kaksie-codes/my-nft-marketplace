import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
  Loader2, ArrowLeft, User, Hash, Copy, Check, ExternalLink,
  Settings, Lock, Globe, UserPlus, UserMinus, DollarSign,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, X,
} from 'lucide-react';
import NFTCard from '../components/NFTCard';
import RegularPageWrapper from '../components/RegularPageWrapper';
import Button from '../components/button/Button';
import { collectionsApi, usersApi, type Collection, type NFT, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';
import { NFT_COLLECTION_ABI } from '../lib/abi/NFTCollection';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toEth(wei?: string): string {
  if (!wei || wei === '0') return 'Free';
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

// ── Tx Status Banner ──────────────────────────────────────────────────────────

type TxStatus = { type: 'pending' | 'success' | 'error'; message: string } | null;

function TxBanner({ status, onDismiss }: { status: TxStatus; onDismiss: () => void }) {
  if (!status) return null;
  const styles = {
    pending: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error:   'bg-red-500/10 border-red-500/30 text-red-400',
  };
  const icons = {
    pending: <Loader2 size={16} className="animate-spin flex-shrink-0" />,
    success: <CheckCircle2 size={16} className="flex-shrink-0" />,
    error:   <AlertCircle size={16} className="flex-shrink-0" />,
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium mb-4 ${styles[status.type]}`}>
      {icons[status.type]}
      <span className="flex-1">{status.message}</span>
      {status.type !== 'pending' && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ── Collection Settings Panel ─────────────────────────────────────────────────

interface SettingsPanelProps {
  collectionAddress: string;
  currentMintPrice:  string;
  onSettingChanged:  () => void;
}

function CollectionSettingsPanel({ collectionAddress, currentMintPrice, onSettingChanged }: SettingsPanelProps) {
  const [open,        setOpen]        = useState(false);
  const [txStatus,    setTxStatus]    = useState<TxStatus>(null);

  // ── Local form state ──────────────────────────────────────────────────────
  const [priceInput,  setPriceInput]  = useState('');
  const [collabInput, setCollabInput] = useState('');
  const [txHash,      setTxHash]      = useState<`0x${string}` | undefined>();

  // ── Read live on-chain state ──────────────────────────────────────────────
  const { data: publicMintEnabled, refetch: refetchPublic } = useReadContract({
    address:      collectionAddress as `0x${string}`,
    abi:          NFT_COLLECTION_ABI,
    functionName: 'publicMintEnabled',
  });

  const { data: onChainMintPrice, refetch: refetchPrice } = useReadContract({
    address:      collectionAddress as `0x${string}`,
    abi:          NFT_COLLECTION_ABI,
    functionName: 'mintPrice',
  });

  // ── Wait for any tx ───────────────────────────────────────────────────────
  const { isSuccess: txConfirmed, isError: txFailed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed) {
      setTxStatus({ type: 'success', message: 'Transaction confirmed!' });
      setTxHash(undefined);
      refetchPublic();
      refetchPrice();
      onSettingChanged();
    }
  }, [txConfirmed, refetchPublic, refetchPrice, onSettingChanged]);

  useEffect(() => {
    if (txFailed) {
      setTxStatus({ type: 'error', message: 'Transaction failed on-chain.' });
      setTxHash(undefined);
    }
  }, [txFailed]);

  // ── Shared write hook ─────────────────────────────────────────────────────
  const { writeContract } = useWriteContract();

  const sendTx = (functionName: string, args: unknown[], label: string) => {
    setTxStatus({ type: 'pending', message: `Waiting for wallet confirmation — ${label}...` });
    writeContract(
      {
        address:      collectionAddress as `0x${string}`,
        abi:          NFT_COLLECTION_ABI,
        functionName: functionName as never,
        args:         args as never,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setTxStatus({ type: 'pending', message: `${label} submitted — waiting for confirmation...` });
        },
        onError: (err) => {
          setTxStatus({
            type: 'error',
            message: err.message.includes('rejected') ? 'Transaction rejected.' : err.message,
          });
        },
      }
    );
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTogglePublic = () => {
    const next = !publicMintEnabled;
    sendTx('setPublicMint', [next], next ? 'Enabling public mint' : 'Disabling public mint');
  };

  const handleSetPrice = () => {
    const trimmed = priceInput.trim();
    if (!trimmed || isNaN(parseFloat(trimmed)) || parseFloat(trimmed) < 0) {
      setTxStatus({ type: 'error', message: 'Enter a valid price (0 for free).' });
      return;
    }
    const wei = parseEther(trimmed as `${number}`);
    sendTx('setMintPrice', [wei], `Setting mint price to ${trimmed} ETH`);
    setPriceInput('');
  };

  const handleAddCollaborator = () => {
    const addr = collabInput.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setTxStatus({ type: 'error', message: 'Enter a valid wallet address.' });
      return;
    }
    sendTx('setCollaborator', [addr, true], `Adding collaborator ${shortAddr(addr)}`);
    setCollabInput('');
  };

  const handleRemoveCollaborator = () => {
    const addr = collabInput.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setTxStatus({ type: 'error', message: 'Enter a valid wallet address.' });
      return;
    }
    sendTx('setCollaborator', [addr, false], `Removing collaborator ${shortAddr(addr)}`);
    setCollabInput('');
  };

  const isPending = txStatus?.type === 'pending';

  const livePrice = onChainMintPrice !== undefined
    ? (onChainMintPrice === 0n ? 'Free' : `${parseFloat(formatEther(onChainMintPrice)).toFixed(4)} ETH`)
    : toEth(currentMintPrice);

  return (
    <div className="mb-8 border border-muted rounded-2xl overflow-hidden">

      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-surface hover:bg-background transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings size={16} className="text-primary" />
          </div>
          <span className="font-semibold text-main text-sm">Collection Settings</span>
          <span className="text-xs text-muted bg-muted/10 px-2 py-0.5 rounded-full">Owner only</span>
        </div>
        {open ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
      </button>

      {open && (
        <div className="px-5 py-5 bg-background space-y-6 border-t border-muted">

          <TxBanner status={txStatus} onDismiss={() => setTxStatus(null)} />

          {/* ── Mint Access ── */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Mint Access</p>
            <div className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                {publicMintEnabled
                  ? <Globe size={18} className="text-green-400" />
                  : <Lock size={18} className="text-primary" />
                }
                <div>
                  <p className="text-sm font-semibold text-main">
                    {publicMintEnabled ? 'Public' : 'Private'}
                  </p>
                  <p className="text-xs text-muted">
                    {publicMintEnabled
                      ? 'Anyone can mint into this collection'
                      : 'Only you and collaborators can mint'}
                  </p>
                </div>
              </div>
              <Button
                variant={publicMintEnabled ? 'outline' : 'primary'}
                size="sm"
                disabled={isPending}
                onClick={handleTogglePublic}
                sxclass="px-4 text-xs"
              >
                {publicMintEnabled ? 'Make Private' : 'Make Public'}
              </Button>
            </div>
          </div>

          {/* ── Mint Price ── */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Mint Price</p>
            <div className="bg-surface rounded-xl px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" />
                  <span className="text-sm text-muted">Current price:</span>
                </div>
                <span className="text-sm font-semibold text-main">{livePrice}</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    placeholder="0.00 — enter 0 for free"
                    disabled={isPending}
                    className="w-full px-3 py-2 pr-12 bg-background border border-muted rounded-lg text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">ETH</span>
                </div>
                <Button variant="primary" size="sm" disabled={isPending || !priceInput} onClick={handleSetPrice} sxclass="px-4 text-xs">
                  Update
                </Button>
              </div>
            </div>
          </div>

          {/* ── Collaborators ── */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Collaborators</p>
            <p className="text-xs text-muted mb-3">
              Collaborators can mint for free without limits, even when collection is private.
            </p>
            <div className="bg-surface rounded-xl px-4 py-3 space-y-3">
              <input
                type="text"
                value={collabInput}
                onChange={e => setCollabInput(e.target.value)}
                placeholder="0x... wallet address"
                disabled={isPending}
                className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-sm text-main font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={isPending || !collabInput.trim()}
                  onClick={handleAddCollaborator}
                  sxclass="flex items-center justify-center gap-2 text-xs"
                >
                  <UserPlus size={14} /> Add Collaborator
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  disabled={isPending || !collabInput.trim()}
                  onClick={handleRemoveCollaborator}
                  sxclass="flex items-center justify-center gap-2 text-xs"
                >
                  <UserMinus size={14} /> Remove
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CollectionNFTsPage = () => {
  const { collectionAddress } = useParams<{ collectionAddress: string }>();
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();

  const [collection,     setCollection]     = useState<(Collection & { nftCount: number }) | null>(null);
  const [nfts,           setNfts]           = useState<NFT[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [page,           setPage]           = useState(1);
  const [totalPages,     setTotalPages]     = useState(1);
  const [loadingMore,    setLoadingMore]    = useState(false);

  const LIMIT = 12;

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
      // silent
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

  // Only show settings panel to the collection owner
  const handleSettingChanged = useCallback(() => { loadInitial(); }, [loadInitial]);
  const isOwner = !!(
    connectedAddress &&
    collection &&
    connectedAddress.toLowerCase() === collection.creator.toLowerCase()
  );

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

  const bannerImage = nfts[0] ? getNFTImage(nfts[0]) : null;

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">

        {/* Banner */}
        <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
          {bannerImage && (
            <img src={bannerImage} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <div className="container max-w-6xl mx-auto px-4 sm:px-6">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-primary transition-colors mt-6 mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Collection header */}
          <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
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

              <div className="flex flex-wrap gap-6">
                {[
                  { label: 'Items',      value: collection.nftCount ?? nfts.length },
                  { label: 'Mint Price', value: toEth(collection.mintPrice)        },
                  { label: 'Max Supply', value: collection.maxSupply               },
                  { label: 'Per Wallet', value: collection.maxPerWallet            },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-xl font-bold text-main">{value}</span>
                    <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>

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

          {/* Settings panel — owner only */}
          {isOwner && collectionAddress && (
            <CollectionSettingsPanel
              collectionAddress={collectionAddress}
              currentMintPrice={collection.mintPrice}
              onSettingChanged={handleSettingChanged}
            />
          )}

          {/* NFT Grid */}
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




// import { useEffect, useState, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
// import { parseEther, formatEther } from 'viem';
// import {
//   Loader2, ArrowLeft, User, Hash, Copy, Check, ExternalLink,
//   Settings, Lock, Globe, UserPlus, UserMinus, DollarSign,
//   ChevronDown, ChevronUp, AlertCircle, CheckCircle2, X,
// } from 'lucide-react';
// import NFTCard from '../components/NFTCard';
// import RegularPageWrapper from '../components/RegularPageWrapper';
// import Button from '../components/button/Button';
// import { collectionsApi, usersApi, type Collection, type NFT, type UserProfile } from '../utils/apiClient';
// import { resolveIpfsUrl } from '../utils/ipfs';
// import { NFT_COLLECTION_ABI } from '../lib/abi/NFTCollection';

// // ── Helpers ───────────────────────────────────────────────────────────────────

// function shortAddr(addr: string) {
//   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
// }

// function toEth(wei?: string): string {
//   if (!wei || wei === '0') return 'Free';
//   try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(4)} ETH`; }
//   catch { return '—'; }
// }

// function CopyButton({ text }: { text: string }) {
//   const [copied, setCopied] = useState(false);
//   return (
//     <button
//       onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
//       className="text-muted hover:text-primary transition-colors"
//     >
//       {copied ? <Check size={14} /> : <Copy size={14} />}
//     </button>
//   );
// }

// // ── Tx Status Banner ──────────────────────────────────────────────────────────

// type TxStatus = { type: 'pending' | 'success' | 'error'; message: string } | null;

// function TxBanner({ status, onDismiss }: { status: TxStatus; onDismiss: () => void }) {
//   if (!status) return null;
//   const styles = {
//     pending: 'bg-primary/10 border-primary/30 text-primary',
//     success: 'bg-green-500/10 border-green-500/30 text-green-400',
//     error:   'bg-red-500/10 border-red-500/30 text-red-400',
//   };
//   const icons = {
//     pending: <Loader2 size={16} className="animate-spin flex-shrink-0" />,
//     success: <CheckCircle2 size={16} className="flex-shrink-0" />,
//     error:   <AlertCircle size={16} className="flex-shrink-0" />,
//   };
//   return (
//     <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium mb-4 ${styles[status.type]}`}>
//       {icons[status.type]}
//       <span className="flex-1">{status.message}</span>
//       {status.type !== 'pending' && (
//         <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity">
//           <X size={14} />
//         </button>
//       )}
//     </div>
//   );
// }

// // ── Collection Settings Panel ─────────────────────────────────────────────────

// interface SettingsPanelProps {
//   collectionAddress: string;
//   currentMintPrice:  string;
//   onSettingChanged:  () => void;
// }

// function CollectionSettingsPanel({ collectionAddress, currentMintPrice, onSettingChanged }: SettingsPanelProps) {
//   const [open,        setOpen]        = useState(false);
//   const [txStatus,    setTxStatus]    = useState<TxStatus>(null);

//   // ── Local form state ──────────────────────────────────────────────────────
//   const [priceInput,  setPriceInput]  = useState('');
//   const [collabInput, setCollabInput] = useState('');
//   const [txHash,      setTxHash]      = useState<`0x${string}` | undefined>();

//   // ── Read live on-chain state ──────────────────────────────────────────────
//   const { data: publicMintEnabled, refetch: refetchPublic } = useReadContract({
//     address:      collectionAddress as `0x${string}`,
//     abi:          NFT_COLLECTION_ABI,
//     functionName: 'publicMintEnabled',
//   });

//   const { data: onChainMintPrice, refetch: refetchPrice } = useReadContract({
//     address:      collectionAddress as `0x${string}`,
//     abi:          NFT_COLLECTION_ABI,
//     functionName: 'mintPrice',
//   });

//   // ── Wait for any tx ───────────────────────────────────────────────────────
//   const { isSuccess: txConfirmed, isError: txFailed } =
//     useWaitForTransactionReceipt({ hash: txHash });

//   useEffect(() => {
//     if (txConfirmed) {
//       setTxStatus({ type: 'success', message: 'Transaction confirmed!' });
//       setTxHash(undefined);
//       refetchPublic();
//       refetchPrice();
//       onSettingChanged();
//     }
//   }, [txConfirmed]);

//   useEffect(() => {
//     if (txFailed) {
//       setTxStatus({ type: 'error', message: 'Transaction failed on-chain.' });
//       setTxHash(undefined);
//     }
//   }, [txFailed]);

//   // ── Shared write hook ─────────────────────────────────────────────────────
//   const { writeContract } = useWriteContract();

//   const sendTx = (functionName: string, args: unknown[], label: string) => {
//     setTxStatus({ type: 'pending', message: `Waiting for wallet confirmation — ${label}...` });
//     writeContract(
//       {
//         address:      collectionAddress as `0x${string}`,
//         abi:          NFT_COLLECTION_ABI,
//         functionName: functionName as never,
//         args:         args as never,
//       },
//       {
//         onSuccess: (hash) => {
//           setTxHash(hash);
//           setTxStatus({ type: 'pending', message: `${label} submitted — waiting for confirmation...` });
//         },
//         onError: (err) => {
//           setTxStatus({
//             type: 'error',
//             message: err.message.includes('rejected')    ? 'Transaction rejected.' :
//          err.message.includes('fetch')        ? 'Wallet not ready — make sure MetaMask is unlocked and on Sepolia, then try again.' :
//          err.message.includes('disconnected') ? 'Wallet disconnected — please reconnect and try again.' :
//          err.message,
//           });
//         },
//       }
//     );
//   };

//   // ── Handlers ─────────────────────────────────────────────────────────────

//   const handleTogglePublic = () => {
//     const next = !publicMintEnabled;
//     sendTx('setPublicMint', [next], next ? 'Enabling public mint' : 'Disabling public mint');
//   };

//   const handleSetPrice = () => {
//     const trimmed = priceInput.trim();
//     if (!trimmed || isNaN(parseFloat(trimmed)) || parseFloat(trimmed) < 0) {
//       setTxStatus({ type: 'error', message: 'Enter a valid price (0 for free).' });
//       return;
//     }
//     const wei = parseEther(trimmed as `${number}`);
//     sendTx('setMintPrice', [wei], `Setting mint price to ${trimmed} ETH`);
//     setPriceInput('');
//   };

//   const handleAddCollaborator = () => {
//     const addr = collabInput.trim();
//     if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
//       setTxStatus({ type: 'error', message: 'Enter a valid wallet address.' });
//       return;
//     }
//     sendTx('setCollaborator', [addr, true], `Adding collaborator ${shortAddr(addr)}`);
//     setCollabInput('');
//   };

//   const handleRemoveCollaborator = () => {
//     const addr = collabInput.trim();
//     if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
//       setTxStatus({ type: 'error', message: 'Enter a valid wallet address.' });
//       return;
//     }
//     sendTx('setCollaborator', [addr, false], `Removing collaborator ${shortAddr(addr)}`);
//     setCollabInput('');
//   };

//   const isPending = txStatus?.type === 'pending';

//   const livePrice = onChainMintPrice !== undefined
//     ? (onChainMintPrice === 0n ? 'Free' : `${parseFloat(formatEther(onChainMintPrice)).toFixed(4)} ETH`)
//     : toEth(currentMintPrice);

//   return (
//     <div className="mb-8 border border-muted rounded-2xl overflow-hidden">

//       {/* Header toggle */}
//       <button
//         onClick={() => setOpen(o => !o)}
//         className="w-full flex items-center justify-between px-5 py-4 bg-surface hover:bg-background transition-colors"
//       >
//         <div className="flex items-center gap-3">
//           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
//             <Settings size={16} className="text-primary" />
//           </div>
//           <span className="font-semibold text-main text-sm">Collection Settings</span>
//           <span className="text-xs text-muted bg-muted/10 px-2 py-0.5 rounded-full">Owner only</span>
//         </div>
//         {open ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
//       </button>

//       {open && (
//         <div className="px-5 py-5 bg-background space-y-6 border-t border-muted">

//           <TxBanner status={txStatus} onDismiss={() => setTxStatus(null)} />

//           {/* ── Mint Access ── */}
//           <div>
//             <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Mint Access</p>
//             <div className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
//               <div className="flex items-center gap-3">
//                 {publicMintEnabled
//                   ? <Globe size={18} className="text-green-400" />
//                   : <Lock size={18} className="text-primary" />
//                 }
//                 <div>
//                   <p className="text-sm font-semibold text-main">
//                     {publicMintEnabled ? 'Public' : 'Private'}
//                   </p>
//                   <p className="text-xs text-muted">
//                     {publicMintEnabled
//                       ? 'Anyone can mint into this collection'
//                       : 'Only you and collaborators can mint'}
//                   </p>
//                 </div>
//               </div>
//               <Button
//                 variant={publicMintEnabled ? 'outline' : 'primary'}
//                 size="sm"
//                 disabled={isPending}
//                 onClick={handleTogglePublic}
//                 sxclass="px-4 text-xs"
//               >
//                 {publicMintEnabled ? 'Make Private' : 'Make Public'}
//               </Button>
//             </div>
//           </div>

//           {/* ── Mint Price ── */}
//           <div>
//             <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Mint Price</p>
//             <div className="bg-surface rounded-xl px-4 py-3 space-y-3">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <DollarSign size={16} className="text-primary" />
//                   <span className="text-sm text-muted">Current price:</span>
//                 </div>
//                 <span className="text-sm font-semibold text-main">{livePrice}</span>
//               </div>
//               <div className="flex gap-2">
//                 <div className="relative flex-1">
//                   <input
//                     type="number"
//                     min="0"
//                     step="0.001"
//                     value={priceInput}
//                     onChange={e => setPriceInput(e.target.value)}
//                     placeholder="0.00 — enter 0 for free"
//                     disabled={isPending}
//                     className="w-full px-3 py-2 pr-12 bg-background border border-muted rounded-lg text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
//                   />
//                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">ETH</span>
//                 </div>
//                 <Button variant="primary" size="sm" disabled={isPending || !priceInput} onClick={handleSetPrice} sxclass="px-4 text-xs">
//                   Update
//                 </Button>
//               </div>
//             </div>
//           </div>

//           {/* ── Collaborators ── */}
//           <div>
//             <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Collaborators</p>
//             <p className="text-xs text-muted mb-3">
//               Collaborators can mint for free without limits, even when collection is private.
//             </p>
//             <div className="bg-surface rounded-xl px-4 py-3 space-y-3">
//               <input
//                 type="text"
//                 value={collabInput}
//                 onChange={e => setCollabInput(e.target.value)}
//                 placeholder="0x... wallet address"
//                 disabled={isPending}
//                 className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-sm text-main font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
//               />
//               <div className="flex gap-2">
//                 <Button
//                   variant="primary"
//                   size="sm"
//                   fullWidth
//                   disabled={isPending || !collabInput.trim()}
//                   onClick={handleAddCollaborator}
//                   sxclass="flex items-center justify-center gap-2 text-xs"
//                 >
//                   <UserPlus size={14} /> Add Collaborator
//                 </Button>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   fullWidth
//                   disabled={isPending || !collabInput.trim()}
//                   onClick={handleRemoveCollaborator}
//                   sxclass="flex items-center justify-center gap-2 text-xs"
//                 >
//                   <UserMinus size={14} /> Remove
//                 </Button>
//               </div>
//             </div>
//           </div>

//         </div>
//       )}
//     </div>
//   );
// }

// // ── Page ──────────────────────────────────────────────────────────────────────

// const CollectionNFTsPage = () => {
//   const { collectionAddress } = useParams<{ collectionAddress: string }>();
//   const navigate = useNavigate();
//   const { address: connectedAddress } = useAccount();

//   const [collection,     setCollection]     = useState<(Collection & { nftCount: number }) | null>(null);
//   const [nfts,           setNfts]           = useState<NFT[]>([]);
//   const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
//   const [loading,        setLoading]        = useState(true);
//   const [error,          setError]          = useState('');
//   const [page,           setPage]           = useState(1);
//   const [totalPages,     setTotalPages]     = useState(1);
//   const [loadingMore,    setLoadingMore]    = useState(false);

//   const LIMIT = 12;

//   const loadInitial = useCallback(async () => {
//     if (!collectionAddress) return;
//     setLoading(true);
//     setError('');
//     try {
//       const [col, nftRes] = await Promise.all([
//         collectionsApi.getOne(collectionAddress),
//         collectionsApi.getNFTs(collectionAddress, 1, LIMIT),
//       ]);
//       setCollection(col);
//       setNfts(nftRes.data);
//       setTotalPages(nftRes.pagination.pages);
//       setPage(1);
//       usersApi.getProfile(col.creator).then(setCreatorProfile).catch(() => null);
//     } catch {
//       setError('Collection not found or failed to load.');
//     } finally {
//       setLoading(false);
//     }
//   }, [collectionAddress]);

//   useEffect(() => { loadInitial(); }, [loadInitial]);

//   const loadMore = async () => {
//     if (!collectionAddress || loadingMore || page >= totalPages) return;
//     setLoadingMore(true);
//     try {
//       const nextPage = page + 1;
//       const res = await collectionsApi.getNFTs(collectionAddress, nextPage, LIMIT);
//       setNfts(prev => [...prev, ...res.data]);
//       setPage(nextPage);
//     } catch {
//       // silent
//     } finally {
//       setLoadingMore(false);
//     }
//   };

//   const getNFTImage = (nft: NFT) =>
//     resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

//   const getNFTTitle = (nft: NFT) =>
//     typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

//   const creatorName = creatorProfile?.username || (collection ? shortAddr(collection.creator) : '');
//   const creatorImg  = creatorProfile?.avatar ? resolveIpfsUrl(creatorProfile.avatar) : undefined;

//   // Only show settings panel to the collection owner
//   const isOwner = !!(
//     connectedAddress &&
//     collection &&
//     connectedAddress.toLowerCase() === collection.creator.toLowerCase()
//   );

//   if (loading) {
//     return (
//       <RegularPageWrapper>
//         <div className="min-h-screen bg-background flex items-center justify-center">
//           <Loader2 size={32} className="animate-spin text-primary" />
//         </div>
//       </RegularPageWrapper>
//     );
//   }

//   if (error || !collection) {
//     return (
//       <RegularPageWrapper>
//         <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
//           <p className="text-muted text-lg">{error || 'Collection not found.'}</p>
//           <Button variant="outline" size="md" onClick={() => navigate(-1)}>Go Back</Button>
//         </div>
//       </RegularPageWrapper>
//     );
//   }

//   const bannerImage = nfts[0] ? getNFTImage(nfts[0]) : null;

//   return (
//     <RegularPageWrapper>
//       <div className="min-h-screen bg-background text-main">

//         {/* Banner */}
//         <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
//           {bannerImage && (
//             <img src={bannerImage} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
//           )}
//           <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
//         </div>

//         <div className="container max-w-6xl mx-auto px-4 sm:px-6">

//           {/* Back */}
//           <button
//             onClick={() => navigate(-1)}
//             className="flex items-center gap-2 text-muted hover:text-primary transition-colors mt-6 mb-6 group"
//           >
//             <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
//             <span className="text-sm font-medium">Back</span>
//           </button>

//           {/* Collection header */}
//           <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
//             <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-surface shadow-xl flex-shrink-0 -mt-16 relative z-10 bg-gradient-to-br from-primary to-secondary">
//               {bannerImage && (
//                 <img src={bannerImage} alt={collection.name} className="w-full h-full object-cover" />
//               )}
//             </div>

//             <div className="flex-1 space-y-3">
//               <div>
//                 <h1 className="text-3xl font-extrabold text-main">{collection.name}</h1>
//                 <p className="text-muted text-sm font-mono">{collection.symbol}</p>
//               </div>

//               <button
//                 onClick={() => navigate(`/profile/${collection.creator}`)}
//                 className="flex items-center gap-2 hover:opacity-80 transition-opacity"
//               >
//                 {creatorImg
//                   ? <img src={creatorImg} alt="" className="w-6 h-6 rounded-full object-cover" />
//                   : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"><User size={12} className="text-primary" /></div>
//                 }
//                 <span className="text-sm text-muted">by <span className="text-main font-semibold">{creatorName}</span></span>
//               </button>

//               <div className="flex flex-wrap gap-6">
//                 {[
//                   { label: 'Items',      value: collection.nftCount ?? nfts.length },
//                   { label: 'Mint Price', value: toEth(collection.mintPrice)        },
//                   { label: 'Max Supply', value: collection.maxSupply               },
//                   { label: 'Per Wallet', value: collection.maxPerWallet            },
//                 ].map(({ label, value }) => (
//                   <div key={label} className="flex flex-col">
//                     <span className="text-xl font-bold text-main">{value}</span>
//                     <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex items-center gap-2 text-xs text-muted">
//                 <Hash size={12} />
//                 <span className="font-mono">{shortAddr(collection.address)}</span>
//                 <CopyButton text={collection.address} />
//                 <a
//                   href={`https://sepolia.etherscan.io/address/${collection.address}`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="hover:text-primary transition-colors"
//                 >
//                   <ExternalLink size={12} />
//                 </a>
//               </div>
//             </div>
//           </div>

//           {/* Settings panel — owner only */}
//           {isOwner && collectionAddress && (
//             <CollectionSettingsPanel
//               collectionAddress={collectionAddress}
//               currentMintPrice={collection.mintPrice}
//               onSettingChanged={loadInitial}
//             />
//           )}

//           {/* NFT Grid */}
//           {nfts.length === 0 ? (
//             <div className="text-center py-20 text-muted">
//               <p className="text-lg">No NFTs in this collection yet.</p>
//             </div>
//           ) : (
//             <>
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
//                 {nfts.map(nft => (
//                   <NFTCard
//                     key={nft._id}
//                     image={getNFTImage(nft)}
//                     title={getNFTTitle(nft)}
//                     creatorImage={creatorImg}
//                     creatorName={creatorName}
//                     owner={nft.owner}
//                     listing={nft.listing ?? null}
//                     category={nft.category}
//                     backgroundColor="bg-surface"
//                     onClick={() => navigate(`/nft/${collectionAddress}/${nft.tokenId}`)}
//                   />
//                 ))}
//               </div>

//               {page < totalPages && (
//                 <div className="flex justify-center pb-16">
//                   <Button variant="outline" size="md" onClick={loadMore} disabled={loadingMore}
//                     sxclass="px-8 flex items-center gap-2">
//                     {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : 'Load More'}
//                   </Button>
//                 </div>
//               )}
//             </>
//           )}

//         </div>
//       </div>
//     </RegularPageWrapper>
//   );
// };

// export default CollectionNFTsPage;







// // import { useEffect, useState, useCallback } from 'react';
// // import { useParams, useNavigate } from 'react-router-dom';
// // import { Loader2, ArrowLeft, User, Hash, Copy, Check, ExternalLink } from 'lucide-react';
// // import NFTCard from '../components/NFTCard';
// // import RegularPageWrapper from '../components/RegularPageWrapper';
// // import Button from '../components/button/Button';
// // import { collectionsApi, usersApi, type Collection, type NFT, type UserProfile } from '../utils/apiClient';
// // import { resolveIpfsUrl } from '../utils/ipfs';
// // import { formatEther } from 'viem';

// // // ── Helpers ───────────────────────────────────────────────────────────────────

// // function shortAddr(addr: string) {
// //   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
// // }

// // function toEth(wei?: string): string {
// //   if (!wei || wei === '0') return '—';
// //   try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(4)} ETH`; }
// //   catch { return '—'; }
// // }

// // function CopyButton({ text }: { text: string }) {
// //   const [copied, setCopied] = useState(false);
// //   return (
// //     <button
// //       onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
// //       className="text-muted hover:text-primary transition-colors"
// //     >
// //       {copied ? <Check size={14} /> : <Copy size={14} />}
// //     </button>
// //   );
// // }

// // // ── Page ──────────────────────────────────────────────────────────────────────

// // const CollectionNFTsPage = () => {
// //   const { collectionAddress } = useParams<{ collectionAddress: string }>();
// //   const navigate = useNavigate();

// //   const [collection,     setCollection]     = useState<(Collection & { nftCount: number }) | null>(null);
// //   const [nfts,           setNfts]           = useState<NFT[]>([]);
// //   const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
// //   const [loading,        setLoading]        = useState(true);
// //   const [error,          setError]          = useState('');
// //   const [page,           setPage]           = useState(1);
// //   const [totalPages,     setTotalPages]     = useState(1);
// //   const [loadingMore,    setLoadingMore]    = useState(false);

// //   const LIMIT = 12;

// //   // Initial load — collection info + first page of NFTs + creator profile
// //   const loadInitial = useCallback(async () => {
// //     if (!collectionAddress) return;
// //     setLoading(true);
// //     setError('');
// //     try {
// //       const [col, nftRes] = await Promise.all([
// //         collectionsApi.getOne(collectionAddress),
// //         collectionsApi.getNFTs(collectionAddress, 1, LIMIT),
// //       ]);
// //       setCollection(col);
// //       setNfts(nftRes.data);
// //       setTotalPages(nftRes.pagination.pages);
// //       setPage(1);

// //       // Fetch creator profile separately — non-blocking
// //       usersApi.getProfile(col.creator).then(setCreatorProfile).catch(() => null);
// //     } catch {
// //       setError('Collection not found or failed to load.');
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [collectionAddress]);

// //   useEffect(() => { loadInitial(); }, [loadInitial]);

// //   const loadMore = async () => {
// //     if (!collectionAddress || loadingMore || page >= totalPages) return;
// //     setLoadingMore(true);
// //     try {
// //       const nextPage = page + 1;
// //       const res = await collectionsApi.getNFTs(collectionAddress, nextPage, LIMIT);
// //       setNfts(prev => [...prev, ...res.data]);
// //       setPage(nextPage);
// //     } catch {
// //       // silent — user can try again
// //     } finally {
// //       setLoadingMore(false);
// //     }
// //   };

// //   const getNFTImage = (nft: NFT) =>
// //     resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

// //   const getNFTTitle = (nft: NFT) =>
// //     typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

// //   const creatorName = creatorProfile?.username || (collection ? shortAddr(collection.creator) : '');
// //   const creatorImg  = creatorProfile?.avatar ? resolveIpfsUrl(creatorProfile.avatar) : undefined;

// //   // ── Loading ───────────────────────────────────────────────────────────────

// //   if (loading) {
// //     return (
// //       <RegularPageWrapper>
// //         <div className="min-h-screen bg-background flex items-center justify-center">
// //           <Loader2 size={32} className="animate-spin text-primary" />
// //         </div>
// //       </RegularPageWrapper>
// //     );
// //   }

// //   if (error || !collection) {
// //     return (
// //       <RegularPageWrapper>
// //         <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
// //           <p className="text-muted text-lg">{error || 'Collection not found.'}</p>
// //           <Button variant="outline" size="md" onClick={() => navigate(-1)}>Go Back</Button>
// //         </div>
// //       </RegularPageWrapper>
// //     );
// //   }

// //   // Use first NFT image as collection banner if available
// //   const bannerImage = nfts[0] ? getNFTImage(nfts[0]) : null;

// //   return (
// //     <RegularPageWrapper>
// //       <div className="min-h-screen bg-background text-main">

// //         {/* ── Banner ── */}
// //         <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
// //           {bannerImage && (
// //             <img src={bannerImage} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
// //           )}
// //           <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
// //         </div>

// //         <div className="container max-w-6xl mx-auto px-4 sm:px-6">

// //           {/* Back button */}
// //           <button
// //             onClick={() => navigate(-1)}
// //             className="flex items-center gap-2 text-muted hover:text-primary transition-colors mt-6 mb-6 group"
// //           >
// //             <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
// //             <span className="text-sm font-medium">Back</span>
// //           </button>

// //           {/* ── Collection header ── */}
// //           <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
// //             {/* Collection icon — first NFT image or gradient fallback */}
// //             <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-surface shadow-xl flex-shrink-0 -mt-16 relative z-10 bg-gradient-to-br from-primary to-secondary">
// //               {bannerImage && (
// //                 <img src={bannerImage} alt={collection.name} className="w-full h-full object-cover" />
// //               )}
// //             </div>

// //             <div className="flex-1 space-y-3">
// //               <div>
// //                 <h1 className="text-3xl font-extrabold text-main">{collection.name}</h1>
// //                 <p className="text-muted text-sm font-mono">{collection.symbol}</p>
// //               </div>

// //               {/* Creator */}
// //               <button
// //                 onClick={() => navigate(`/profile/${collection.creator}`)}
// //                 className="flex items-center gap-2 hover:opacity-80 transition-opacity"
// //               >
// //                 {creatorImg
// //                   ? <img src={creatorImg} alt="" className="w-6 h-6 rounded-full object-cover" />
// //                   : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"><User size={12} className="text-primary" /></div>
// //                 }
// //                 <span className="text-sm text-muted">by <span className="text-main font-semibold">{creatorName}</span></span>
// //               </button>

// //               {/* Stats row */}
// //               <div className="flex flex-wrap gap-6">
// //                 <div className="flex flex-col">
// //                   <span className="text-xl font-bold text-main">{collection.nftCount ?? nfts.length}</span>
// //                   <span className="text-xs text-muted uppercase tracking-wider">Items</span>
// //                 </div>
// //                 <div className="flex flex-col">
// //                   <span className="text-xl font-bold text-main">{toEth(collection.mintPrice)}</span>
// //                   <span className="text-xs text-muted uppercase tracking-wider">Mint Price</span>
// //                 </div>
// //                 <div className="flex flex-col">
// //                   <span className="text-xl font-bold text-main">{collection.maxSupply}</span>
// //                   <span className="text-xs text-muted uppercase tracking-wider">Max Supply</span>
// //                 </div>
// //                 <div className="flex flex-col">
// //                   <span className="text-xl font-bold text-main">{collection.maxPerWallet}</span>
// //                   <span className="text-xs text-muted uppercase tracking-wider">Per Wallet</span>
// //                 </div>
// //               </div>

// //               {/* Contract address */}
// //               <div className="flex items-center gap-2 text-xs text-muted">
// //                 <Hash size={12} />
// //                 <span className="font-mono">{shortAddr(collection.address)}</span>
// //                 <CopyButton text={collection.address} />
// //                 <a
// //                   href={`https://sepolia.etherscan.io/address/${collection.address}`}
// //                   target="_blank"
// //                   rel="noopener noreferrer"
// //                   className="hover:text-primary transition-colors"
// //                 >
// //                   <ExternalLink size={12} />
// //                 </a>
// //               </div>
// //             </div>
// //           </div>

// //           {/* ── NFT Grid ── */}
// //           {nfts.length === 0 ? (
// //             <div className="text-center py-20 text-muted">
// //               <p className="text-lg">No NFTs in this collection yet.</p>
// //             </div>
// //           ) : (
// //             <>
// //               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
// //                 {nfts.map(nft => (
// //                   <NFTCard
// //                     key={nft._id}
// //                     image={getNFTImage(nft)}
// //                     title={getNFTTitle(nft)}
// //                     creatorImage={creatorImg}
// //                     creatorName={creatorName}
// //                     owner={nft.owner}
// //                     listing={nft.listing ?? null}
// //                     category={nft.category}
// //                     backgroundColor="bg-surface"
// //                     onClick={() => navigate(`/nft/${collectionAddress}/${nft.tokenId}`)}
// //                   />
// //                 ))}
// //               </div>

// //               {/* Load more */}
// //               {page < totalPages && (
// //                 <div className="flex justify-center pb-16">
// //                   <Button variant="outline" size="md" onClick={loadMore} disabled={loadingMore}
// //                     sxclass="px-8 flex items-center gap-2">
// //                     {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : 'Load More'}
// //                   </Button>
// //                 </div>
// //               )}
// //             </>
// //           )}

// //         </div>
// //       </div>
// //     </RegularPageWrapper>
// //   );
// // };

// // export default CollectionNFTsPage;