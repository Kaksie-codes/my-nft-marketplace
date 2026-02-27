import { useEffect, useState } from 'react';
import { Clock, Tag, Gavel, User } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import type { Listing } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

// ── Props ────────────────────────────────────────────────────────────────────

interface NFTCardProps {
  image:            string;
  title:            string;
  creatorImage?:    string;
  creatorName:      string;
  owner?:           string;
  listing?:         Listing | null;
  category?:        string;
  backgroundColor?: string;
  onClick?:         () => void;
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(endTime?: string): string {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!endTime) return;
    const calc = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d}d ${h % 24}h left`);
      } else {
        setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} left`);
      }
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return timeLeft;
}

// ── Wei to ETH ────────────────────────────────────────────────────────────────

function toEth(wei?: string): string {
  if (!wei || wei === '0') return '—';
  try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(3)} ETH`; }
  catch { return '—'; }
}

// ── Format category label ─────────────────────────────────────────────────────

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Listing info section ──────────────────────────────────────────────────────

function ListingInfo({ listing }: { listing?: Listing | null }) {
  const timeLeft = useCountdown(listing?.endTime);

  if (!listing) {
    return (
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center gap-1.5 text-muted text-sm">
          <Tag size={14} />
          <span>Not listed</span>
        </div>
      </div>
    );
  }

  if (listing.type === 'fixed') {
    return (
      <div className="flex justify-between items-center mt-3">
        <div>
          <span className="text-muted text-xs flex items-center gap-1">
            <Tag size={11} /> Fixed Price
          </span>
          <p className="text-main text-lg font-semibold leading-tight mt-0.5">
            {toEth(listing.price)}
          </p>
        </div>
        <div className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
          Buy Now
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center mt-3">
      <div>
        <span className="text-muted text-xs flex items-center gap-1">
          <Gavel size={11} /> Highest Bid
        </span>
        <p className="text-main text-lg font-semibold leading-tight mt-0.5">
          {toEth(listing.highestBid) !== '—' ? toEth(listing.highestBid) : toEth(listing.price)}
        </p>
      </div>
      {timeLeft && (
        <div className="flex items-center gap-1 text-amber-500 text-xs font-medium">
          <Clock size={12} />
          {timeLeft}
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

const NFTCard: React.FC<NFTCardProps> = ({
  image,
  title,
  creatorImage,
  creatorName,
  owner,
  listing,
  category,
  backgroundColor,
  onClick,
}) => {
  const { address } = useAccount();
  const isOwner = !!(address && owner && address.toLowerCase() === owner.toLowerCase());

  return (
    <div
      className={`${backgroundColor || 'bg-surface'} rounded-[20px] group transition-all duration-300 hover:shadow-xl cursor-pointer border border-muted hover:border-primary/40 relative`}
      onClick={onClick}
    >
      {/* Owned badge */}
      {isOwner && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
          <User size={11} />
          Owned
        </div>
      )}

      {/* Listing type badge */}
      {listing && (
        <div className={`absolute top-3 right-3 z-10 text-xs font-medium px-2.5 py-1 rounded-full ${
          listing.type === 'auction'
            ? 'bg-amber-500/90 text-white'
            : 'bg-green-500/90 text-white'
        }`}>
          {listing.type === 'auction' ? 'Auction' : 'For Sale'}
        </div>
      )}

      {/* Image */}
      <div className="w-full h-[220px] relative overflow-hidden rounded-t-[20px]">
        <img
          src={resolveIpfsUrl(image)}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
        />

        {/* Category pill — bottom left of image */}
        {category && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {formatCategory(category)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <h3 className="text-base font-semibold text-main truncate">{title}</h3>

        {/* Creator */}
        <div className="flex items-center gap-2 mt-1.5">
          {creatorImage
            ? <img src={creatorImage} alt="Creator" className="w-6 h-6 rounded-full object-cover" />
            : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User size={12} className="text-primary" />
              </div>
          }
          <p className="text-xs text-muted truncate">{creatorName}</p>
        </div>

        {/* Listing info */}
        <ListingInfo listing={listing} />
      </div>
    </div>
  );
};

export default NFTCard;