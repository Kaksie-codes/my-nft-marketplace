import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  Upload, Image as ImageIcon, Plus, X, Eye, Tag, FileText,
  Palette, Layers, Loader2, CheckCircle, AlertCircle, ExternalLink,
  Film, Gamepad2, Trophy, Music, Camera, Video, Wrench, Dumbbell,
  Globe, Lock, Users, Crown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEventLogs, formatEther } from 'viem';
import { uploadNFTToPinata } from '../utils/ipfs';
import { NFT_COLLECTION_ABI } from '../lib/abi/NFTCollection';
import Input from '../components/inputs/Input';
import Button from '../components/button/Button';
import { collectionsApi, type Collection } from '../utils/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NFTProperty {
  id: string;
  trait_type: string;
  value: string;
}

interface NFTFormData {
  name: string;
  description: string;
  category: string;
  collection: string;
}

type MintStep = 'form' | 'uploading' | 'minting' | 'success' | 'error';

// Collection enriched with how the current user relates to it
type CollectionRole = 'owner' | 'collaborator' | 'public';

interface LabelledCollection extends Collection {
  role: CollectionRole;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
];
const MAX_FILE_SIZE_MB = 50;

const CATEGORIES = [
  { value: 'gaming',         label: 'Gaming',        icon: Gamepad2 },
  { value: 'art',            label: 'Art',            icon: Palette  },
  { value: 'collectibles',   label: 'Collectibles',   icon: Trophy   },
  { value: 'music',          label: 'Music',          icon: Music    },
  { value: 'photography',    label: 'Photography',    icon: Camera   },
  { value: 'video',          label: 'Video',          icon: Video    },
  { value: 'utility',        label: 'Utility',        icon: Wrench   },
  { value: 'sports',         label: 'Sports',         icon: Dumbbell },
  { value: 'virtual_worlds', label: 'Virtual Worlds', icon: Globe    },
  { value: 'other',          label: 'Other',          icon: Layers   },
];

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: CollectionRole }) {
  if (role === 'owner') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
      <Crown size={9} /> Mine
    </span>
  );
  if (role === 'collaborator') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
      <Users size={9} /> Collaborator
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
      <Globe size={9} /> Public
    </span>
  );
}

// ── Access badge (lock icon for private, globe for public) ────────────────────

function AccessBadge({ isPublic }: { isPublic: boolean }) {
  if (isPublic) return (
    <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
      <Globe size={9} /> Open
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted">
      <Lock size={9} /> Private
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const CreateNFTPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  // File state
  const [file, setFile]               = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [isVideo, setIsVideo]         = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Form state
  const [properties, setProperties]   = useState<NFTProperty[]>([]);
  const [formData, setFormData]       = useState<NFTFormData>({
    name: '', description: '', category: '', collection: '',
  });
  const [customCategory, setCustomCategory] = useState('');

  // Mint state
  const [mintStep, setMintStep]           = useState<MintStep>('form');
  const [errorMessage, setErrorMessage]   = useState('');
  const [tokenId, setTokenId]             = useState<bigint | null>(null);

  // Collections — merged from three sources with role labels
  const [collections, setCollections]         = useState<LabelledCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    if (!address) return;
    setCollectionsLoading(true);
    try {
      // Fetch all three in parallel:
      // 1. Collections I created
      // 2. All public collections (anyone can mint)
      // 3. Collections where I'm a collaborator
      const [ownedRes, publicRes, collabRes] = await Promise.all([
        collectionsApi.getAll({ creator: address, limit: 100 }),
        collectionsApi.getAll({ visibility: 'public', limit: 100 }),
        collectionsApi.getAll({ collaborator: address, limit: 100 }),
      ]);

      // Build a map keyed by address so we can deduplicate.
      // Priority: owner > collaborator > public
      // (a collection you own should show as "Mine" not "Public" even if it's public)
      const map = new Map<string, LabelledCollection>();

      // Public first (lowest priority — gets overwritten if I own/collab it)
      for (const col of publicRes.data) {
        map.set(col.address, { ...col, role: 'public' });
      }

      // Collaborator (overwrites public)
      for (const col of collabRes.data) {
        map.set(col.address, { ...col, role: 'collaborator' });
      }

      // Owner (highest priority — always wins)
      for (const col of ownedRes.data) {
        map.set(col.address, { ...col, role: 'owner' });
      }

      // Sort: owner first, then collaborator, then public; alphabetically within each group
      const sorted = [...map.values()].sort((a, b) => {
        const order: Record<CollectionRole, number> = { owner: 0, collaborator: 1, public: 2 };
        if (order[a.role] !== order[b.role]) return order[a.role] - order[b.role];
        return a.name.localeCompare(b.name);
      });

      setCollections(sorted);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setCollectionsLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  // ── Wagmi write + receipt ─────────────────────────────────────────────────
  const { data: hash, writeContract } = useWriteContract();

  const { data: receipt, isSuccess: isConfirmed, isError: isFailed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt || !isConfirmed) return;
    try {
      const logs = parseEventLogs({
        abi: NFT_COLLECTION_ABI as readonly unknown[] as readonly [{
          type: 'event'; name: 'NFTMinted'; inputs: readonly [
            { name: 'minter';   type: 'address'; indexed: true  },
            { name: 'tokenId';  type: 'uint256'; indexed: true  },
            { name: 'tokenURI'; type: 'string';  indexed: false },
            { name: 'category'; type: 'string';  indexed: false },
          ];
        }],
        logs: receipt.logs,
        eventName: 'NFTMinted',
      });
      const mintEvent = logs[0];
      if (!mintEvent) throw new Error('NFTMinted event not found');
      setTokenId(mintEvent.args.tokenId);
      setMintStep('success');
    } catch (err) {
      console.error('Failed to parse mint event:', err);
      setErrorMessage('Mint succeeded but failed to read token ID.');
      setMintStep('error');
    }
  }, [receipt, isConfirmed]);

  useEffect(() => {
    if (isFailed) {
      setErrorMessage('Transaction failed onchain. Check Etherscan for details.');
      setMintStep('error');
    }
  }, [isFailed]);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFileSelect = (selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setErrorMessage('Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, or WebM.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File too large. Maximum is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setErrorMessage('');
    setFile(selectedFile);
    setIsVideo(selectedFile.type.startsWith('video/'));
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  };
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  // ── Properties ────────────────────────────────────────────────────────────

  const addProperty    = () => setProperties(p => [...p, { id: Date.now().toString(), trait_type: '', value: '' }]);
  const removeProperty = (id: string) => setProperties(p => p.filter(prop => prop.id !== id));
  const updateProperty = (id: string, field: keyof Omit<NFTProperty, 'id'>, value: string) =>
    setProperties(p => p.map(prop => prop.id === id ? { ...prop, [field]: value } : prop));

  const handleInputChange = (field: keyof NFTFormData, value: string) => {
    if (field === 'category' && value !== 'other') setCustomCategory('');
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Mint ──────────────────────────────────────────────────────────────────

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) { setErrorMessage('Please connect your wallet first.'); return; }
    if (!file || !formData.name || !formData.collection) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const finalCategory =
      formData.category === 'other' && customCategory.trim()
        ? customCategory.trim().toLowerCase()
        : formData.category || 'other';

    try {
      setErrorMessage('');
      setMintStep('uploading');

      const filteredAttributes = properties
        .filter(p => p.trait_type && p.value)
        .map(p => ({ trait_type: p.trait_type, value: p.value }));

      const metadataURI = await uploadNFTToPinata(file, {
        name: formData.name,
        description: formData.description,
        attributes: filteredAttributes,
        isVideo,
      });

      setMintStep('minting');

      writeContract({
        address: formData.collection as `0x${string}`,
        abi: NFT_COLLECTION_ABI,
        functionName: 'mintNFT',
        args: [metadataURI, finalCategory],
      }, {
        onError: (err) => {
          console.error('Contract write error:', err);
          setErrorMessage(err.message || 'Transaction rejected or failed.');
          setMintStep('error');
        },
      });
    } catch (err) {
      console.error('Mint error:', err);
      setErrorMessage('Failed to upload to IPFS or send transaction. Please try again.');
      setMintStep('error');
    }
  };

  const handleReset = () => {
    setFile(null); setFilePreview(''); setIsVideo(false);
    setProperties([]);
    setFormData({ name: '', description: '', category: '', collection: '' });
    setCustomCategory('');
    setMintStep('form');
    setErrorMessage('');
    setTokenId(null);
  };

  // ── Loading / Success / Error states ─────────────────────────────────────

  if (mintStep === 'uploading' || mintStep === 'minting') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4 max-w-md w-full">
          <Loader2 size={48} className="animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-main">
            {mintStep === 'uploading' ? 'Uploading to IPFS...' : 'Minting NFT...'}
          </h2>
          <p className="text-muted text-sm">
            {mintStep === 'uploading'
              ? 'Uploading your file and metadata to Pinata/IPFS.'
              : 'Confirm the transaction in your wallet.'}
          </p>
          {hash && (
            <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
              View on Etherscan <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (mintStep === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4 max-w-md w-full">
          <CheckCircle size={48} className="text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-main">NFT Minted!</h2>
          <p className="text-muted text-sm">
            <strong className="text-main">{formData.name}</strong> has been minted
            {tokenId !== null && <> with token ID <strong className="text-main">#{tokenId.toString()}</strong></>}.
          </p>
          {hash && (
            <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
              View transaction <ExternalLink size={14} />
            </a>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="primary" size="md" sxclass="px-6" onClick={handleReset}>Mint another NFT</Button>
            <Link to="/dashboard">
              <Button variant="outline" size="md" sxclass="px-6">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (mintStep === 'error') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4 max-w-md w-full">
          <AlertCircle size={48} className="text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-main">Something went wrong</h2>
          <p className="text-red-500 text-sm">{errorMessage}</p>
          <Button variant="outline" size="md" sxclass="px-6" onClick={handleReset}>Try again</Button>
        </div>
      </div>
    );
  }

  // ── Selected collection info (shown below the grid) ───────────────────────
  const selectedCollection = collections.find(c => c.address === formData.collection);

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-main mb-2 mt-5">Create New NFT</h1>
          <p className="text-muted text-sm sm:text-base max-w-2xl mx-auto">
            Upload your digital artwork or video and mint it to an NFT collection on Sepolia testnet
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleMint} className="grid grid-cols-1 gap-6 lg:gap-8">

          {/* ── Upload ── */}
          <div className="space-y-6">
            <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
              <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Upload File
              </h3>
              <div
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging ? 'border-primary bg-blue-50' : 'border-muted hover:border-primary hover:bg-background'
                }`}
              >
                <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileInputChange} className="hidden" />
                {filePreview ? (
                  <div className="space-y-4">
                    {isVideo
                      ? <video src={filePreview} controls className="mx-auto max-h-64 rounded-lg shadow-md" />
                      : <img src={filePreview} alt="Preview" className="mx-auto max-h-64 rounded-lg shadow-md" />
                    }
                    <p className="text-sm text-muted">{file?.name}</p>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(''); setIsVideo(false); }}
                      className="text-red-500 hover:text-red-700 text-sm font-medium">
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 mx-auto">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <Film className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-main">Drop your file here</p>
                      <p className="text-sm text-muted mt-1">or click to browse files</p>
                      <p className="text-xs text-muted mt-2">
                        Images: JPG, PNG, GIF, WebP · Videos: MP4, WebM (Max {MAX_FILE_SIZE_MB}MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            {filePreview && (
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" /> Preview
                </h3>
                <div className="bg-background rounded-xl p-4">
                  <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                    {isVideo
                      ? <video src={filePreview} controls className="w-full h-48 sm:h-56 object-cover" />
                      : <img src={filePreview} alt="NFT Preview" className="w-full h-48 sm:h-56 object-cover" />
                    }
                    <div className="p-4 space-y-2">
                      <h4 className="font-semibold text-main truncate">{formData.name || 'Untitled NFT'}</h4>
                      <p className="text-sm text-muted line-clamp-2">{formData.description || 'No description provided'}</p>
                      <div className="flex justify-between items-center pt-2 border-t border-muted">
                        <span className="text-sm text-muted">Network</span>
                        <span className="font-semibold text-main text-sm">Sepolia Testnet</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Form fields ── */}
          <div className="space-y-6">

            {/* Basic info */}
            <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
              <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">NFT Name *</label>
                  <Input placeholder="Enter NFT name" value={formData.name} bgColor="bg-background"
                    onChange={(e) => handleInputChange('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Description</label>
                  <Input placeholder="Describe your NFT" value={formData.description} bgColor="bg-background"
                    type="textarea" onChange={(e) => handleInputChange('description', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button key={category.value} type="button"
                          onClick={() => handleInputChange('category', category.value)}
                          className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 ${
                            formData.category === category.value
                              ? 'border-primary bg-primary text-white'
                              : 'border-muted hover:border-primary text-muted'
                          }`}>
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{category.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {formData.category === 'other' && (
                    <div className="mt-3">
                      <Input placeholder="Describe your category (e.g. 3D Art, Memes, Fashion...)"
                        value={customCategory} bgColor="bg-background"
                        onChange={(e) => setCustomCategory(e.target.value)} />
                      <p className="text-xs text-muted mt-1">Leave blank to store as "other"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Collection picker ── */}
            <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-main flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" /> Collection *
                </h3>
                <Link to="/dashboard/collections/create"
                  className="text-primary text-sm hover:underline flex items-center gap-1">
                  <Plus size={14} /> New Collection
                </Link>
              </div>
              <p className="text-muted text-sm mb-4">
                Choose a collection to mint into. You can mint into your own collections, public collections, or collections where you're a collaborator.
              </p>

              {collectionsLoading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading collections...</span>
                </div>
              )}

              {!collectionsLoading && collections.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <Layers size={32} className="text-muted mx-auto" />
                  <p className="text-muted text-sm">No collections available. Create your own or wait to be added as a collaborator.</p>
                  <Link to="/dashboard/collections/create">
                    <Button variant="outline" size="md" sxclass="px-5">
                      <Plus size={16} /> Create your first collection
                    </Button>
                  </Link>
                </div>
              )}

              {!collectionsLoading && collections.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {collections.map((col) => {
                    const isSelected = formData.collection === col.address;
                    return (
                      <button key={col._id} type="button"
                        onClick={() => handleInputChange('collection', col.address)}
                        className={`p-4 rounded-lg border transition-all duration-200 flex items-start gap-3 text-left ${
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-muted text-main hover:border-primary'
                        }`}>
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'bg-white/20' : 'bg-primary/10'
                        }`}>
                          <Layers size={20} className={isSelected ? 'text-white' : 'text-primary'} />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          {/* Name + role badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-main'}`}>
                              {col.name}
                              <span className={`ml-1 text-xs font-normal ${isSelected ? 'text-white/70' : 'text-muted'}`}>
                                ({col.symbol})
                              </span>
                            </p>
                          </div>

                          {/* Badges row */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {!isSelected && <RoleBadge role={col.role} />}
                            {!isSelected && <AccessBadge isPublic={!!col.publicMintEnabled} />}
                          </div>

                          {/* Creator address (only for non-owned collections) */}
                          {col.role !== 'owner' && (
                            <p className={`text-xs font-mono mt-1 ${isSelected ? 'text-white/60' : 'text-muted'}`}>
                              by {col.creator.slice(0, 6)}...{col.creator.slice(-4)}
                            </p>
                          )}

                          {/* Contract address */}
                          <p className={`text-xs font-mono mt-0.5 ${isSelected ? 'text-white/60' : 'text-muted'}`}>
                            {col.address.slice(0, 6)}...{col.address.slice(-4)}
                          </p>

                          {/* Mint price */}
                          {col.mintPrice && col.mintPrice !== '0' && (
                            <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-muted'}`}>
                              Mint price: {parseFloat(formatEther(BigInt(col.mintPrice))).toFixed(4)} ETH
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected collection detail strip */}
              {selectedCollection && (
                <div className="mt-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-main">{selectedCollection.name}</p>
                    <p className="text-xs text-muted">
                      {selectedCollection.maxSupply} max supply · {Number(selectedCollection.maxPerWallet) === 0 ? 'No per-wallet limit' : `${selectedCollection.maxPerWallet} per wallet`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={selectedCollection.role} />
                    <AccessBadge isPublic={!!selectedCollection.publicMintEnabled} />
                  </div>
                </div>
              )}
            </div>

            {/* Properties */}
            <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-main flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" /> Properties
                </h3>
                <Button type="button" onClick={addProperty} size="md" sxclass="px-4">
                  <Plus className="w-4 h-4" /> Add Property
                </Button>
              </div>
              <div className="space-y-3">
                {properties.map((property) => (
                  <div key={property.id} className="flex gap-3">
                    <input type="text" placeholder="Property name" value={property.trait_type}
                      onChange={(e) => updateProperty(property.id, 'trait_type', e.target.value)}
                      className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    <input type="text" placeholder="Value" value={property.value}
                      onChange={(e) => updateProperty(property.id, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    <button type="button" onClick={() => removeProperty(property.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {properties.length === 0 && (
                  <p className="text-muted text-sm text-center py-4">
                    No properties added yet. Click "Add Property" to get started.
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <Button type="submit"
              disabled={!file || !formData.name || !formData.collection || !isConnected}
              size="md" fullWidth>
              Mint NFT
            </Button>

            <p className="text-xs text-muted text-center">
              This will mint an ERC-721 NFT on Sepolia testnet. Make sure your wallet is connected to Sepolia.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNFTPage;



// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import type { ChangeEvent, DragEvent } from 'react';
// import {
//   Upload,
//   Image as ImageIcon,
//   Plus,
//   X,
//   Eye,
//   Tag,
//   FileText,
//   Palette,
//   Layers,
//   Loader2,
//   CheckCircle,
//   AlertCircle,
//   ExternalLink,
//   Film,
//   Gamepad2,
//   Trophy,
//   Music,
//   Camera,
//   Video,
//   Wrench,
//   Dumbbell,
//   Globe
// } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
// import { parseEventLogs } from 'viem';
// import { uploadNFTToPinata } from '../utils/ipfs';
// import { NFT_COLLECTION_ABI } from '../lib/abi/NFTCollection';
// // import { CONTRACT_ADDRESSES } from '../lib/config';
// import Input from '../components/inputs/Input';
// import Button from '../components/button/Button';
// import { collectionsApi, type Collection } from '../utils/apiClient';

// // ── Types ────────────────────────────────────────────────────────────────────

// interface NFTProperty {
//   id: string;
//   trait_type: string;
//   value: string;
// }

// interface NFTFormData {
//   name: string;
//   description: string;
//   category: string;
//   collection: string;
// }

// type MintStep = 'form' | 'uploading' | 'minting' | 'success' | 'error';

// // ── Constants ────────────────────────────────────────────────────────────────

// const ACCEPTED_TYPES = [
//   'image/jpeg', 'image/png', 'image/gif', 'image/webp',
//   'video/mp4', 'video/webm', 'video/quicktime',
// ];
// const MAX_FILE_SIZE_MB = 50;

// const CATEGORIES = [
//   { value: 'gaming',         label: 'Gaming',         icon: Gamepad2 },
//   { value: 'art',            label: 'Art',             icon: Palette  },
//   { value: 'collectibles',   label: 'Collectibles',    icon: Trophy   },
//   { value: 'music',          label: 'Music',           icon: Music    },
//   { value: 'photography',    label: 'Photography',     icon: Camera   },
//   { value: 'video',          label: 'Video',           icon: Video    },
//   { value: 'utility',        label: 'Utility',         icon: Wrench   },
//   { value: 'sports',         label: 'Sports',          icon: Dumbbell },
//   { value: 'virtual_worlds', label: 'Virtual Worlds',  icon: Globe    },
//   { value: 'other',          label: 'Other',           icon: Layers   },
// ];

// // ── Component ────────────────────────────────────────────────────────────────

// const CreateNFTPage: React.FC = () => {
//   const { address, isConnected } = useAccount();

//   // File state
//   const [file, setFile]             = useState<File | null>(null);
//   const [filePreview, setFilePreview] = useState<string>('');
//   const [isVideo, setIsVideo]       = useState(false);
//   const [isDragging, setIsDragging] = useState(false);
//   const fileInputRef                = useRef<HTMLInputElement>(null);

//   // Form state
//   const [properties, setProperties] = useState<NFTProperty[]>([]);
//   const [formData, setFormData]     = useState<NFTFormData>({
//     name: '', description: '', category: '', collection: '',
//   });
//   const [customCategory, setCustomCategory] = useState('');

//   // Mint state
//   const [mintStep, setMintStep]       = useState<MintStep>('form');
//   const [errorMessage, setErrorMessage] = useState('');
//   const [tokenId, setTokenId]         = useState<bigint | null>(null);

//   // ── Collections from backend ─────────────────────────────────────────────
//   // FIX: Replaced useReadContract + useReadContracts chain reads with a single
//   // backend API call. Name and symbol are already in MongoDB — no need to
//   // batch-read them from the contract on every render.
//   const [collections, setCollections]         = useState<Collection[]>([]);
//   const [collectionsLoading, setCollectionsLoading] = useState(false);

//   const fetchCollections = useCallback(async () => {
//     if (!address) return;
//     setCollectionsLoading(true);
//     try {
//       const res = await collectionsApi.getAll({ creator: address });
//       setCollections(res.data);
//     } catch (err) {
//       console.error('Failed to fetch collections:', err);
//     } finally {
//       setCollectionsLoading(false);
//     }
//   }, [address]);

//   useEffect(() => {
//     fetchCollections();
//   }, [fetchCollections]);

//   // ── Wagmi write + receipt ────────────────────────────────────────────────
//   const { data: hash, writeContract } = useWriteContract();

//   const { data: receipt, isSuccess: isConfirmed, isError: isFailed } =
//     useWaitForTransactionReceipt({ hash });

//   // Parse NFTMinted event on confirmation
//   useEffect(() => {
//     if (!receipt || !isConfirmed) return;
//     try {
//       const logs = parseEventLogs({
//         abi: NFT_COLLECTION_ABI as readonly unknown[] as readonly [{
//           type: 'event'; name: 'NFTMinted'; inputs: readonly [
//             { name: 'minter';   type: 'address'; indexed: true  },
//             { name: 'tokenId';  type: 'uint256'; indexed: true  },
//             { name: 'tokenURI'; type: 'string';  indexed: false },
//             { name: 'category'; type: 'string';  indexed: false },
//           ];
//         }],
//         logs: receipt.logs,
//         eventName: 'NFTMinted',
//       });

//       const mintEvent = logs[0];
//       if (!mintEvent) throw new Error('NFTMinted event not found');
//       setTokenId(mintEvent.args.tokenId);
//       setMintStep('success');
//     } catch (err) {
//       console.error('Failed to parse mint event:', err);
//       setErrorMessage('Mint succeeded but failed to read token ID.');
//       setMintStep('error');
//     }
//   }, [receipt, isConfirmed]);

//   useEffect(() => {
//     if (isFailed) {
//       setErrorMessage('Transaction failed onchain. Check Etherscan for details.');
//       setMintStep('error');
//     }
//   }, [isFailed]);

//   // ── File handling ────────────────────────────────────────────────────────

//   const handleFileSelect = (selectedFile: File) => {
//     if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
//       setErrorMessage('Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, or WebM.');
//       return;
//     }
//     if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
//       setErrorMessage(`File too large. Maximum is ${MAX_FILE_SIZE_MB}MB.`);
//       return;
//     }
//     setErrorMessage('');
//     setFile(selectedFile);
//     setIsVideo(selectedFile.type.startsWith('video/'));
//     const reader = new FileReader();
//     reader.onload = (e) => setFilePreview(e.target?.result as string);
//     reader.readAsDataURL(selectedFile);
//   };

//   const handleDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
//   const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
//   const handleDrop      = (e: DragEvent<HTMLDivElement>) => {
//     e.preventDefault(); setIsDragging(false);
//     if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
//   };
//   const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
//   };

//   // ── Properties ───────────────────────────────────────────────────────────

//   const addProperty    = () => setProperties(p => [...p, { id: Date.now().toString(), trait_type: '', value: '' }]);
//   const removeProperty = (id: string) => setProperties(p => p.filter(prop => prop.id !== id));
//   const updateProperty = (id: string, field: keyof Omit<NFTProperty, 'id'>, value: string) =>
//     setProperties(p => p.map(prop => prop.id === id ? { ...prop, [field]: value } : prop));

//   const handleInputChange = (field: keyof NFTFormData, value: string) => {
//     if (field === 'category' && value !== 'other') setCustomCategory('');
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   // ── Mint ─────────────────────────────────────────────────────────────────

//   const handleMint = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!isConnected || !address) { setErrorMessage('Please connect your wallet first.'); return; }
//     if (!file || !formData.name || !formData.collection) {
//       setErrorMessage('Please fill in all required fields.');
//       return;
//     }

//     const finalCategory =
//       formData.category === 'other' && customCategory.trim()
//         ? customCategory.trim().toLowerCase()
//         : formData.category || 'other';

//     try {
//       setErrorMessage('');
//       setMintStep('uploading');

//       const filteredAttributes = properties
//         .filter(p => p.trait_type && p.value)
//         .map(p => ({ trait_type: p.trait_type, value: p.value }));

//       const metadataURI = await uploadNFTToPinata(file, {
//         name: formData.name,
//         description: formData.description,
//         attributes: filteredAttributes,
//         isVideo,
//       });

//       setMintStep('minting');

//       writeContract({
//         address: formData.collection as `0x${string}`,
//         abi: NFT_COLLECTION_ABI,
//         functionName: 'mintNFT',
//         args: [metadataURI, finalCategory],
//       }, {
//         onError: (err) => {
//           console.error('Contract write error:', err);
//           setErrorMessage(err.message || 'Transaction rejected or failed.');
//           setMintStep('error');
//         },
//       });
//     } catch (err) {
//       console.error('Mint error:', err);
//       setErrorMessage('Failed to upload to IPFS or send transaction. Please try again.');
//       setMintStep('error');
//     }
//   };

//   const handleReset = () => {
//     setFile(null); setFilePreview(''); setIsVideo(false);
//     setProperties([]);
//     setFormData({ name: '', description: '', category: '', collection: '' });
//     setCustomCategory('');
//     setMintStep('form');
//     setErrorMessage('');
//     setTokenId(null);
//   };

//   // ── Loading / Success / Error overlays ───────────────────────────────────

//   if (mintStep === 'uploading' || mintStep === 'minting') {
//     return (
//       <div className="min-h-[60vh] flex items-center justify-center px-4">
//         <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4 max-w-md w-full">
//           <Loader2 size={48} className="animate-spin text-primary mx-auto" />
//           <h2 className="text-xl font-semibold text-main">
//             {mintStep === 'uploading' ? 'Uploading to IPFS...' : 'Minting NFT...'}
//           </h2>
//           <p className="text-muted text-sm">
//             {mintStep === 'uploading'
//               ? 'Uploading your file and metadata to Pinata/IPFS.'
//               : 'Confirm the transaction in your wallet.'}
//           </p>
//           {hash && (
//             <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
//               className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
//               View on Etherscan <ExternalLink size={14} />
//             </a>
//           )}
//         </div>
//       </div>
//     );
//   }

//   if (mintStep === 'success') {
//     return (
//       <div className="min-h-[60vh] flex items-center justify-center px-4">
//         <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4 max-w-md w-full">
//           <CheckCircle size={48} className="text-green-500 mx-auto" />
//           <h2 className="text-xl font-semibold text-main">NFT Minted!</h2>
//           <p className="text-muted text-sm">
//             <strong className="text-main">{formData.name}</strong> has been minted
//             {tokenId !== null && <> with token ID <strong className="text-main">#{tokenId.toString()}</strong></>}.
//           </p>
//           {hash && (
//             <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
//               className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
//               View transaction <ExternalLink size={14} />
//             </a>
//           )}
//           <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
//             <Button variant="primary" size="md" sxclass="px-6" onClick={handleReset}>
//               Mint another NFT
//             </Button>
//             <Link to="/dashboard">
//               <Button variant="outline" size="md" sxclass="px-6">Back to Dashboard</Button>
//             </Link>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (mintStep === 'error') {
//     return (
//       <div className="min-h-[60vh] flex items-center justify-center px-4">
//         <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4 max-w-md w-full">
//           <AlertCircle size={48} className="text-red-500 mx-auto" />
//           <h2 className="text-xl font-semibold text-main">Something went wrong</h2>
//           <p className="text-red-500 text-sm">{errorMessage}</p>
//           <Button variant="outline" size="md" sxclass="px-6" onClick={handleReset}>Try again</Button>
//         </div>
//       </div>
//     );
//   }

//   // ── Main form ─────────────────────────────────────────────────────────────

//   return (
//     <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-4xl mx-auto">
//         <div className="text-center mb-8">
//           <h1 className="text-3xl sm:text-4xl font-bold text-main mb-2 mt-5">Create New NFT</h1>
//           <p className="text-muted text-sm sm:text-base max-w-2xl mx-auto">
//             Upload your digital artwork or video and mint it to an NFT collection on Sepolia testnet
//           </p>
//         </div>

//         {errorMessage && (
//           <div className="mb-6 flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
//             <AlertCircle size={16} />
//             {errorMessage}
//           </div>
//         )}

//         <form onSubmit={handleMint} className="grid grid-cols-1 gap-6 lg:gap-8">

//           {/* ── Upload ── */}
//           <div className="space-y-6">
//             <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
//               <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
//                 <Upload className="w-5 h-5 text-primary" />
//                 Upload File
//               </h3>
//               <div
//                 onDragOver={handleDragOver}
//                 onDragLeave={handleDragLeave}
//                 onDrop={handleDrop}
//                 onClick={() => fileInputRef.current?.click()}
//                 className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
//                   isDragging ? 'border-primary bg-blue-50' : 'border-muted hover:border-primary hover:bg-background'
//                 }`}
//               >
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept="image/*,video/mp4,video/webm,video/quicktime"
//                   onChange={handleFileInputChange}
//                   className="hidden"
//                 />
//                 {filePreview ? (
//                   <div className="space-y-4">
//                     {isVideo
//                       ? <video src={filePreview} controls className="mx-auto max-h-64 rounded-lg shadow-md" />
//                       : <img src={filePreview} alt="Preview" className="mx-auto max-h-64 rounded-lg shadow-md" />
//                     }
//                     <p className="text-sm text-muted">{file?.name}</p>
//                     <button
//                       type="button"
//                       onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(''); setIsVideo(false); }}
//                       className="text-red-500 hover:text-red-700 text-sm font-medium"
//                     >
//                       Remove file
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     <div className="flex items-center justify-center gap-3 mx-auto">
//                       <ImageIcon className="w-8 h-8 text-gray-400" />
//                       <Film className="w-8 h-8 text-gray-400" />
//                     </div>
//                     <div>
//                       <p className="text-lg font-medium text-main">Drop your file here</p>
//                       <p className="text-sm text-muted mt-1">or click to browse files</p>
//                       <p className="text-xs text-muted mt-2">
//                         Images: JPG, PNG, GIF, WebP · Videos: MP4, WebM (Max {MAX_FILE_SIZE_MB}MB)
//                       </p>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Preview card */}
//             {filePreview && (
//               <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
//                 <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
//                   <Eye className="w-5 h-5 text-primary" />
//                   Preview
//                 </h3>
//                 <div className="bg-background rounded-xl p-4">
//                   <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
//                     {isVideo
//                       ? <video src={filePreview} controls className="w-full h-48 sm:h-56 object-cover" />
//                       : <img src={filePreview} alt="NFT Preview" className="w-full h-48 sm:h-56 object-cover" />
//                     }
//                     <div className="p-4 space-y-2">
//                       <h4 className="font-semibold text-main truncate">{formData.name || 'Untitled NFT'}</h4>
//                       <p className="text-sm text-muted line-clamp-2">{formData.description || 'No description provided'}</p>
//                       <div className="flex justify-between items-center pt-2 border-t border-muted">
//                         <span className="text-sm text-muted">Network</span>
//                         <span className="font-semibold text-main text-sm">Sepolia Testnet</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* ── Form fields ── */}
//           <div className="space-y-6">

//             {/* Basic info */}
//             <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
//               <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
//                 <FileText className="w-5 h-5 text-primary" />
//                 Basic Information
//               </h3>
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-muted mb-2">NFT Name *</label>
//                   <Input placeholder="Enter NFT name" value={formData.name} bgColor="bg-background"
//                     onChange={(e) => handleInputChange('name', e.target.value)} />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-muted mb-2">Description</label>
//                   <Input placeholder="Describe your NFT" value={formData.description} bgColor="bg-background"
//                     type="textarea" onChange={(e) => handleInputChange('description', e.target.value)} />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-muted mb-2">Category</label>
//                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                     {CATEGORIES.map((category) => {
//                       const Icon = category.icon;
//                       return (
//                         <button
//                           key={category.value}
//                           type="button"
//                           onClick={() => handleInputChange('category', category.value)}
//                           className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 ${
//                             formData.category === category.value
//                               ? 'border-primary bg-primary text-white'
//                               : 'border-muted hover:border-primary text-muted'
//                           }`}
//                         >
//                           <Icon className="w-5 h-5" />
//                           <span className="text-xs font-medium">{category.label}</span>
//                         </button>
//                       );
//                     })}
//                   </div>
//                   {formData.category === 'other' && (
//                     <div className="mt-3">
//                       <Input
//                         placeholder="Describe your category (e.g. 3D Art, Memes, Fashion...)"
//                         value={customCategory}
//                         bgColor="bg-background"
//                         onChange={(e) => setCustomCategory(e.target.value)}
//                       />
//                       <p className="text-xs text-muted mt-1">Leave blank to store as "other"</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Collection picker — now reads from backend */}
//             <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
//               <div className="flex items-center justify-between mb-2">
//                 <h3 className="text-lg font-semibold text-main flex items-center gap-2">
//                   <Layers className="w-5 h-5 text-primary" />
//                   Collection *
//                 </h3>
//                 <Link to="/dashboard/collections/create"
//                   className="text-primary text-sm hover:underline flex items-center gap-1">
//                   <Plus size={14} /> New Collection
//                 </Link>
//               </div>
//               <p className="text-muted text-sm mb-4">Choose which collection to mint this NFT into.</p>

//               {/* Loading */}
//               {collectionsLoading && (
//                 <div className="flex items-center justify-center py-8 gap-2 text-muted">
//                   <Loader2 size={18} className="animate-spin" />
//                   <span className="text-sm">Loading collections...</span>
//                 </div>
//               )}

//               {/* Empty state */}
//               {!collectionsLoading && collections.length === 0 && (
//                 <div className="text-center py-8 space-y-3">
//                   <Layers size={32} className="text-muted mx-auto" />
//                   <p className="text-muted text-sm">You don't have any collections yet.</p>
//                   <Link to="/dashboard/collections/create">
//                     <Button variant="outline" size="md" sxclass="px-5">
//                       <Plus size={16} /> Create your first collection
//                     </Button>
//                   </Link>
//                 </div>
//               )}

//               {/* Collections grid — name + symbol come from backend, no chain reads needed */}
//               {!collectionsLoading && collections.length > 0 && (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                   {collections.map((col) => {
//                     const isSelected = formData.collection === col.address;
//                     return (
//                       <button
//                         key={col._id}
//                         type="button"
//                         onClick={() => handleInputChange('collection', col.address)}
//                         className={`p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 text-left ${
//                           isSelected
//                             ? 'border-primary bg-primary text-white'
//                             : 'border-muted text-main hover:border-primary'
//                         }`}
//                       >
//                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
//                           isSelected ? 'bg-white/20' : 'bg-primary/10'
//                         }`}>
//                           <Layers size={20} className={isSelected ? 'text-white' : 'text-primary'} />
//                         </div>
//                         <div className="min-w-0">
//                           <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-main'}`}>
//                             {col.name}
//                             <span className={`ml-1 text-xs font-normal ${isSelected ? 'text-white/70' : 'text-muted'}`}>
//                               ({col.symbol})
//                             </span>
//                           </p>
//                           <p className={`text-xs font-mono mt-0.5 ${isSelected ? 'text-white/60' : 'text-muted'}`}>
//                             {col.address.slice(0, 6)}...{col.address.slice(-4)}
//                           </p>
//                         </div>
//                       </button>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>

//             {/* Properties */}
//             <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold text-main flex items-center gap-2">
//                   <Tag className="w-5 h-5 text-primary" />
//                   Properties
//                 </h3>
//                 <Button type="button" onClick={addProperty} size="md" sxclass="px-4">
//                   <Plus className="w-4 h-4" />
//                   Add Property
//                 </Button>
//               </div>
//               <div className="space-y-3">
//                 {properties.map((property) => (
//                   <div key={property.id} className="flex gap-3">
//                     <input
//                       type="text"
//                       placeholder="Property name"
//                       value={property.trait_type}
//                       onChange={(e) => updateProperty(property.id, 'trait_type', e.target.value)}
//                       className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
//                     />
//                     <input
//                       type="text"
//                       placeholder="Value"
//                       value={property.value}
//                       onChange={(e) => updateProperty(property.id, 'value', e.target.value)}
//                       className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => removeProperty(property.id)}
//                       className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   </div>
//                 ))}
//                 {properties.length === 0 && (
//                   <p className="text-muted text-sm text-center py-4">
//                     No properties added yet. Click "Add Property" to get started.
//                   </p>
//                 )}
//               </div>
//             </div>

//             {/* Submit */}
//             <Button
//               type="submit"
//               disabled={!file || !formData.name || !formData.collection || !isConnected}
//               size="md"
//               fullWidth
//             >
//               Mint NFT
//             </Button>

//             <p className="text-xs text-muted text-center">
//               This will mint an ERC-721 NFT on Sepolia testnet. Make sure your wallet is connected to Sepolia.
//             </p>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default CreateNFTPage;