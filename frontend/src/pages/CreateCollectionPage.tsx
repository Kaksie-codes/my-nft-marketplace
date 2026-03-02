import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Loader2, CheckCircle, AlertCircle,
  ExternalLink, InfinityIcon, X, Grid3X3, Sparkles,
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { decodeEventLog } from 'viem';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { NFT_COLLECTION_FACTORY_ABI } from '../lib/abi/NFTCollectionFactory';
import { CONTRACT_ADDRESSES } from '../lib/config';
import Input from '../components/inputs/Input';
import Button from '../components/button/Button';
import TrendingCollectionCard from '../components/TrendingCollectionCard';
import { collectionsApi, usersApi, type Collection, type NFT, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

// ── Event ABI ─────────────────────────────────────────────────────────────────

const COLLECTION_CREATED_EVENT = [{
  type: 'event',
  name: 'CollectionCreated',
  inputs: [
    { name: 'creator',           type: 'address', indexed: true  },
    { name: 'collectionAddress', type: 'address', indexed: true  },
    { name: 'name',              type: 'string',  indexed: false },
    { name: 'symbol',            type: 'string',  indexed: false },
    { name: 'maxSupply',         type: 'uint256', indexed: false },
    { name: 'maxPerWallet',      type: 'uint256', indexed: false },
  ],
}] as const;

type Step = 'idle' | 'deploying' | 'success' | 'error';

// ── Enriched collection type ──────────────────────────────────────────────────

interface EnrichedCollection {
  collection:  Collection;
  nfts:        NFT[];
  creator:     UserProfile | null;
}

function getNFTImage(nft: NFT): string {
  return resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');
}

// ── Create Collection Modal ───────────────────────────────────────────────────

interface CreateModalProps {
  onClose:   () => void;
  onSuccess: (col: { address: string; name: string; symbol: string; maxSupply: string; maxPerWallet: string }) => void;
}

function CreateCollectionModal({ onClose, onSuccess }: CreateModalProps) {
  const { address, isConnected } = useAccount();

  const [name,         setName]         = useState('');
  const [symbol,       setSymbol]       = useState('');
  const [maxSupply,    setMaxSupply]     = useState('');
  const [maxPerWallet, setMaxPerWallet] = useState('0');
  const [step,         setStep]         = useState<Step>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { data: receipt, isSuccess: isConfirmed, isError: isFailed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt || !isConfirmed) return;
    try {
      let collectionAddr: string | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: COLLECTION_CREATED_EVENT,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'CollectionCreated') {
            collectionAddr = decoded.args.collectionAddress as string;
            break;
          }
        } catch { continue; }
      }
      if (!collectionAddr) throw new Error('CollectionCreated event not found');
      setDeployedAddress(collectionAddr);
      setStep('success');
      onSuccess({ address: collectionAddr, name, symbol, maxSupply, maxPerWallet });
    } catch (err) {
      console.error('Failed to parse event:', err);
      setErrorMessage('Transaction succeeded but failed to read collection address.');
      setStep('error');
    }
  }, [receipt, isConfirmed, name, symbol, maxSupply, maxPerWallet, onSuccess]);

  useEffect(() => {
    if (isFailed) { setErrorMessage('Transaction failed onchain.'); setStep('error'); }
  }, [isFailed]);

  const handleCreate = () => {
    if (!isConnected || !address) { setErrorMessage('Connect your wallet first.'); return; }
    if (!name.trim() || !symbol.trim()) { setErrorMessage('Name and symbol are required.'); return; }
    if (!maxSupply || Number(maxSupply) < 1) { setErrorMessage('Max supply must be at least 1.'); return; }
    setErrorMessage('');
    setStep('deploying');
    writeContract({
      address: CONTRACT_ADDRESSES.nftCollectionFactory as `0x${string}`,
      abi: NFT_COLLECTION_FACTORY_ABI,
      functionName: 'createCollection',
      args: [name.trim(), symbol.trim().toUpperCase(), BigInt(maxSupply), BigInt(maxPerWallet || '0')],
    }, {
      onError: (err) => { setErrorMessage(err.message || 'Transaction rejected.'); setStep('error'); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === 'idle' || step === 'error' ? onClose : undefined} />

      <div className="relative bg-surface border border-muted rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-main">New Collection</h2>
              <p className="text-xs text-muted">Deploy an ERC-721 contract on Sepolia</p>
            </div>
          </div>
          {(step === 'idle' || step === 'error') && (
            <button onClick={onClose} className="text-muted hover:text-main transition-colors p-1 rounded-lg hover:bg-background">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Form */}
          {(step === 'idle' || step === 'error') && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Collection Name *</label>
                <Input placeholder="e.g. Cosmic Art" value={name} bgColor="bg-background"
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Symbol *</label>
                <Input placeholder="e.g. COSM" value={symbol} bgColor="bg-background"
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Max Supply *</label>
                <Input placeholder="e.g. 10000" value={maxSupply} bgColor="bg-background" type="number"
                  onChange={(e) => setMaxSupply(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Max Per Wallet <span className="text-xs font-normal">(optional)</span>
                </label>
                <Input placeholder="0" value={maxPerWallet} bgColor="bg-background" type="number"
                  onChange={(e) => setMaxPerWallet(e.target.value)} />
                <p className="text-xs text-muted mt-1 flex items-center gap-1">
                  <InfinityIcon size={12} />
                  Set to <strong className="text-main mx-1">0</strong> for unlimited.
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 rounded-lg p-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={!name.trim() || !symbol.trim() || !maxSupply || !isConnected || isPending}
                loading={isPending}
                size="md"
                fullWidth
              >
                <Plus size={18} /> Deploy Collection
              </Button>

              {!isConnected && (
                <p className="text-xs text-amber-500 text-center">Connect your wallet to deploy.</p>
              )}
            </div>
          )}

          {/* Deploying */}
          {step === 'deploying' && (
            <div className="text-center space-y-4 py-4">
              <Loader2 size={48} className="animate-spin text-primary mx-auto" />
              <h3 className="text-lg font-semibold text-main">Deploying Collection...</h3>
              <p className="text-muted text-sm">Confirm the transaction in your wallet.</p>
              {hash && (
                <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                  View on Etherscan <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-main">Collection Deployed!</h3>
              <p className="text-muted text-sm">
                <strong className="text-main">{name}</strong> ({symbol}) is live on Sepolia.
              </p>
              <div className="bg-background rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Contract</span>
                  <span className="font-mono text-main text-xs truncate max-w-[180px]">{deployedAddress}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Max Supply</span>
                  <span className="text-main">{Number(maxSupply).toLocaleString()} NFTs</span>
                </div>
              </div>
              {hash && (
                <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                  View transaction <ExternalLink size={14} />
                </a>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link to="/dashboard/create">
                  <Button variant="primary" size="md" sxclass="px-6">Mint NFT</Button>
                </Link>
                <Button variant="outline" size="md" sxclass="px-6" onClick={onClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const CreateCollectionPage: React.FC = () => {
  const { address, isConnected }              = useAccount();
  const navigate                              = useNavigate();
  const [enriched,    setEnriched]            = useState<EnrichedCollection[]>([]);
  const [isLoading,   setIsLoading]           = useState(false);
  const [showModal,   setShowModal]           = useState(false);
  const [fetchError,  setFetchError]          = useState<string | null>(null);
  const [total,       setTotal]               = useState(0);

  const fetchCollections = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await collectionsApi.getAll({ creator: address });
      setTotal(res.pagination.total);

      // For each collection, fetch up to 3 NFTs for thumbnails in parallel
      const enrichedData = await Promise.all(
        res.data.map(async (col): Promise<EnrichedCollection> => {
          const [nftRes, creator] = await Promise.all([
            collectionsApi.getNFTs(col.address, 1, 3).catch(() => ({ data: [] as NFT[] })),
            usersApi.getProfile(col.creator).catch(() => null),
          ]);
          return { collection: col, nfts: nftRes.data, creator };
        })
      );

      setEnriched(enrichedData);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
      setFetchError('Failed to load collections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleDeploySuccess = useCallback((newCol: {
    address: string; name: string; symbol: string; maxSupply: string; maxPerWallet: string;
  }) => {
    setShowModal(false);

    // Optimistically prepend — no NFTs yet, no creator profile needed (it's us)
    const optimistic: EnrichedCollection = {
      collection: {
        _id:          newCol.address,
        address:      newCol.address.toLowerCase(),
        creator:      address?.toLowerCase() ?? '',
        name:         newCol.name,
        symbol:       newCol.symbol,
        maxSupply:    newCol.maxSupply,
        maxPerWallet: newCol.maxPerWallet,
        mintPrice:    '0',
        nftCount:     0,
        createdAt:    new Date().toISOString(),
      },
      nfts:    [],
      creator: null,
    };

    setEnriched(prev => [optimistic, ...prev]);
    setTotal(prev => prev + 1);

    // Replace optimistic entry with real indexed data after indexer catches up
    setTimeout(() => fetchCollections(), 5000);
  }, [address, fetchCollections]);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-main">My Collections</h1>
            <p className="text-muted text-sm mt-1">
              {total > 0
                ? `${total} collection${total !== 1 ? 's' : ''} deployed`
                : 'Deploy ERC-721 contracts on Sepolia'}
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowModal(true)}
            disabled={!isConnected} sxclass="flex items-center gap-2 px-4 self-start sm:self-auto">
            <Plus size={18} /> New Collection
          </Button>
        </div>

        {/* Not connected */}
        {!isConnected && (
          <div className="bg-surface border border-muted rounded-2xl p-8 text-center">
            <Layers size={40} className="text-muted mx-auto mb-3" />
            <p className="text-main font-medium mb-1">Connect your wallet</p>
            <p className="text-muted text-sm">Connect your wallet to view and create collections.</p>
          </div>
        )}

        {/* Loading skeletons */}
        {isConnected && isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-[180px] bg-muted/20 rounded-[10px]" />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-[70px] bg-muted/20 rounded-[5px]" />
                  ))}
                </div>
                <div className="h-4 bg-muted/20 rounded w-2/3" />
                <div className="h-3 bg-muted/20 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isConnected && !isLoading && fetchError && (
          <div className="bg-surface border border-red-500/20 rounded-2xl p-6 text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
            <p className="text-red-500 text-sm">{fetchError}</p>
            <Button variant="outline" size="sm" sxclass="mt-3" onClick={fetchCollections}>Retry</Button>
          </div>
        )}

        {/* Empty state */}
        {isConnected && !isLoading && !fetchError && enriched.length === 0 && (
          <div className="bg-surface border border-dashed border-muted rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Grid3X3 size={28} className="text-primary" />
            </div>
            <h3 className="text-main font-semibold mb-2">No collections yet</h3>
            <p className="text-muted text-sm mb-6 max-w-xs mx-auto">
              Deploy your first ERC-721 collection contract on Sepolia to start minting NFTs.
            </p>
            <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
              <Sparkles size={16} /> Create your first collection
            </Button>
          </div>
        )}

        {/* Collections grid */}
        {isConnected && !isLoading && !fetchError && enriched.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {enriched.map(({ collection: col, nfts, creator }) => {
              const bannerImg  = nfts[0] ? getNFTImage(nfts[0]) : '/nft-placeholder.png';
              const thumbnails = nfts.map(getNFTImage);
              const creatorName = creator?.username
                || `${col.creator.slice(0, 6)}...${col.creator.slice(-4)}`;
              const creatorImg = creator?.avatar
                ? resolveIpfsUrl(creator.avatar)
                : undefined;

              return (
                <div
                  key={col._id}
                  onClick={() => navigate(`/collection/${col.address}`)}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <TrendingCollectionCard
                    bannerImg={bannerImg}
                    thumbnails={thumbnails}
                    count={col.nftCount ?? nfts.length}
                    title={col.name}
                    creatorName={creatorName}
                    creatorImg={creatorImg}
                  />
                </div>
              );
            })}
          </div>
        )}

      </div>

      {showModal && (
        <CreateCollectionModal
          onClose={() => setShowModal(false)}
          onSuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
};

export default CreateCollectionPage;