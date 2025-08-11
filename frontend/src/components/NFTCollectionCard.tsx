import React from 'react';

interface NFTCollectionCardProps {
  image: string;
  title: string;
  items: number;
  owner: string;
}


const NFTCollectionCard: React.FC<NFTCollectionCardProps> = ({ image, title, items, owner }) => (
  <div className="relative bg-background rounded-2xl shadow group hover:shadow-xl transition-shadow overflow-hidden flex flex-col items-stretch min-h-[320px]">
    <div className="relative w-full h-40 overflow-hidden">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute bottom-2 left-2 bg-background px-3 py-1 rounded-full text-xs font-semibold text-main shadow">
        {items} items
      </div>
    </div>
    <div className="flex-1 flex flex-col justify-between p-5">
      <div>
        <h3 className="text-xl font-bold text-main mb-1 truncate">{title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted">By</span>
          <span className="text-sm font-medium text-main truncate">{owner}</span>
        </div>
      </div>
      <button className="mt-6 w-full py-2 rounded-lg bg-primary text-white font-semibold text-sm shadow hover:bg-primary/90 transition">View Collection</button>
    </div>
  </div>
);

export default NFTCollectionCard;
