import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrendingCollectionCard from './TrendingCollectionCard';
import { collectionsApi, usersApi, type Collection, type NFT, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

interface CollectionWithNFTs {
  collection:  Collection;
  nfts:        NFT[];
  creatorUser: UserProfile | null;
}

const TrendingCollectionSection = () => {
  const navigate            = useNavigate();
  const [data, setData]     = useState<CollectionWithNFTs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res         = await collectionsApi.getAll({ page: 1, limit: 10 });
        const collections = res.data;

        // Fetch NFTs and creator profile in parallel for each collection
        const withNFTs = await Promise.all(
          collections.map(async (col) => {
            const [nftRes, creatorUser] = await Promise.all([
              collectionsApi.getNFTs(col.address, 1, 3).catch(() => ({ data: [] as NFT[] })),
              usersApi.getProfile(col.creator).catch(() => null),
            ]);
            return { collection: col, nfts: nftRes.data, creatorUser };
          })
        );

        // Filter out empty collections then take top 3
        const nonEmpty = withNFTs
          // .filter(({ nfts }) => nfts.length > 0)
          .slice(0, 3);

        setData(nonEmpty);
      } catch (err) {
        console.error('Failed to fetch trending collections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const getNFTImage = (nft: NFT): string => {
    const img = nft.metadata?.image;
    return resolveIpfsUrl(typeof img === 'string' ? img : '');
  };

  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container px-4 sm:px-6 lg:px-8">
        <h2 className="text-main font-bold text-4xl">Trending Collections</h2>
        <p className="text-main text-xl">Checkout our weekly updated trending collections.</p>

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-[180px] bg-muted/20 rounded-[10px]" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-[70px] bg-muted/20 rounded-[5px]" />
                  <div className="h-[70px] bg-muted/20 rounded-[5px]" />
                  <div className="h-[70px] bg-muted/20 rounded-[5px]" />
                </div>
                <div className="h-5 bg-muted/20 rounded w-2/3" />
                <div className="h-4 bg-muted/20 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && data.length === 0 && (
          <div className="mt-[40px] text-center py-12">
            <p className="text-muted text-sm">No collections with NFTs found yet.</p>
          </div>
        )}

        {/* Collections grid */}
        {!loading && data.length > 0 && (
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
            {data.map(({ collection, nfts, creatorUser }) => {
              const bannerImg   = nfts[0] ? getNFTImage(nfts[0]) : '/nft-placeholder.png';
              const thumbnails  = nfts.map(getNFTImage);
              const creatorName = creatorUser?.username
                || `${collection.creator.slice(0, 6)}...${collection.creator.slice(-4)}`;
              const creatorImg  = creatorUser?.avatar
                ? resolveIpfsUrl(creatorUser.avatar)
                : undefined;

              return (
                <div
                  key={collection._id}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => navigate(`/collection/${collection.address}`)}
                >
                  <TrendingCollectionCard
                    bannerImg={bannerImg}
                    thumbnails={thumbnails}
                    count={collection.nftCount ?? 0}
                    title={collection.name}
                    creatorName={creatorName}
                    creatorImg={creatorImg}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingCollectionSection;