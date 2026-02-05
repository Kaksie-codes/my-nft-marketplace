// contracts/config.ts
// Contract addresses on Sepolia testnet
export const CONTRACT_ADDRESSES = {
  nftCollection: '0x302b9fe8cb515f174f1bd1d896e3d727089cce6c', 
  marketplace: '0x75D0CE537602B55694BE9FD8F5384fFF264985b3',     
} as const;


// Event signatures for listening to contract events
export const EVENT_SIGNATURES = {
  ListingCreated: 'ListingCreated(uint256,address,address,uint256,uint8)',
  BidPlaced: 'BidPlaced(uint256,address,uint256)',
  SaleCompleted: 'SaleCompleted(uint256,address,uint256)',
  ListingCancelled: 'ListingCancelled(uint256)',
  Transfer: 'Transfer(address,address,uint256)', // ERC721 standard event
} as const;