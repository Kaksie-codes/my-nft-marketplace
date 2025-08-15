



import Avatar from '../components/avatar';
import Button from '../components/button/Button';
import { Globe, Clock, ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import PlaceBidModal from '../components/modals/PlaceBidModal';
import FlipCountdown from '../components/FlipCountdown';
import RegularPageWrapper from '../components/RegularPageWrapper';
import NFTCard from '../components/NFTCard';

const NFTDetailPage = () => {
  // Dummy data for demonstration
  const [isBidModalOpen, setBidModalOpen] = useState(false);
  const handleBidSubmit = (bidAmount: string) => {
    // Convert bidAmount to number if needed
    const amount = Number(bidAmount);
    setBidModalOpen(false);
    alert(`Bid placed: ${amount} ETH`);
  };
  const nft = {
    image: '/nft-1.png',
    name: 'Galactic Cat',
    mintedAt: '2025-08-01T14:00:00Z',
    creator: {
      name: 'Jack Smith',
      avatar: '/avat.png',
    },
  description: `A unique digital collectible from the Galactic series. This NFT represents the cosmic spirit of creativity and curiosity.

Galactic Cat is a one-of-a-kind NFT, meticulously crafted to capture the imagination of collectors and enthusiasts alike. The artwork features a cosmic feline drifting through a nebula of vibrant colors, symbolizing the boundless possibilities of the metaverse.

This NFT is part of a limited collection, each piece telling its own story within the Galactic universe. The artist, Jack Smith, is known for blending surrealism with digital innovation, and this piece is no exception.

Owning Galactic Cat grants you exclusive access to future drops, community events, and special collaborations. The NFT is stored securely on the Ethereum blockchain, ensuring authenticity and provenance.

The background of the piece is inspired by real astronomical imagery, while the cat itself is a playful nod to the curiosity that drives both artists and collectors in the NFT space.

Collectors can showcase Galactic Cat in virtual galleries, use it as a profile avatar, or simply enjoy it as a digital treasure. The NFT is compatible with major wallets and metaverse platforms.

This auction is your chance to own a piece of digital history. Place your bid and join the ranks of Galactic Cat owners who are shaping the future of art and technology.

For more information about the artist and the Galactic series, visit the official website or follow on social media. Thank you for supporting digital creativity!`,
    details: {
      etherscan: 'https://etherscan.io/',
      original: '/nft-1.png',
    },
    tags: ['Art', 'Cat', 'Galactic', 'Collectible'],
    auctionEnds: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 45), // 2 days 45 min from now
  };




  // Format mint date
  const mintedDate = new Date(nft.mintedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  // Tilt effect for NFT image
  const imgRef = useRef<HTMLImageElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const card = imgRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * 10; // max 10deg
    const rotateY = ((x - centerX) / centerX) * -10;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
  };
  const handleMouseLeave = () => {
    const card = imgRef.current;
    if (!card) return;
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    card.style.transition = 'transform 0.3s';
    setTimeout(() => {
      if (card) card.style.transition = '';
    }, 300);
  };

  return (
    <RegularPageWrapper>
        <div className="min-h-screen bg-background text-main">
          {/* Banner with NFT image and tilt effect */}
          <div
            className="w-full h-80 md:h-[420px] bg-gradient-to-r from-primary/80 to-secondary/80 flex items-center justify-center relative select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img
              ref={imgRef}
              src={nft.image}
              alt={nft.name}
              className="h-60 md:h-80 rounded-2xl shadow-xl object-contain z-10 bg-white/10 p-2 transition-transform duration-200 will-change-transform"
              draggable={false}
            />
          </div>
          {/* Main content */}
          <div className="container max-w-5xl mx-auto mt-10 flex flex-col md:flex-row gap-10">
            {/* Left: NFT info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-extrabold text-main mb-2">{nft.name}</h1>
              <div className="text-muted text-sm mb-4">Minted on {mintedDate}</div>
              {/* Creator */}
              <div className="flex items-center gap-3 mb-6">
                <Avatar image={nft.creator.avatar} name={nft.creator.name} size="md" />
                <span className="text-main font-semibold">{nft.creator.name}</span>
                <span className="text-muted text-xs ml-2">Creator</span>
              </div>
              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-muted mb-1">Description</h2>
                <p className="text-main text-base leading-relaxed">{nft.description}</p>
              </div>
              {/* Details */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-muted mb-1">Details</h2>
                <div className="flex flex-col gap-2">
                  <a href={nft.details.etherscan} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-main hover:text-primary hover:underline">
                    <Globe size={16} className='text-muted'/> View on Etherscan
                  </a>
                  <a href={nft.details.original} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-main hover:text-primary hover:underline">
                    <Globe size={16} className='text-muted'/> View Original
                  </a>
                </div>
              </div>
              {/* Tags */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-muted mb-1">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {nft.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-surface text-muted text-xs font-semibold">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Right: Auction card */}
            <div className="w-full md:w-80 flex-shrink-0">
              <div className="bg-surface rounded-2xl shadow-lg p-6 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 text-muted">
                  <Clock size={18} />
                  <span className="font-semibold">Auction ends in</span>
                </div>
                <FlipCountdown endTime={nft.auctionEnds} />
                <Button size="lg" variant="primary" sxclass="w-full mt-2" onClick={() => setBidModalOpen(true)}>Place Bid</Button>
                <PlaceBidModal
                  isOpen={isBidModalOpen}
                  onClose={() => setBidModalOpen(false)}
                  onSubmit={handleBidSubmit}
                />
              </div>
            </div>
          </div>
        {/* More from this artist section */}
        <div className="container max-w-5xl mx-auto mt-20 mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-main">More from this artist</h2>
            <Button 
                variant="outline" 
                size="md" 
                sxclass="px-6"
          icon={<ArrowRight size={18} />}
        >Go to Artist Page
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Dummy data for more NFTs from this artist */}
            {[
              { image: '/nft-2.png', title: 'Galactic Dog', creatorImage: '/avat.png', creatorName: 'Jack Smith', price: '1.5 ETH', highestBid: '1.1 ETH' },
              { image: '/nft-3.png', title: 'Galactic Bird', creatorImage: '/avat.png', creatorName: 'Jack Smith', price: '2.0 ETH', highestBid: '1.7 ETH' },
              { image: '/nft-1.png', title: 'Galactic Fish', creatorImage: '/avat.png', creatorName: 'Jack Smith', price: '1.1 ETH', highestBid: '0.9 ETH' },
            ].map((nft, i) => (
              <NFTCard key={i} {...nft} />
            ))}
          </div>
        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default NFTDetailPage;
