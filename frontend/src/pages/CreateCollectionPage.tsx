import React, { useState, useEffect } from 'react';
import { Layers, Plus, Loader2, CheckCircle, AlertCircle, ExternalLink, InfinityIcon } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { decodeEventLog } from 'viem';
import { NFT_COLLECTION_FACTORY_ABI } from '../lib/abi/NFTCollectionFactory';
import { CONTRACT_ADDRESSES } from '../lib/config';
import Input from '../components/inputs/Input';
import Button from '../components/button/Button';
import { Link } from 'react-router-dom';

type Step = 'form' | 'deploying' | 'success' | 'error';

// Explicit typed ABI for the CollectionCreated event.
// Using `as const` is critical — it tells TypeScript the exact shape
// of the event so that decoded.args and decoded.eventName are fully typed.
// Without `as const`, TypeScript returns a generic Log type and
// .eventName / .args do not exist on it (causing the TS errors).
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

const CreateCollectionPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [maxSupply, setMaxSupply] = useState('');
  const [maxPerWallet, setMaxPerWallet] = useState('0');

  const [step, setStep] = useState<Step>('form');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deployedAddress, setDeployedAddress] = useState('');

  // Read user's existing collections to display at the bottom
  const { data: userCollections, refetch: refetchCollections } = useReadContract({
    address: CONTRACT_ADDRESSES.nftCollectionFactory as `0x${string}`,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'getUserCollections',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: hash, writeContract, isPending } = useWriteContract();

  const {
    data: receipt,
    isSuccess: isConfirmed,
    isError: isFailed,
  } = useWaitForTransactionReceipt({ hash });

  // Parse CollectionCreated event on confirmation
  useEffect(() => {
    if (!receipt || !isConfirmed) return;

    try {
      let collectionAddr: string | undefined;

      // Loop through every log in the receipt and try to decode each one.
      // We use decodeEventLog with our explicit `as const` ABI so TypeScript
      // fully knows the shape of decoded.eventName and decoded.args.
      // Logs that don't match our event will throw and be skipped via catch.
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
        } catch {
          // This log belongs to a different event — skip it and continue
          continue;
        }
      }

      if (!collectionAddr) throw new Error('CollectionCreated event not found in receipt logs');

      setDeployedAddress(collectionAddr);
      setStep('success');
      refetchCollections();
    } catch (err) {
      console.error('Failed to parse CollectionCreated event:', err);
      setErrorMessage('Transaction succeeded but failed to read collection address.');
      setStep('error');
    }
  }, [receipt, isConfirmed, refetchCollections]);

  // Handle onchain transaction failure (tx submitted but reverted)
  useEffect(() => {
    if (isFailed) {
      setErrorMessage('Transaction failed onchain. Check Etherscan for details.');
      setStep('error');
    }
  }, [isFailed]);

  const handleCreate = () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first.');
      return;
    }
    if (!name.trim() || !symbol.trim()) {
      setErrorMessage('Name and symbol are required.');
      return;
    }
    if (!maxSupply || Number(maxSupply) < 1) {
      setErrorMessage('Max supply must be at least 1.');
      return;
    }
    if (Number(maxPerWallet) < 0) {
      setErrorMessage('Max per wallet cannot be negative.');
      return;
    }

    setErrorMessage('');
    setStep('deploying');

    // createCollection requires 4 args matching the updated contract:
    // createCollection(name_, symbol_, maxSupply_, maxPerWallet_)
    // maxSupply and maxPerWallet must be BigInt because they are uint256 in Solidity
    writeContract({
      address: CONTRACT_ADDRESSES.nftCollectionFactory as `0x${string}`,
      abi: NFT_COLLECTION_FACTORY_ABI,
      functionName: 'createCollection',
      args: [
        name.trim(),
        symbol.trim().toUpperCase(),
        BigInt(maxSupply),
        BigInt(maxPerWallet || '0'),
      ],
    }, {
      // onError catches wallet rejections and RPC errors.
      // writeContract never throws synchronously — errors only come here.
      onError: (err) => {
        console.error('Contract write error:', err);
        setErrorMessage(err.message || 'Transaction rejected or failed.');
        setStep('error');
      },
    });
  };

  const handleReset = () => {
    setName('');
    setSymbol('');
    setMaxSupply('');
    setMaxPerWallet('0');
    setStep('form');
    setErrorMessage('');
    setDeployedAddress('');
  };

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-main mb-2">Create Collection</h1>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            Deploy a new NFT collection contract on Sepolia. Each collection is its own ERC-721 contract where you can mint NFTs.
          </p>
        </div>

        {/* Form step */}
        {step === 'form' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Layers size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-main">Collection Details</h2>
                <p className="text-xs text-muted">This deploys a new smart contract on Sepolia testnet</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Collection Name *</label>
              <Input
                placeholder="e.g. Cosmic Art"
                value={name}
                bgColor="bg-background"
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted mt-1">The public name shown on marketplaces (e.g. "Bored Ape Yacht Club")</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Symbol *</label>
              <Input
                placeholder="e.g. COSM"
                value={symbol}
                bgColor="bg-background"
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted mt-1">A short ticker symbol (e.g. "BAYC"). Usually 3–5 uppercase characters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Max Supply *</label>
              <Input
                placeholder="e.g. 10000"
                value={maxSupply}
                bgColor="bg-background"
                type="number"
                onChange={(e) => setMaxSupply(e.target.value)}
              />
              <p className="text-xs text-muted mt-1">
                The maximum number of NFTs that can ever be minted in this collection. Cannot be changed after deployment.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Max Per Wallet <span className="text-xs font-normal">(optional)</span>
              </label>
              <Input
                placeholder="0"
                value={maxPerWallet}
                bgColor="bg-background"
                type="number"
                onChange={(e) => setMaxPerWallet(e.target.value)}
              />
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <InfinityIcon size={12} />
                Set to <strong className="text-main mx-1">0</strong> for unlimited mints per wallet.
                Otherwise caps how many NFTs one wallet can mint.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
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
              <Plus size={18} />
              Deploy Collection
            </Button>

            {!isConnected && (
              <p className="text-xs text-amber-500 text-center">Connect your wallet to deploy a collection.</p>
            )}
          </div>
        )}

        
        {step === 'deploying' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4">
            <Loader2 size={48} className="animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-main">Deploying Collection...</h2>
            <p className="text-muted text-sm">
              Confirm the transaction in your wallet. This deploys a new ERC-721 contract on Sepolia.
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
        )}        
        {step === 'success' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-main">Collection Deployed!</h2>
            <p className="text-muted text-sm">
              Your collection <strong className="text-main">{name}</strong> ({symbol}) is live on Sepolia.
            </p>
            <div className="bg-background rounded-lg p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted">Contract Address</span>
                <span className="font-mono text-main text-xs truncate max-w-[180px]">{deployedAddress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Max Supply</span>
                <span className="text-main font-medium">{Number(maxSupply).toLocaleString()} NFTs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Max Per Wallet</span>
                <span className="text-main font-medium">
                  {Number(maxPerWallet) === 0 ? 'Unlimited' : maxPerWallet}
                </span>
              </div>
            </div>
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
              <Link to="/dashboard/create">
                <Button variant="primary" size="md" sxclass="px-6">
                  Mint NFT in this collection
                </Button>
              </Link>
              <Button variant="outline" size="md" sxclass="px-6" onClick={handleReset}>
                Create another collection
              </Button>
            </div>
          </div>
        )}        
        {step === 'error' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-main">Something went wrong</h2>
            <p className="text-red-500 text-sm">{errorMessage}</p>
            <Button variant="outline" size="md" sxclass="px-6" onClick={handleReset}>
              Try again
            </Button>
          </div>
        )}       
        {userCollections && (userCollections as string[]).length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-main mb-4">Your Collections</h3>
            <div className="space-y-3">
              {(userCollections as string[]).map((addr, i) => (
                <div
                  key={i}
                  className="bg-surface border border-muted rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Layers size={18} className="text-primary" />
                    </div>
                    <span className="text-sm font-mono text-main truncate">{addr}</span>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex-shrink-0 ml-2"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateCollectionPage;