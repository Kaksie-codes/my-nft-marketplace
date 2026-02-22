import { useEffect, useState } from 'react';
import TrendingCollectionCard from './TrendingCollectionCard';
import { collectionsApi, type Collection, type NFT } from '../utils/apiClient';

interface CollectionWithNFTs {
  collection: Collection;
  nfts:       NFT[];
}

const TrendingCollectionSection = () => {
  const [data, setData]       = useState<CollectionWithNFTs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Fetch more than 3 upfront so we still have enough after filtering empty ones
        const res         = await collectionsApi.getAll({ page: 1, limit: 10 });
        const collections = res.data;

        // Fetch up to 3 NFTs per collection for thumbnails
        const withNFTs = await Promise.all(
          collections.map(async (col) => {
            try {
              const nftRes = await collectionsApi.getNFTs(col.address, 1, 3);
              return { collection: col, nfts: nftRes.data };
            } catch {
              return { collection: col, nfts: [] };
            }
          })
        );

        // Filter out collections with no NFTs then take the top 3
        const nonEmpty = withNFTs
          .filter(({ nfts }) => nfts.length > 0)
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
    return typeof img === 'string' ? img : '/nft-placeholder.png';
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
            {data.map(({ collection, nfts }) => {
              const bannerImg  = nfts[0] ? getNFTImage(nfts[0]) : '/nft-placeholder.png';
              const thumbnails = nfts.map(getNFTImage);

              return (
                <TrendingCollectionCard
                  key={collection._id}
                  bannerImg={bannerImg}
                  thumbnails={thumbnails}
                  count={collection.nftCount ?? 0}
                  title={collection.name}
                  creatorName={`${collection.creator.slice(0, 6)}...${collection.creator.slice(-4)}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingCollectionSection;