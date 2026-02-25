import { User } from 'lucide-react';
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
  const showBadge     = count > 3;
  const remainder     = count - 2;
  const displayThumbs = showBadge ? thumbnails.slice(0, 2) : thumbnails.slice(0, 3);

  return (
    <div className="group cursor-pointer">

      {/* Banner */}
      <div className="rounded-[10px] overflow-hidden h-[180px]">
        <img
          src={resolveIpfsUrl(bannerImg)}
          alt="collection banner"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.jpeg'; }}
        />
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-3 gap-3 mt-[12px]">
        {displayThumbs.map((thumb, i) => (
          <img
            key={i}
            src={resolveIpfsUrl(thumb)}
            alt={`thumb ${i + 1}`}
            className="rounded-[5px] h-[70px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
          />
        ))}

        {!showBadge && displayThumbs.length < 3 && (
          Array.from({ length: 3 - displayThumbs.length }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-[5px] h-[70px] bg-muted/20" />
          ))
        )}

        {showBadge && (
          <div className="rounded-[5px] bg-primary grid place-items-center font-bold text-white h-[70px] transition-opacity duration-300 group-hover:opacity-80">
            +{remainder > 99 ? '99' : remainder}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="py-3">
        <h2 className="text-main font-bold text-xl transition-colors duration-200 group-hover:text-primary">
          {title}
        </h2>
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





// import { User } from 'lucide-react';
// import { resolveIpfsUrl } from '../utils/ipfs';

// interface TrendingCollectionCardProps {
//   bannerImg:   string;
//   thumbnails:  string[];  // up to 3 NFT images
//   count:       number;    // total NFT count in collection
//   title:       string;
//   creatorImg?: string;
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
//   // Only show the count badge if there are more NFTs than we can display
//   // We show max 2 thumbnails + 1 badge slot = 3 slots total
//   // Badge is shown when total count > 3 (meaning there are hidden NFTs)
//   const showBadge    = count > 3;
//   const remainder    = count - 2; // how many are not shown (we show 2 thumbnails)
//   const displayThumbs = showBadge ? thumbnails.slice(0, 2) : thumbnails.slice(0, 3);

//   return (
//     <div className="">
//       {/* Banner */}
//       <div className="rounded-[10px] overflow-hidden h-[180px]">
//         <img
//           src={resolveIpfsUrl(bannerImg)}
//           alt="collection banner"
//           className="w-full h-full object-cover"
//           onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.jpeg'; }}
//         />
//       </div>

//       {/* Thumbnails + optional count badge */}
//       <div className="grid grid-cols-3 gap-3 mt-[12px]">
//         {displayThumbs.map((thumb, i) => (
//           <img
//             key={i}
//             src={resolveIpfsUrl(thumb)}
//             alt={`thumb ${i + 1}`}
//             className="rounded-[5px] h-[70px] w-full object-cover"
//             onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
//           />
//         ))}

//         {/* Fill empty slots if fewer than 3 thumbnails and no badge */}
//         {!showBadge && displayThumbs.length < 3 && (
//           Array.from({ length: 3 - displayThumbs.length }).map((_, i) => (
//             <div key={`empty-${i}`} className="rounded-[5px] h-[70px] bg-muted/20" />
//           ))
//         )}

//         {/* Count badge — only shown when count > 3 */}
//         {showBadge && (
//           <div className="rounded-[5px] bg-primary grid place-items-center font-bold text-white h-[70px]">
//             +{remainder > 99 ? '99' : remainder}
//           </div>
//         )}
//       </div>

//       {/* Info */}
//       <div className="py-3">
//         <h2 className="text-main font-bold text-xl">{title}</h2>
//         <div className="flex gap-3 pt-2 items-center">
//           {creatorImg
//             ? <img src={creatorImg} alt="creator" className="w-8 h-8 rounded-full object-cover"
//                 onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }} />
//             : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
//                 <User size={14} className="text-primary" />
//               </div>
//           }
//           <p className="text-main text-sm truncate">{creatorName}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TrendingCollectionCard;