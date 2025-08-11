



interface NFTCardProps {
  image: string;
  title: string;
  creatorImage: string;
  creatorName: string;
  price: string;
  highestBid: string;
  backgroundColor?: string; // tailwind class
}

const NFTCard: React.FC<NFTCardProps> = ({ image, title, creatorImage, creatorName, price, highestBid, backgroundColor }) => {
  return (
    <div className={`${backgroundColor || 'bg-surface'} rounded-[20px] group transition-all duration-300 hover:shadow-xl cursor-pointer`}>
      <div className="w-full h-[250px] relative overflow-hidden rounded-t-[20px]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="px-4 py-6">
          <h3 className="text-xl font-semibold text-main">{title}</h3>
          <div className="flex items-center space-x-2 mt-2">
            <img src={creatorImage} alt="Creator Avatar" className="w-8 h-8 rounded-full" />
            <p className="text-sm text-main">{creatorName}</p>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div>
                <span className="text-muted text-sm leading-tight">Price</span>
                <p className="text-main text-lg leading-none">{price}</p>
            </div>
            <div>
                <span className="text-muted text-sm leading-tight">Highest Bid</span>
                <p className="text-main text-lg leading-none">{highestBid}</p>
            </div>
          </div>
      </div>
    </div>
  )
}

export default NFTCard
