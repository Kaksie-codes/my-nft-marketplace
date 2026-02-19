import React, { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Eye, 
  Tag,
  FileText,
  Palette,
  Zap,
  Layers,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Film
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEventLogs } from 'viem';
import { uploadNFTToPinata } from '../utils/ipfs';
import { NFT_COLLECTION_ABI } from '../lib/abi/NFTCollection';
import { NFT_COLLECTION_FACTORY_ABI } from '../lib/abi/NFTCollectionFactory';
import { CONTRACT_ADDRESSES } from '../lib/config';
import Input from '../components/inputs/Input';
import Button from '../components/button/Button';

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

// Accepted file types: images + video
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
];
const MAX_FILE_SIZE_MB = 50;

const CreateNFTPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [isVideo, setIsVideo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [properties, setProperties] = useState<NFTProperty[]>([]);
  const [formData, setFormData] = useState<NFTFormData>({
    name: '',
    description: '',
    category: '',
    collection: '',
  });
  const [mintStep, setMintStep] = useState<MintStep>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenId, setTokenId] = useState<bigint | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's collections from the factory
  const { data: userCollections } = useReadContract({
    address: CONTRACT_ADDRESSES.nftCollectionFactory as `0x${string}`,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'getUserCollections',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const collectionAddresses = (userCollections as string[]) || [];

  // Wagmi write + receipt
  const { data: hash, writeContract } = useWriteContract();
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Parse mint event on confirmation
  useEffect(() => {
    if (!receipt || !isConfirmed) return;
    try {
      // Use type assertion to work around ABI not being declared `as const`
      const logs = parseEventLogs({
        abi: NFT_COLLECTION_ABI as readonly unknown[] as readonly [{
          type: 'event'; name: 'NFTMinted'; inputs: readonly [
            { name: 'creator'; type: 'address'; indexed: true },
            { name: 'tokenId'; type: 'uint256'; indexed: true },
            { name: 'tokenURI'; type: 'string'; indexed: false },
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

  const categories = [
    { value: 'art', label: 'Art', icon: Palette },
    { value: 'music', label: 'Music', icon: Zap },
    { value: 'photography', label: 'Photography', icon: ImageIcon },
    { value: 'sports', label: 'Sports', icon: Zap },
    { value: 'collectibles', label: 'Collectibles', icon: Tag },
    { value: 'gaming', label: 'Gaming', icon: Zap },
  ];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

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

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  };

  const addProperty = () => {
    setProperties([...properties, {
      id: Date.now().toString(),
      trait_type: '',
      value: ''
    }]);
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter(prop => prop.id !== id));
  };

  const updateProperty = (id: string, field: keyof Omit<NFTProperty, 'id'>, value: string) => {
    setProperties(properties.map(prop => 
      prop.id === id ? { ...prop, [field]: value } : prop
    ));
  };

  const handleInputChange = (field: keyof NFTFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first.');
      return;
    }
    if (!file || !formData.name || !formData.collection) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      setErrorMessage('');
      setMintStep('uploading');

      // Upload file + metadata to IPFS via Pinata
      const filteredAttributes = properties
        .filter((p) => p.trait_type && p.value)
        .map((p) => ({ trait_type: p.trait_type, value: p.value }));

      const metadataURI = await uploadNFTToPinata(file, {
        name: formData.name,
        description: formData.description,
        attributes: filteredAttributes,
      });

      setMintStep('minting');

      // Call mintNFT on the selected collection contract
      writeContract({
        address: formData.collection as `0x${string}`,
        abi: NFT_COLLECTION_ABI,
        functionName: 'mintNFT',
        args: [metadataURI],
      });
    } catch (err) {
      console.error('Mint error:', err);
      setErrorMessage('Failed to mint NFT. Please try again.');
      setMintStep('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setFilePreview('');
    setIsVideo(false);
    setProperties([]);
    setFormData({ name: '', description: '', category: '', collection: '' });
    setMintStep('form');
    setErrorMessage('');
    setTokenId(null);
  };

  // ── Minting/uploading/success/error overlays ──
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
            <a
              href={`https://sepolia.etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
            >
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
            <a
              href={`https://sepolia.etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
            >
              View transaction <ExternalLink size={14} />
            </a>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="primary" size="md" sxclass="px-6" onClick={handleReset}>
              Mint another NFT
            </Button>
            <Link to="/dashboard">
              <Button variant="outline" size="md" sxclass="px-6">
                Back to Dashboard
              </Button>
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
          <Button variant="outline" size="md" sxclass="px-6" onClick={handleReset}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
      <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto container">
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
            {/* Upload and Preview */}
            <div className="space-y-6">
              {/* File Upload */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload File
                </h3>
      
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-primary bg-blue-50'
                      : 'border-muted hover:border-primary hover:bg-background'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
      
                  {filePreview ? (
                    <div className="space-y-4">
                      {isVideo ? (
                        <video
                          src={filePreview}
                          controls
                          className="mx-auto max-h-64 rounded-lg shadow-md"
                        />
                      ) : (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="mx-auto max-h-64 rounded-lg shadow-md"
                        />
                      )}
                      <p className="text-sm text-muted">{file?.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setFilePreview('');
                          setIsVideo(false);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
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

              {/* Preview card */}
              {filePreview && (
                <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                  <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Preview
                  </h3>
                  <div className="bg-background rounded-xl p-4">
                    <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                      {isVideo ? (
                        <video src={filePreview} controls className="w-full h-48 sm:h-56 object-cover" />
                      ) : (
                        <img src={filePreview} alt="NFT Preview" className="w-full h-48 sm:h-56 object-cover" />
                      )}
                      <div className="p-4 space-y-2">
                        <h4 className="font-semibold text-main truncate">
                          {formData.name || 'Untitled NFT'}
                        </h4>
                        <p className="text-sm text-muted line-clamp-2">
                          {formData.description || 'No description provided'}
                        </p>
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

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Basic Information
                </h3>
      
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      NFT Name *
                    </label>
                    <Input
                      placeholder='Enter NFT name'
                      value={formData.name}
                      bgColor='bg-background'
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Description
                    </label>
                    <Input
                      placeholder="Describe your NFT"
                      value={formData.description}
                      bgColor='bg-background'
                      type='textarea'
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() => handleInputChange('category', category.value)}
                            className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 ${
                              formData.category === category.value
                                ? 'border-primary bg-primary text-white'
                                : 'border-muted hover:border-muted text-muted'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{category.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection picker */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-main flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Collection *
                  </h3>
                  <Link to="/dashboard/collections/create" className="text-primary text-sm hover:underline flex items-center gap-1">
                    <Plus size={14} /> New Collection
                  </Link>
                </div>
                <p className="text-muted text-sm mb-4">Choose which collection to mint this NFT into.</p>

                {collectionAddresses.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <Layers size={32} className="text-muted mx-auto" />
                    <p className="text-muted text-sm">You don't have any collections yet.</p>
                    <Link to="/dashboard/collections/create">
                      <Button variant="outline" size="md" sxclass="px-5">
                        <Plus size={16} /> Create your first collection
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {collectionAddresses.map((addr) => (
                      <button
                        key={addr}
                        type="button"
                        onClick={() => handleInputChange('collection', addr)}
                        className={`p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 text-left ${
                          formData.collection === addr
                            ? 'border-primary bg-primary text-white'
                            : 'border-muted text-main hover:border-primary'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          formData.collection === addr ? 'bg-white/20' : 'bg-primary/10'
                        }`}>
                          <Layers size={20} className={formData.collection === addr ? 'text-white' : 'text-primary'} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-mono truncate ${formData.collection === addr ? 'text-white/80' : 'text-muted'}`}>
                            {addr}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Properties */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-main flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Properties
                  </h3>
                  <Button type="button" onClick={addProperty} size='md' sxclass='px-4'>
                    <Plus className="w-4 h-4" />
                    Add Property
                  </Button>
                </div>
      
                <div className="space-y-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Property name"
                        value={property.trait_type}
                        onChange={(e) => updateProperty(property.id, 'trait_type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={property.value}
                        onChange={(e) => updateProperty(property.id, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeProperty(property.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      >
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
              <Button
                type="submit"
                disabled={!file || !formData.name || !formData.collection || !isConnected}
                size='md'
                fullWidth
              >
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