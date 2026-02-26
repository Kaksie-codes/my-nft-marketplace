import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import {
  ArrowLeft, Tag, Gavel, Clock, CheckCircle,
  AlertCircle, Loader2, ExternalLink, Info,
} from 'lucide-react';
import Button from '../components/button/Button';
import { nftsApi, type NFT, type Listing } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';
import { NFT_COLLECTION_ABI } from '../lib/abi/NFTCollection';
import { CONTRACT_ADDRESSES } from '../lib/config';
import { MARKETPLACE_ABI } from '../lib/abi/Marketplace';

// ── Types ─────────────────────────────────────────────────────────────────────

type ListingType = 'fixed' | 'auction';
type Step = 'form' | 'approving' | 'listing' | 'success' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}


// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = ['Approve', 'List', 'Done'];
  const idx = step === 'approving' ? 0 : step === 'listing' ? 1 : step === 'success' ? 2 : -1;
  if (idx === -1) return null;

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i < idx  ? 'bg-green-500 text-white' :
            i === idx ? 'bg-primary text-white ring-2 ring-primary/30' :
            'bg-muted/20 text-muted'
          }`}>
            {i < idx ? <CheckCircle size={14} /> : i + 1}
          </div>
          <span className={`text-sm font-medium ${i <= idx ? 'text-main' : 'text-muted'}`}>{label}</span>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 transition-colors ${i < idx ? 'bg-green-500' : 'bg-muted/30'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ListNFTPage = () => {
  const { collection: collectionAddress, tokenId } = useParams<{ collection: string; tokenId: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // NFT data
  const [nft,      setNft]      = useState<(NFT & { activeListing: Listing | null }) | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [blockErr, setBlockErr] = useState('');

  // Form
  const [listingType, setListingType] = useState<ListingType>('fixed');
  const [price,       setPrice]       = useState('');
  const [duration,    setDuration]    = useState('7');
  const [formError,   setFormError]   = useState('');

  // Flow state
  const [step,      setStep]      = useState<Step>('form');
  const [txError,   setTxError]   = useState('');
  const [approveTx, setApproveTx] = useState<`0x${string}` | undefined>();
  const [listTx,    setListTx]    = useState<`0x${string}` | undefined>();

  // Refs to avoid stale closures in effects
  const priceRef    = useRef(price);
  const durRef      = useRef(duration);
  const typeRef     = useRef(listingType);
  useEffect(() => { priceRef.current = price; },       [price]);
  useEffect(() => { durRef.current = duration; },      [duration]);
  useEffect(() => { typeRef.current = listingType; },  [listingType]);

  // ── Wagmi ────────────────────────────────────────────────────────────────────

  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeListing  } = useWriteContract();

  const { isSuccess: approveConfirmed, isError: approveFailed } =
    useWaitForTransactionReceipt({ hash: approveTx });

  const { isSuccess: listConfirmed, isError: listFailed } =
    useWaitForTransactionReceipt({ hash: listTx });

  // ── Load NFT ─────────────────────────────────────────────────────────────────

  const loadNFT = useCallback(async () => {
    if (!collectionAddress || !tokenId) return;
    setLoading(true);
    try {
      const data = await nftsApi.getOne(collectionAddress, tokenId);
      setNft(data);
      if (data.activeListing) {
        setBlockErr('This NFT is already listed. Cancel the existing listing first.');
      } else if (address && data.owner.toLowerCase() !== address.toLowerCase()) {
        setBlockErr('You do not own this NFT.');
      }
    } catch {
      setBlockErr('NFT not found.');
    } finally {
      setLoading(false);
    }
  }, [collectionAddress, tokenId, address]);

  useEffect(() => { loadNFT(); }, [loadNFT]);

  // ── After approve confirmed → fire listing tx ────────────────────────────────

  useEffect(() => {
    if (!approveConfirmed) return;
    setStep('listing');

    const priceWei = parseEther(priceRef.current);
    const durSecs  = BigInt(parseInt(durRef.current) * 24 * 60 * 60);

    if (typeRef.current === 'fixed') {
      writeListing({
        address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
        abi:          MARKETPLACE_ABI,
        functionName: 'createFixedPriceSale',
        args: [collectionAddress as `0x${string}`, BigInt(tokenId!), priceWei],
      }, {
        onSuccess: (hash) => setListTx(hash),
        onError: (err) => {
          setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
          setStep('error');
        },
      });
    } else {
      writeListing({
        address:      CONTRACT_ADDRESSES.marketplace as `0x${string}`,
        abi:          MARKETPLACE_ABI,
        functionName: 'createAuction',
        args: [collectionAddress as `0x${string}`, BigInt(tokenId!), priceWei, durSecs],
      }, {
        onSuccess: (hash) => setListTx(hash),
        onError: (err) => {
          setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
          setStep('error');
        },
      });
    }
  }, [approveConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (approveFailed) { setTxError('Approval transaction failed.'); setStep('error'); } }, [approveFailed]);
  useEffect(() => { if (listConfirmed) setStep('success'); }, [listConfirmed]);
  useEffect(() => { if (listFailed)    { setTxError('Listing transaction failed.'); setStep('error'); } }, [listFailed]);

  // ── Step 1: Approve ──────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setFormError('');
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setFormError('Enter a valid price greater than 0.');
      return;
    }
    setStep('approving');
    setTxError('');

    writeApprove({
      address:      collectionAddress as `0x${string}`,
      abi:          NFT_COLLECTION_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.marketplace as `0x${string}`, BigInt(tokenId!)],
    }, {
      onSuccess: (hash) => setApproveTx(hash),
      onError: (err) => {
        setTxError(err.message.includes('rejected') ? 'Transaction rejected.' : err.message);
        setStep('error');
      },
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const nftImage = resolveIpfsUrl(typeof nft?.metadata?.image === 'string' ? nft.metadata.image : '');
  const nftName  = typeof nft?.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft?.tokenId}`;

  const endDate = new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000)
    .toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const DURATIONS = [
    { label: '1 day',   value: '1'  },
    { label: '3 days',  value: '3'  },
    { label: '7 days',  value: '7'  },
    { label: '14 days', value: '14' },
    { label: '30 days', value: '30' },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // ── Blocked ───────────────────────────────────────────────────────────────────

  if (!isConnected || blockErr) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle size={40} className={blockErr ? 'text-red-500' : 'text-muted'} />
        <p className="text-main font-semibold text-center max-w-sm">
          {blockErr || 'Connect your wallet to list NFTs'}
        </p>
        <Button variant="outline" size="md" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-main">
      <div className="container max-w-xl mx-auto px-4 sm:px-6 py-10">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="text-3xl font-extrabold text-main mb-1">List for Sale</h1>
        <p className="text-muted text-sm mb-8">Two wallet confirmations required — approve then list.</p>

        <StepIndicator step={step} />

        {/* NFT preview card */}
        {nft && (
          <div className="bg-surface border border-muted rounded-2xl p-4 flex gap-4 items-center mb-6">
            <img
              src={nftImage || '/nft-placeholder.png'}
              alt={nftName}
              onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-main truncate">{nftName}</p>
              <p className="text-xs text-muted font-mono">{shortAddr(collectionAddress!)} · Token #{tokenId}</p>
              <p className="text-xs text-muted mt-0.5">Owner: {shortAddr(nft.owner)}</p>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="bg-surface border border-muted rounded-2xl p-8 text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-main">Listed Successfully!</h2>
            <p className="text-muted text-sm">
              <strong className="text-main">{nftName}</strong> is now listed for{' '}
              <strong className="text-main">{price} ETH</strong>
              {listingType === 'auction' ? ` — ${duration}-day auction` : ' at fixed price'}.
            </p>
            {listTx && (
              <a href={`https://sepolia.etherscan.io/tx/${listTx}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                View transaction <ExternalLink size={14} />
              </a>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="primary" size="md" sxclass="px-6"
                onClick={() => navigate(`/nft/${collectionAddress}/${tokenId}`)}>
                View NFT
              </Button>
              <Button variant="outline" size="md" sxclass="px-6"
                onClick={() => navigate('/marketplace')}>
                Go to Marketplace
              </Button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className="bg-surface border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-main">Something went wrong</h2>
            <p className="text-red-500 text-sm break-words">{txError}</p>
            <Button variant="outline" size="md" sxclass="px-6" onClick={() => setStep('form')}>
              Try Again
            </Button>
          </div>
        )}

        {/* ── In-progress ── */}
        {(step === 'approving' || step === 'listing') && (
          <div className="bg-surface border border-muted rounded-2xl p-8 text-center space-y-4">
            <Loader2 size={48} className="animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-main">
              {step === 'approving' ? 'Waiting for Approval...' : 'Creating Listing...'}
            </h2>
            <p className="text-muted text-sm">
              {step === 'approving'
                ? 'Confirm in your wallet. This grants the marketplace permission to transfer your NFT when it sells.'
                : 'Approval confirmed! Now confirm the listing transaction in your wallet.'}
            </p>
            {approveTx && step === 'approving' && (
              <a href={`https://sepolia.etherscan.io/tx/${approveTx}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                View approval tx <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {/* ── Form ── */}
        {step === 'form' && (
          <div className="space-y-6">

            {/* Listing type */}
            <div>
              <label className="block text-sm font-semibold text-main mb-3">Listing Type</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { t: 'fixed'   as ListingType, icon: Tag,   label: 'Fixed Price', sub: 'Sell at your set price'   },
                  { t: 'auction' as ListingType, icon: Gavel, label: 'Auction',     sub: 'Let buyers bid over time' },
                ]).map(({ t, icon: Icon, label, sub }) => (
                  <button key={t} onClick={() => setListingType(t)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      listingType === t
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted text-muted hover:border-primary/50'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-center opacity-70">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-main mb-1">
                {listingType === 'fixed' ? 'Sale Price' : 'Starting Bid'} (ETH)
              </label>
              <p className="text-xs text-muted mb-2">
                {listingType === 'fixed' ? 'Buyer pays this exact amount.' : 'Minimum bid to start the auction.'}
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={price}
                  onChange={e => { setPrice(e.target.value); setFormError(''); }}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 pr-14 bg-surface border rounded-xl text-main text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition ${
                    formError ? 'border-red-500' : 'border-muted'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-semibold">ETH</span>
              </div>
              {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
            </div>

            {/* Duration — auction only */}
            {listingType === 'auction' && (
              <div>
                <label className="block text-sm font-semibold text-main mb-3">
                  <Clock size={14} className="inline mr-1" />
                  Auction Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        duration === d.value
                          ? 'border-primary bg-primary text-white'
                          : 'border-muted text-muted hover:border-primary hover:text-main'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2">Ends: {endDate}</p>
              </div>
            )}

            {/* Info box */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted space-y-1">
                <p className="font-semibold text-main">Two wallet steps</p>
                <p><strong className="text-main">1. Approve</strong> — grant the marketplace permission to transfer your NFT when it sells.</p>
                <p><strong className="text-main">2. List</strong> — create the listing on the marketplace contract.</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!price || !isConnected}
              onClick={handleSubmit}
              sxclass="flex items-center justify-center gap-2"
            >
              <Tag size={18} />
              List for Sale
            </Button>

            <p className="text-xs text-muted text-center">
              Sepolia testnet · NFT stays in your wallet until sold
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ListNFTPage;