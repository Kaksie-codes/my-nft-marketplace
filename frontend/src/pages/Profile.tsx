
import { useState } from 'react';
import Avatar from '../components/avatar';
import Button from '../components/button/Button';
import RegularPageWrapper from '../components/RegularPageWrapper';
import { Copy, UserPlus, Globe, Twitter, Instagram } from 'lucide-react';
import { formatWalletAddress } from '../utils/formatWalletAddress';
import SlidingTabs from '../components/SlidingTabs';
import NFTCard from '../components/NFTCard';
import NFTCollectionCard from '../components/NFTCollectionCard';



const ProfilePage = () => {
  // SlidingTabs and NFT data must be inside the component body for hooks
  const [activeTab, setActiveTab] = useState(0);
  const createdNFTs = [
    { image: '/nft-1.png', title: 'NFT 1', creatorImage: '/avat.png', creatorName: 'Jack Smith', price: '1.2 ETH', highestBid: '0.8 ETH' },
    { image: '/nft-2.png', title: 'NFT 2', creatorImage: '/avat.png', creatorName: 'Jack Smith', price: '2.1 ETH', highestBid: '1.5 ETH' },
  ];
  const ownedNFTs = [
    { image: '/nft-3.png', title: 'NFT 3', creatorImage: '/avat.png', creatorName: 'Jack Smith', price: '0.9 ETH', highestBid: '0.5 ETH' },
  ];
  const collections = [
    { image: '/collectibles.png', title: 'Cool Collection', items: 12, owner: 'Jack Smith' },
    { image: '/collectibles.png', title: 'Rare Art', items: 8, owner: 'Jack Smith' },
  ];
  const tabs = [
    { label: 'Created', count: createdNFTs.length },
    { label: 'Owned', count: ownedNFTs.length },
    { label: 'Collection', count: collections.length },
  ];

  return (
    <RegularPageWrapper>
      <div className="bg-background text-main min-h-screen ">
        {/* Banner and Avatar */}
        <div className="relative w-full h-56 md:h-72 bg-gradient-to-r from-primary to-secondary flex items-end">
          <img src="/profile-banner.png" alt="Profile Banner" className="w-full h-full object-cover absolute object-center opacity-80" />
          <div className="container max-w-6xl relative flex items-end h-full">
            <div className="absolute left-6 md:left-10 bottom-0 translate-y-1/2 z-10">
              <Avatar image={'/avat.png'} name='Jack Smith' size={'3xl'} />
            </div>
          </div>
        </div>

        {/* Main Profile Info */}
        <div className="container max-w-6xl flex flex-col md:flex-row md:items-end gap-6 mt-24 md:mt-32">
          {/* Left: Name, @, Stats, Bio, Links */}
          <div className="flex-1 min-w-0">
            <div className='flex justify-between items-center'>
                <div>
                    <h1 className="text-main font-extrabold text-4xl leading-tight">Jack Smith</h1>
                    <div className="text-muted text-lg font-mono mb-2">@jacksmith</div>
                </div>
                <div className="flex  gap-4 items-center ">
                    <Button
                        size='md'
                        variant='primary'
                        sxclass='px-6 flex items-center gap-2'
                        icon={<Copy size={18} />}
                    >
                    {formatWalletAddress('0x1234567890abcdef1234567890abcdef1234')}
                    </Button>
                    <Button
                        size='md'
                        variant='outline'
                        sxclass='px-6 flex items-center gap-2'
                        icon={<UserPlus size={18} />}
                    >
                    Follow
                    </Button>
                </div>
            </div>
            {/* Stats */}
            <div className="flex gap-8 mt-4 mb-4 flex-wrap">
              <div className="flex flex-col min-w-[90px]">
                <span className="text-2xl font-bold">12.4 ETH</span>
                <span className="text-muted text-sm">Volume</span>
              </div>
              <div className="flex flex-col min-w-[90px]">
                <span className="text-2xl font-bold">27</span>
                <span className="text-muted text-sm">NFTs Sold</span>
              </div>
              <div className="flex flex-col min-w-[90px]">
                <span className="text-2xl font-bold">1,234</span>
                <span className="text-muted text-sm">Followers</span>
              </div>
            </div>
            {/* Bio */}
            <div className="max-w-xl w-full mt-2">
              <span className='text-muted text-lg'>Bio</span>
              <p className="text-lg text-main">Digital artist & NFT enthusiast. Creating unique collectibles and exploring the world of web3. Open for collaborations!</p>
            </div>
            {/* Links as icons */}
            <div className='mt-4'>
              <span className='text-muted text-lg'>Links</span>
              <div className="flex gap-4 mt-2">
                <a href="#" className="text-muted hover:text-primary" aria-label="Website"><Globe size={24} /></a>
                <a href="#" className="text-muted hover:text-primary" aria-label="Twitter"><Twitter size={24} /></a>
                <a href="#" className="text-muted hover:text-primary" aria-label="Instagram"><Instagram size={24} /></a>
              </div>
            </div>
          </div>         
        </div>

        {/* Sliding Tabs Section */}
        <div className="mt-16">
          <SlidingTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div className="bg-surface pb-20">
            <div className="container max-w-6xl bg-surface pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {activeTab === 0 && createdNFTs.map((nft, i) => (
                <NFTCard key={i} {...nft} backgroundColor="bg-background" />
              ))}
              {activeTab === 1 && ownedNFTs.map((nft, i) => (
                <NFTCard key={i} {...nft} backgroundColor="bg-background" />
              ))}
              {activeTab === 2 && collections.map((col, i) => (
                <NFTCollectionCard key={i} {...col} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default ProfilePage;
