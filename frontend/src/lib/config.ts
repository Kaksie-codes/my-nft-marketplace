// contracts/config.ts
// Contract addresses on Sepolia testnet
export const CONTRACT_ADDRESSES = { 
  marketplace: '0xda9659C9E7db2A4A81d4c31a2F0De5B86c635CD9',
  nftCollectionFactory: '0xF902c910C07A02920687da8B8E29EF1C4cD49923', 
} as const;


// Event signatures for listening to contract events
export const EVENT_SIGNATURES = {
  ListingCreated: 'ListingCreated(uint256,address,address,uint256,uint8)',
  BidPlaced: 'BidPlaced(uint256,address,uint256)',
  SaleCompleted: 'SaleCompleted(uint256,address,uint256)',
  ListingCancelled: 'ListingCancelled(uint256)',
  Transfer: 'Transfer(address,address,uint256)', // ERC721 standard event
} as const;