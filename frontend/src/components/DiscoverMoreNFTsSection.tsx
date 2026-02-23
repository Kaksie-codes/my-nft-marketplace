import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from './button/Button';
import NFTCard from './NFTCard';
import { nftsApi, type NFT } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

const DiscoverMoreNFTsSection = () => {
  const navigate  = useNavigate();
  const [nfts,    setNfts]    = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await nftsApi.getAll(1, 3);
        setNfts(res.data);
      } catch (err) {
        console.error('Failed to fetch NFTs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getNFTImage = (nft: NFT) =>
    resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

  const getNFTTitle = (nft: NFT) =>
    typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

  const getCreatorName = (nft: NFT) =>
    `${nft.minter.slice(0, 6)}...${nft.minter.slice(-4)}`;

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
              <div key={i} className="bg-surface rounded-[20px] animate-pulse border border-muted">
                <div className="w-full h-[220px] bg-muted/20 rounded-t-[20px]" />
                <div className="px-4 py-4 space-y-3">
                  <div className="h-4 bg-muted/20 rounded w-3/4" />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted/20" />
                    <div className="h-3 bg-muted/20 rounded w-1/3" />
                  </div>
                  <div className="flex justify-between mt-2">
                    <div className="h-8 bg-muted/20 rounded w-1/3" />
                    <div className="h-8 bg-muted/20 rounded w-1/3" />
                  </div>
                </div>
              </div>
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
                creatorName={getCreatorName(nft)}
                owner={nft.owner}
                listing={null}
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





// import { Eye } from "lucide-react"
// import Button from "./button/Button"
// import NFTCard from "./NFTCard"
// import { useNavigate } from "react-router-dom";
// // import NewNFTCard from "./NewNFTCard"

// const DiscoverMoreNFTsSection = () => {
//   const navigate = useNavigate();
//   const nfts = [
//     {
//       image: 'nft-1.png',
//       title: 'NFT Title 1',
//       creatorImage: 'avat.png',
//       creatorName: 'Anima Kid',
//       price: '1.32 ETH',
//       highestBid: '0.12 ETH',
//     },
//     {
//       image: 'nft-2.png',
//       title: 'NFT Title 2',
//       creatorImage: 'avat.png',
//       creatorName: 'Crypto Queen',
//       price: '2.10 ETH',
//       highestBid: '0.22 ETH',
//     },
//     {
//       image: 'nft-3.png',
//       title: 'NFT Title 3',
//       creatorImage: 'avat.png',
//       creatorName: 'Pixel Pro',
//       price: '0.98 ETH',
//       highestBid: '0.08 ETH',
//     },
//   ];

//   // let newNfts = [
//   //   {
//   //     image: '/nft-1.png',
//   //     title: 'Chobok Girls',
//   //     count: 9,
//   //     creator: { name: 'Anima Kid', age: 12 }
//   //   },
//   //   {
//   //     image: '/nft-2.png',
//   //     title: 'Galactic Dog',
//   //     count: 5
//   //   },
//   //   {
//   //     image: '/nft-3.png',
//   //     title: 'Pixel Pro',
//   //     count: 4
//   //   }
//   // ]
//   return (
//     <div className="mt-[80px]">
//       <div className="max-w-6xl mx-auto container">
//          <div className="flex justify-between items-end">
//             <div>
//                 <h2 className="text-main font-bold text-4xl">Discover More NFTs</h2>
//                 <p className="text-main text-xl">
//                     Explore a wider range of NFTs in our marketplace.
//                 </p>
//             </div>
//             <Button
//                 variant="outline"
//                 sxclass="px-4"
//                 size="sm"
//                 icon={<Eye size={16} />}
//             >
//                 See All
//             </Button>
//         </div>
//           <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
//             {/* {
//               newNfts.map((nft, idx) => (
//                 <NewNFTCard
//                   key={nft.title + idx}
//                   image={nft.image}
//                   title={nft.title}
//                   count={nft.count}
//                   creator={nft.creator}
//                 />
//               ))
//             } */}
//            {/* <NewNFTCard
//            title={'Chobok Girls'}
//            image='/nft-1.png'
//            count={9}
//            creator={{name: 'Anima Kid', age: 12}}
//             />
//            <NewNFTCard
//            image={'/nft-2.png'}
//            title={'Galactic Dog'}
//            count={5}
//            />
//            <NewNFTCard
//            image={'/nft-3.png'}
//            title={'Pixel Pro'}
//            count={4}
//            /> */}
//             {nfts.map((nft, idx) => (
//               <NFTCard
//                 key={nft.title + idx}
//                 image={nft.image}
//                 title={nft.title}
//                 creatorImage={nft.creatorImage}
//                 creatorName={nft.creatorName}
//                 price={nft.price}
//                 highestBid={nft.highestBid}
//                 onClick={() => navigate(`/nft/${encodeURIComponent(nft.title)}`)}
//               />
//             ))}
//           </div>
//       </div>
//     </div>
//   )
// }

// export default DiscoverMoreNFTsSection
