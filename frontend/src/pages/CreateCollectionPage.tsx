import React, { useState, useEffect } from 'react';
import { Layers, Plus, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEventLogs } from 'viem';
import { NFT_COLLECTION_FACTORY_ABI } from '../lib/abi/NFTCollectionFactory';
import { CONTRACT_ADDRESSES } from '../lib/config';
import Input from '../components/inputs/Input';
import Button from '../components/button/Button';
import { Link } from 'react-router-dom';

type Step = 'form' | 'deploying' | 'success' | 'error';

const CreateCollectionPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');

  // Read user's existing collections
  const { data: userCollections, refetch: refetchCollections } = useReadContract({
    address: CONTRACT_ADDRESSES.nftCollectionFactory as `0x${string}`,
    abi: NFT_COLLECTION_FACTORY_ABI,
    functionName: 'getUserCollections',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Write hook
  const { data: hash, writeContract, isPending } = useWriteContract();

  // Wait for tx confirmation
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt || !isConfirmed) return;

    try {
      const logs = parseEventLogs({
        abi: NFT_COLLECTION_FACTORY_ABI,
        logs: receipt.logs,
      });

      const createEvent = logs.find((log) => log.eventName === 'CollectionCreated');

      if (!createEvent) throw new Error('CollectionCreated event not found');

      const collectionAddr = createEvent.args.collectionAddress as string;
      setDeployedAddress(collectionAddr);
      setStep('success');
      refetchCollections();
    } catch (err) {
      console.error('Failed to parse event:', err);
      setErrorMessage('Transaction succeeded but failed to read collection address.');
      setStep('error');
    }
  }, [receipt, isConfirmed, refetchCollections]);

  const handleCreate = () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first.');
      return;
    }
    if (!name.trim() || !symbol.trim()) {
      setErrorMessage('Name and symbol are required.');
      return;
    }

    setErrorMessage('');
    setStep('deploying');

    try {
      writeContract({
        address: CONTRACT_ADDRESSES.nftCollectionFactory as `0x${string}`,
        abi: NFT_COLLECTION_FACTORY_ABI,
        functionName: 'createCollection',
        args: [name.trim(), symbol.trim().toUpperCase()],
      });
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to send transaction.');
      setStep('error');
    }
  };

  const handleReset = () => {
    setName('');
    setSymbol('');
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
              <p className="text-xs text-muted mt-1">A short ticker symbol (e.g. "BAYC"). Usually 3-5 uppercase characters.</p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                {errorMessage}
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !symbol.trim() || !isConnected || isPending}
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

        {/* Deploying step */}
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

        {/* Success step */}
        {step === 'success' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-muted p-8 text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-main">Collection Deployed!</h2>
            <p className="text-muted text-sm">
              Your collection <strong className="text-main">{name}</strong> ({symbol}) is live on Sepolia.
            </p>
            {deployedAddress && (
              <div className="bg-background rounded-lg p-3 text-sm font-mono text-main break-all">
                {deployedAddress}
              </div>
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

        {/* Error step */}
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

        {/* Existing collections */}
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
