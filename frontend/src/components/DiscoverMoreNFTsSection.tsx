import { Eye } from "lucide-react"
import Button from "./button/Button"
import NFTCard from "./NFTCard"

const DiscoverMoreNFTsSection = () => {
  const nfts = [
    {
      image: 'nft-1.png',
      title: 'NFT Title 1',
      creatorImage: 'avat.png',
      creatorName: 'Anima Kid',
      price: '1.32 ETH',
      highestBid: '0.12 ETH',
    },
    {
      image: 'nft-2.png',
      title: 'NFT Title 2',
      creatorImage: 'avat.png',
      creatorName: 'Crypto Queen',
      price: '2.10 ETH',
      highestBid: '0.22 ETH',
    },
    {
      image: 'nft-3.png',
      title: 'NFT Title 3',
      creatorImage: 'avat.png',
      creatorName: 'Pixel Pro',
      price: '0.98 ETH',
      highestBid: '0.08 ETH',
    },
  ];
  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container">
         <div className="flex justify-between items-end">
            <div>
                <h2 className="text-main font-bold text-4xl">Discover More NFTs</h2>
                <p className="text-main text-xl">
                    Explore a wider range of NFTs in our marketplace.
                </p>
            </div>
            <Button
                variant="outline"
                sxclass="px-4"
                size="sm"
                icon={<Eye size={16} />}
            >
                See All
            </Button>
        </div>
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
            {nfts.map((nft, idx) => (
              <NFTCard
                key={nft.title + idx}
                image={nft.image}
                title={nft.title}
                creatorImage={nft.creatorImage}
                creatorName={nft.creatorName}
                price={nft.price}
                highestBid={nft.highestBid}
                // No backgroundColor prop, will use default
              />
            ))}
          </div>
      </div>
    </div>
  )
}

export default DiscoverMoreNFTsSection
