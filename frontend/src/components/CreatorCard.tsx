import { User } from 'lucide-react';
import { resolveIpfsUrl } from '../utils/ipfs';

interface CreatorCardProps {
  rank:      number;
  image?:    string;
  name:      string;
  nftCount:  number;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ rank, image, name, nftCount }) => {
  return (
    <div className="bg-surface group border shadow-lg border-transparent rounded-[10px] p-4 relative grid place-items-center transition-all duration-300 hover:shadow-xl cursor-pointer hover:bg-background hover:border-surface">
      {/* Rank badge */}
      <div className="h-7 w-7 absolute top-4 left-4 rounded-full bg-background text-main text-sm flex items-center justify-center font-semibold group-hover:bg-surface">
        {rank}
      </div>

      {/* Avatar */}
      <div className="w-[100px] h-[100px] rounded-full overflow-hidden transition-transform duration-300 group-hover:-translate-y-2 border-2 border-muted flex-shrink-0">
        {image
          ? <img
              src={resolveIpfsUrl(image)}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          : <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <User size={36} className="text-primary" />
            </div>
        }
      </div>

      {/* Name */}
      <h3 className="text-base font-semibold text-main mt-3 truncate max-w-full px-2 text-center">
        {name}
      </h3>

      {/* Stat */}
      <div className="flex gap-2 mt-1">
        <span className="text-sm text-muted">NFTs Minted:</span>
        <span className="text-sm text-main font-medium">{nftCount}</span>
      </div>
    </div>
  );
};

export default CreatorCard;





// interface CreatorCardProps {
//   rank: number;
//   image: string;
//   name: string;
//   sales: string;
// }


// const CreatorCard: React.FC<CreatorCardProps> = ({ rank, image, name, sales }) => {
//   return (
//   <div className="bg-surface group border shadow-lg border-transparent rounded-[10px] p-4 relative grid place-items-center transition-all duration-300 hover:shadow-xl group cursor-pointer hover:bg-background hover:border-surface">
//       <div className="h-7 w-7 absolute top-4 left-4 rounded-full bg-background text-main flex items-center justify-center group-hover:bg-surface">{rank}</div>
//       <img src={image} alt={name} className="rounded-full w-[150px] h-[150px] transition-transform duration-300 group-hover:-translate-y-2" />
//       <h3 className="text-lg font-semibold text-main">{name}</h3>
//       <div className="flex gap-3">
//           <span className="text-sm text-muted">Total Sales:</span>
//           <span className="text-sm text-main">{sales}</span>
//       </div>
//     </div>
//   )
// }

// export default CreatorCard
