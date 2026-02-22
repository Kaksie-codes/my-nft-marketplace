import { User } from 'lucide-react';
import { resolveIpfsUrl } from '../utils/ipfs';

interface TrendingCollectionCardProps {
  bannerImg:   string;
  thumbnails:  string[];  // up to 3 NFT images
  count:       number;    // total NFT count in collection
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
  // Only show the count badge if there are more NFTs than we can display
  // We show max 2 thumbnails + 1 badge slot = 3 slots total
  // Badge is shown when total count > 3 (meaning there are hidden NFTs)
  const showBadge    = count > 3;
  const remainder    = count - 2; // how many are not shown (we show 2 thumbnails)
  const displayThumbs = showBadge ? thumbnails.slice(0, 2) : thumbnails.slice(0, 3);

  return (
    <div className="">
      {/* Banner */}
      <div className="rounded-[10px] overflow-hidden h-[180px]">
        <img
          src={resolveIpfsUrl(bannerImg)}
          alt="collection banner"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.jpeg'; }}
        />
      </div>

      {/* Thumbnails + optional count badge */}
      <div className="grid grid-cols-3 gap-3 mt-[12px]">
        {displayThumbs.map((thumb, i) => (
          <img
            key={i}
            src={resolveIpfsUrl(thumb)}
            alt={`thumb ${i + 1}`}
            className="rounded-[5px] h-[70px] w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
          />
        ))}

        {/* Fill empty slots if fewer than 3 thumbnails and no badge */}
        {!showBadge && displayThumbs.length < 3 && (
          Array.from({ length: 3 - displayThumbs.length }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-[5px] h-[70px] bg-muted/20" />
          ))
        )}

        {/* Count badge — only shown when count > 3 */}
        {showBadge && (
          <div className="rounded-[5px] bg-primary grid place-items-center font-bold text-white h-[70px]">
            +{remainder > 99 ? '99' : remainder}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="py-3">
        <h2 className="text-main font-bold text-xl">{title}</h2>
        <div className="flex gap-3 pt-2 items-center">
          {creatorImg
            ? <img src={creatorImg} alt="creator" className="w-8 h-8 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }} />
            : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-primary" />
              </div>
          }
          <p className="text-main text-sm truncate">{creatorName}</p>
        </div>
      </div>
    </div>
  );
};

export default TrendingCollectionCard;





// interface TrendingCollectionCardProps {
//   bannerImg: string;
//   thumbnails: string[]; // first two images
//   count: number;
//   title: string;
//   creatorImg: string;
//   creatorName: string;
// }

// const TrendingCollectionCard: React.FC<TrendingCollectionCardProps> = ({
//   bannerImg,
//   thumbnails,
//   count,
//   title,
//   creatorImg,
//   creatorName,
// }) => {
//   return (
//     <div className="">
//       <div className="rounded-[10px] overflow-hidden">
//         <img src={bannerImg} alt="nft banner" />
//       </div>
//       <div className="grid grid-cols-3 gap-3 mt-[12px]">
//          <img src={thumbnails[0]} alt="nft thumb 1" className="rounded-[5px]"/>
//          <img src={thumbnails[1]} alt="nft thumb 2" className="rounded-[5px]"/>
//          <div className="rounded-[5px] bg-primary grid place-items-center font-bold text-white">
//             {count > 99 ? "99+" : count}
//          </div>
//       </div>
//       <div className="py-3">
//         <h2 className="text-main font-bold text-xl">{title}</h2>
//         <div className="flex gap-3 pt-2">
//           <img src={creatorImg} alt="creator avatar"  className="rounded-full"/>
//           <p className="text-main">{creatorName}</p>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default TrendingCollectionCard
