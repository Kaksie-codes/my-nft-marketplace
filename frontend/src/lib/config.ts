// contracts/config.ts
// Contract addresses on Sepolia testnet
export const CONTRACT_ADDRESSES = { 
  marketplace: '0xeF4EBFc6CD4a6af7De32A84cE8Fe3c91ca8692D0',
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