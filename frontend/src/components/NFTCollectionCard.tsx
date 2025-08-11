import React from 'react';

interface NFTCollectionCardProps {
  image: string;
  title: string;
  items: number;
  owner: string;
}

const NFTCollectionCard: React.FC<NFTCollectionCardProps> = ({ image, title, items, owner }) => (
  <div className="bg-surface rounded-xl p-4 flex flex-col items-center shadow hover:shadow-lg transition-shadow">
    <img src={image} alt={title} className="w-32 h-32 object-cover rounded-lg mb-3" />
    <h3 className="text-lg font-bold text-main mb-1">{title}</h3>
    <div className="text-muted text-sm mb-1">{items} items</div>
    <div className="text-xs text-muted">By {owner}</div>
  </div>
);

export default NFTCollectionCard;
