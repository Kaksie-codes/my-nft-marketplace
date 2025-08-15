import { useParams, useNavigate } from 'react-router-dom';
import NFTCard from '../components/NFTCard';
import RegularPageWrapper from '../components/RegularPageWrapper';

// Dummy data: You should replace this with real data from your backend
const allNFTs = [
  { image: '/nft-1.png', title: 'Galactic Cat', creatorImage: '/creator-1.png', creatorName: 'Jack Smith', collection: 'Cool Collection', price: '1.2 ETH', highestBid: '0.8 ETH' },
  { image: '/nft-2.png', title: 'Galactic Dog', creatorImage: '/creator-2.png', creatorName: 'Jane Doe', collection: 'Cool Collection', price: '2.1 ETH', highestBid: '1.5 ETH' },
  { image: '/nft-3.png', title: 'Galactic Bird', creatorImage: '/creator-3.png', creatorName: 'Alex Ray', collection: 'Rare Art', price: '0.9 ETH', highestBid: '0.5 ETH' },
  { image: '/nft-1.png', title: 'Galactic Fish', creatorImage: '/creator-1.png', creatorName: 'Sam Lee', collection: 'Pixel Wonders', price: '1.7 ETH', highestBid: '1.2 ETH' },
  { image: '/nft-2.png', title: 'Galactic Fox', creatorImage: '/creator-5.png', creatorName: 'Chris Kim', collection: 'Rare Art', price: '2.5 ETH', highestBid: '2.1 ETH' },
  { image: '/nft-3.png', title: 'Galactic Wolf', creatorImage: '/creator-6.png', creatorName: 'Pat Green', collection: 'Cool Collection', price: '1.3 ETH', highestBid: '1.0 ETH' },
];

const CollectionNFTsPage = () => {
  const { collectionName } = useParams();
  const navigate = useNavigate();
  const decodedCollectionName = collectionName ? decodeURIComponent(collectionName) : '';
  const nfts = allNFTs.filter(nft => nft.collection === decodedCollectionName);

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">
        <div className="container max-w-5xl mx-auto pt-16 pb-10">
          <h1 className="text-4xl font-extrabold mb-4 text-main">NFTs in "{decodedCollectionName}"</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {nfts.length > 0 ? nfts.map((nft, i) => (
              <NFTCard
                key={i}
                {...nft}
                onClick={() => navigate(`/nft/${encodeURIComponent(nft.title)}`)}
              />
            )) : <div className="col-span-2 text-center text-muted text-lg">No NFTs found in this collection.</div>}
          </div>
        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default CollectionNFTsPage;
