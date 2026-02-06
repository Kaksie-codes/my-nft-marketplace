// modals/MintNFTModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { uploadNFTToPinata, validateImageFile } from '../../utils/ipfs';
import { NFT_COLLECTION_ABI } from '../../lib/abi/NFTCollection';
import { CONTRACT_ADDRESSES } from '../../lib/config';
import { parseEventLogs } from 'viem';


interface MintNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tokenId: bigint) => void;
}

type MintStep = 'upload' | 'minting' | 'success' | 'error';

const MintNFTModal: React.FC<MintNFTModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { address, isConnected } = useAccount();

  // Form state
  const [nftName, setNftName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [attributes, setAttributes] = useState<Array<{ trait_type: string; value: string }>>([
    { trait_type: '', value: '' },
  ]);

  // Process state
  const [currentStep, setCurrentStep] = useState<MintStep>('upload');
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [metadataURI, setMetadataURI] = useState('');

  

  useEffect(() => {
    console.log(metadataURI);
  }, [metadataURI]);

  // Wagmi hooks for minting
  const { data: hash, writeContract } = useWriteContract();

  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

    useEffect(() => {
    if (!receipt || !isConfirmed) return;

    try {
        // Parse all logs using the NFTCollection ABI
        const logs = parseEventLogs({
        abi: NFT_COLLECTION_ABI,
        logs: receipt.logs,
        });

        // Find the NFTMinted event
        const mintEvent = logs.find(
        (log) => log.eventName === 'NFTMinted'
        );

        if (!mintEvent) {
        throw new Error('NFTMinted event not found');
        }

        const realTokenId = mintEvent.args.tokenId as bigint;

        setTokenId(realTokenId);
        setCurrentStep('success');

        onSuccess?.(realTokenId);
    } catch (err) {
        console.error('Failed to parse mint event:', err);
        setErrorMessage('Mint succeeded but failed to read token ID');
        setCurrentStep('error');
    }
    }, [receipt, isConfirmed, onSuccess]);


  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const error = validateImageFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setImageFile(file);
    setErrorMessage('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add/remove attribute fields
  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  // Main minting flow
  const handleMint = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    if (!imageFile || !nftName || !description) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    try {
      setCurrentStep('minting');
      setUploadProgress('Uploading to IPFS...');

      // Step 1: Upload to IPFS
      const filteredAttributes = attributes.filter(
        attr => attr.trait_type && attr.value
      );

      const metadataURI = await uploadNFTToPinata(imageFile, {
        name: nftName,
        description,
        attributes: filteredAttributes,
      });

      setMetadataURI(metadataURI);
      setUploadProgress('IPFS upload complete! Minting NFT...');

      // Step 2: Mint NFT on blockchain
        writeContract({
            address: CONTRACT_ADDRESSES.nftCollection as `0x${string}`,
            abi: NFT_COLLECTION_ABI,
            functionName: 'mintNFT',
            args: [metadataURI],
        });

    } catch (error: unknown) {
      console.error('Minting error:', error);
      setErrorMessage('Failed to mint NFT. Please try again.');
      setCurrentStep('error');
    }
  };


  // Reset modal
  const handleClose = () => {
    setCurrentStep('upload');
    setNftName('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    setAttributes([{ trait_type: '', value: '' }]);
    setUploadProgress('');
    setErrorMessage('');
    setTokenId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentStep === 'upload' && 'Mint New NFT'}
            {currentStep === 'minting' && 'Minting in Progress...'}
            {currentStep === 'success' && 'NFT Minted Successfully!'}
            {currentStep === 'error' && 'Minting Failed'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Form */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Image *
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    imagePreview
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                  }`}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to change image
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF, WebP up to 10MB
                      </p>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* NFT Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  NFT Name *
                </label>
                <input
                  type="text"
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                  placeholder="e.g., Cool Ape #1234"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your NFT..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Attributes (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attributes (Optional)
                </label>
                <div className="space-y-2">
                  {attributes.map((attr, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={attr.trait_type}
                        onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                        placeholder="Trait (e.g., Background)"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                        placeholder="Value (e.g., Blue)"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {attributes.length > 1 && (
                        <button
                          onClick={() => removeAttribute(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addAttribute}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add Attribute
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="text-red-600" size={20} />
                  <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={!imageFile || !nftName || !description}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                Mint NFT
              </button>
            </div>
          )}

          {/* Minting Progress */}
          {currentStep === 'minting' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="animate-spin mx-auto h-16 w-16 text-blue-600" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {uploadProgress}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This may take a few moments...
              </p>
            </div>
          )}

          {/* Success */}
          {currentStep === 'success' && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                NFT Minted Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your NFT has been minted and is now in your wallet.
              </p>
              {tokenId && (
                <p className="text-sm text-gray-500">Token ID: {tokenId.toString()}</p>
              )}
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleClose();
                    // Navigate to listing page (implement this)
                    // navigate(`/list/${tokenId}`);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  List for Sale
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {currentStep === 'error' && (
            <div className="text-center space-y-4 py-8">
              <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Minting Failed
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{errorMessage}</p>
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MintNFTModal;