import { useState } from 'react';
import Button from '../button/Button';

interface PlaceBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bidAmount: string) => void;
}

const PlaceBidModal = ({ isOpen, onClose, onSubmit }: PlaceBidModalProps) => {
  const [bidAmount, setBidAmount] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-overlay backdrop-blur-sm">
      <div className="bg-modal rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-main">Place Your Bid</h2>
        <input
          type="number"
          min="0"
          step="0.01"
          value={bidAmount}
          onChange={e => setBidAmount(e.target.value)}
          placeholder="Enter bid amount (ETH)"
          className="w-full px-4 py-3 rounded-lg border border-surface bg-background text-main text-lg mb-4 focus:outline-none focus:border-primary"
        />
        <div className="flex gap-3 mt-4">
          <Button variant="outline" size="md" sxclass="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" sxclass="flex-1" onClick={() => onSubmit(bidAmount)}>Place Bid</Button>
        </div>
      </div>
    </div>
  );
};

export default PlaceBidModal;
