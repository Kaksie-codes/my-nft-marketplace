import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from './button/Button';
import NFTCard from './NFTCard';
import { nftsApi, usersApi, type NFT, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';
import NFTCardLoader from './loaders/NFTCardLoader';

const DiscoverMoreNFTsSection = () => {
  const navigate    = useNavigate();
  const [nfts,       setNfts]       = useState<NFT[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile | null>>({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res      = await nftsApi.getAll(1, 3);
        const nftsData = res.data;

        // Get unique minter addresses then fetch their profiles in parallel
        const uniqueMinters = [...new Set(nftsData.map(n => n.minter).filter(Boolean))];
        const profiles = await Promise.all(
          uniqueMinters.map(addr => usersApi.getProfile(addr).catch(() => null))
        );

        // Build address → profile map for quick lookup when rendering
        const map: Record<string, UserProfile | null> = {};
        uniqueMinters.forEach((addr, i) => { map[addr] = profiles[i]; });

        setNfts(nftsData);
        setProfileMap(map);
      } catch (err) {
        console.error('Failed to fetch NFTs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getNFTImage = (nft: NFT) =>
    resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

  const getNFTTitle = (nft: NFT) =>
    typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

  const getCreatorName = (nft: NFT) =>
    profileMap[nft.minter]?.username ||
    `${nft.minter.slice(0, 6)}...${nft.minter.slice(-4)}`;

  const getCreatorImage = (nft: NFT) => {
    const avatar = profileMap[nft.minter]?.avatar;
    return avatar ? resolveIpfsUrl(avatar) : undefined;
  };

  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-main font-bold text-4xl">Discover More NFTs</h2>
            <p className="text-main text-xl">
              Explore a wider range of NFTs in our marketplace.
            </p>
          </div>
          <Link to="/marketplace">
            <Button variant="outline" sxclass="px-4" size="sm" icon={<Eye size={16} />}>
              See All
            </Button>
          </Link>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
            {[...Array(3)].map((_, i) => (
              <NFTCardLoader key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && nfts.length === 0 && (
          <div className="mt-[40px] text-center py-12">
            <p className="text-muted text-sm">No NFTs found yet.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && nfts.length > 0 && (
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
            {nfts.map((nft) => (
              <NFTCard
                key={nft._id}
                image={getNFTImage(nft)}
                title={getNFTTitle(nft)}
                creatorImage={getCreatorImage(nft)}
                creatorName={getCreatorName(nft)}
                owner={nft.owner}
                listing={nft.activeListing ?? null}
                onClick={() => navigate(`/nft/${nft.collection}/${nft.tokenId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverMoreNFTsSection;