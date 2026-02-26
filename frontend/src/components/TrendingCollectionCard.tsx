import { User, ImageOff } from 'lucide-react';
import { resolveIpfsUrl } from '../utils/ipfs';

interface TrendingCollectionCardProps {
  bannerImg:   string;
  thumbnails:  string[];
  count:       number;
  title:       string;
  creatorImg?: string;
  creatorName: string;
}

const TrendingCollectionCard: React.FC<TrendingCollectionCardProps> = ({
  bannerImg,
  thumbnails,
  count,
  title,
  creatorImg,
  creatorName,
}) => {
  // Empty = we received no thumbnail images back from the API.
  // count can be stale; thumbnails is what we actually fetched.
  const isEmpty       = thumbnails.length === 0;
  const showBadge     = count > 3;
  const remainder     = count - 2;
  const displayThumbs = showBadge ? thumbnails.slice(0, 2) : thumbnails.slice(0, 3);

  return (
    <div className="group cursor-pointer">

      {/* Banner — always shows, no overlay */}
      <div className="rounded-[10px] overflow-hidden h-[180px]">
        <img
          src={resolveIpfsUrl(bannerImg)}
          alt="collection banner"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.jpeg'; }}
        />
      </div>

      {/* Thumbnails row */}
      <div className="grid grid-cols-3 gap-3 mt-[12px]">
        {isEmpty ? (
          // No NFTs fetched — show dashed placeholder slots
          <>
            <div className="rounded-[5px] h-[70px] bg-muted/20 border border-dashed border-muted/40" />
            <div className="rounded-[5px] h-[70px] bg-muted/20 border border-dashed border-muted/40 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <ImageOff size={14} className="text-muted" />
                <span className="text-muted text-[9px] font-medium">No NFTs</span>
              </div>
            </div>
            <div className="rounded-[5px] h-[70px] bg-muted/20 border border-dashed border-muted/40" />
          </>
        ) : (
          <>
            {displayThumbs.map((thumb, i) => (
              <img
                key={i}
                src={resolveIpfsUrl(thumb)}
                alt={`thumb ${i + 1}`}
                className="rounded-[5px] h-[70px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
              />
            ))}

            {!showBadge && displayThumbs.length < 3 &&
              Array.from({ length: 3 - displayThumbs.length }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-[5px] h-[70px] bg-muted/20" />
              ))
            }

            {showBadge && (
              <div className="rounded-[5px] bg-primary grid place-items-center font-bold text-white h-[70px] transition-opacity duration-300 group-hover:opacity-80">
                +{remainder > 99 ? '99' : remainder}
              </div>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-main font-bold text-xl transition-colors duration-200 group-hover:text-primary">
            {title}
          </h2>
          {isEmpty && (
            <span className="text-[10px] font-semibold text-muted border border-muted/40 rounded-full px-2 py-0.5 flex-shrink-0">
              Empty
            </span>
          )}
        </div>
        <div className="flex gap-3 pt-2 items-center">
          {creatorImg
            ? <img src={resolveIpfsUrl(creatorImg)} alt="creator"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent transition-all duration-200 group-hover:ring-primary"
                onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }} />
            : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 ring-2 ring-transparent transition-all duration-200 group-hover:ring-primary">
                <User size={14} className="text-primary" />
              </div>
          }
          <p className="text-muted text-sm truncate transition-colors duration-200 group-hover:text-main">
            {creatorName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrendingCollectionCard;