import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { resolveIpfsUrl } from '../utils/ipfs';

interface CreatorCardProps {
  rank:      number;
  address:   string;
  image?:    string;
  name:      string;
  nftCount:  number;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ rank, address, image, name, nftCount }) => {
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();

  const isOwnProfile =
    !!connectedAddress &&
    connectedAddress.toLowerCase() === address.toLowerCase();

  const handleClick = () => {
    if (isOwnProfile) {
      navigate(`/dashboard/profile/${address}`);
    } else {
      navigate(`/profile/${address}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-surface group border shadow-lg border-transparent rounded-[10px] p-4 relative grid place-items-center transition-all duration-300 hover:shadow-xl cursor-pointer hover:bg-background hover:border-surface"
    >
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