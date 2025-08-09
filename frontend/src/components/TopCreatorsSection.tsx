import Button from "./button/Button"
import { Trophy } from 'lucide-react';
import CreatorCard from "./CreatorCard";


const TopCreatorsSection = () => {
  // Example creators array
  const creators = [
    { image: 'okay.png', name: 'Anima Kid', sales: '34.53 ETH' },
    { image: 'okay.png', name: 'Crypto Queen', sales: '28.10 ETH' },
    { image: 'okay.png', name: 'Pixel Pro', sales: '25.00 ETH' },
    { image: 'okay.png', name: 'NFT Ninja', sales: '22.45 ETH' },
    { image: 'okay.png', name: 'Meta Mike', sales: '20.12 ETH' },
    { image: 'okay.png', name: 'Chain Champ', sales: '18.90 ETH' },
    { image: 'okay.png', name: 'Artisan', sales: '17.80 ETH' },
    { image: 'okay.png', name: 'Rare Rina', sales: '16.75 ETH' },
    { image: 'okay.png', name: 'Token Tom', sales: '15.60 ETH' },
    { image: 'okay.png', name: 'Minty', sales: '14.50 ETH' },
    { image: 'okay.png', name: 'Blocky', sales: '13.40 ETH' },
    { image: 'okay.png', name: 'Genesis', sales: '12.30 ETH' },
  ];
  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-main font-bold text-4xl">Top Creators</h2>
                <p className="text-main text-xl">
                    Checkout Top Rated Creators on the NFT Marketplace.
                </p>
            </div>
            <Button
                variant="outline"
                sxclass="px-4"
                size="sm"
                icon={<Trophy size={16} />}
            >
                View Rankings
            </Button>
        </div>
        <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
          {creators.map((creator, idx) => (
            <CreatorCard
              key={creator.name + idx}
              rank={idx + 1}
              image={creator.image}
              name={creator.name}
              sales={creator.sales}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TopCreatorsSection
