import { publicClient } from '../lib/viemClient';
import { registerWatcher } from '../lib/poller';
import { Listing } from '../models/listing.model';
import { Bid } from '../models/bid.model';
import { Activity } from '../models/activity.model';
import { NFT } from '../models/nft.model';
import { parseAbiItem, parseAbi, type Address } from 'viem';

const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;
const DEPLOY_BLOCK = BigInt(process.env.MARKETPLACE_DEPLOY_BLOCK || '0');

const MARKETPLACE_READ_ABI = parseAbi([
  'function getListing(uint256 listingId) view returns (address seller, address nft, uint256 tokenId, uint8 saleType, uint256 highestBid, address highestBidder, uint256 endTime, uint256 startingBid, uint256 price, bool ended)',
]);

const events = {
  ListingCreated:   parseAbiItem('event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint8 saleType, uint256 price)'),
  SaleCompleted:    parseAbiItem('event SaleCompleted(uint256 indexed listingId, address indexed buyer, uint256 amount)'),
  BidPlaced:        parseAbiItem('event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)'),
  ListingCancelled: parseAbiItem('event ListingCancelled(uint256 indexed listingId)'),
  PriceUpdated:     parseAbiItem('event PriceUpdated(uint256 indexed listingId, uint256 newPrice)'),
  RefundStored:     parseAbiItem('event RefundStored(uint256 indexed listingId, address indexed bidder, uint256 amount)'),
};

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleListingCreated(log: {
  args: { listingId?: bigint; seller?: string; nft?: string; tokenId?: bigint; saleType?: number; price?: bigint };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
}) {
  const { listingId, seller, nft, tokenId, saleType, price } = log.args;
  const type = (saleType as number) === 1 ? 'fixed' : 'auction';

  await Listing.findOneAndUpdate(
    { listingId: listingId!.toString() },
    {
      listingId:   listingId!.toString(),
      type,
      collection:  (nft as string).toLowerCase(),
      tokenId:     tokenId!.toString(),
      seller:      (seller as string).toLowerCase(),
      price:       price!.toString(),
      status:      'active',
      blockNumber: Number(log.blockNumber),
      txHash:      log.transactionHash,
    },
    { upsert: true, new: true }
  );

  if (type === 'auction') {
    try {
      const onChainListing = await publicClient.readContract({
        address:      MARKETPLACE_CONTRACT_ADDRESS,
        abi:          MARKETPLACE_READ_ABI,
        functionName: 'getListing',
        args:         [listingId!],
      });
      const endTime = onChainListing[6] as bigint;
      if (endTime && endTime > 0n) {
        await Listing.findOneAndUpdate(
          { listingId: listingId!.toString() },
          { endTime: new Date(Number(endTime) * 1000) }
        );
      }
    } catch (err) {
      console.error(`Failed to fetch endTime for auction #${listingId!.toString()}:`, err);
    }
  }

  await Activity.findOneAndUpdate(
    { txHash: log.transactionHash, type: 'list' },
    {
      type:        'list',
      collection:  (nft as string).toLowerCase(),
      tokenId:     tokenId!.toString(),
      from:        (seller as string).toLowerCase(),
      price:       price!.toString(),
      listingId:   listingId!.toString(),
      blockNumber: Number(log.blockNumber),
      txHash:      log.transactionHash,
    },
    { upsert: true }
  );
  console.log(`📋 Listing created: #${listingId!.toString()}`);
}

async function handleBidPlaced(log: {
  args: { listingId?: bigint; bidder?: string; amount?: bigint };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
}) {
  const { listingId, bidder, amount } = log.args;

  await Bid.findOneAndUpdate(
    { txHash: log.transactionHash },
    {
      listingId:   listingId!.toString(),
      bidder:      (bidder as string).toLowerCase(),
      amount:      amount!.toString(),
      timestamp:   new Date(),
      blockNumber: Number(log.blockNumber),
      txHash:      log.transactionHash,
    },
    { upsert: true }
  );

  const listing = await Listing.findOneAndUpdate(
    { listingId: listingId!.toString() },
    {
      highestBid:    amount!.toString(),
      highestBidder: (bidder as string).toLowerCase(),
    },
    { new: true }
  );

  if (listing) {
    await Activity.findOneAndUpdate(
      { txHash: log.transactionHash, type: 'bid' },
      {
        type:        'bid',
        collection:  listing.collection,
        tokenId:     listing.tokenId,
        from:        (bidder as string).toLowerCase(),
        price:       amount!.toString(),
        listingId:   listingId!.toString(),
        blockNumber: Number(log.blockNumber),
        txHash:      log.transactionHash,
      },
      { upsert: true }
    );
  }
  console.log(`🤝 Bid placed on #${listingId!.toString()}`);
}

async function handleSaleCompleted(log: {
  args: { listingId?: bigint; buyer?: string; amount?: bigint };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
}) {
  const { listingId, buyer, amount } = log.args;

  const listing = await Listing.findOneAndUpdate(
    { listingId: listingId!.toString() },
    { status: 'sold', buyer: (buyer as string).toLowerCase() },
    { new: true }
  );

  if (listing) {
    await NFT.findOneAndUpdate(
      { collection: listing.collection, tokenId: listing.tokenId },
      { owner: (buyer as string).toLowerCase() }
    );
    await Activity.findOneAndUpdate(
      { txHash: log.transactionHash, type: 'sale' },
      {
        type:        'sale',
        collection:  listing.collection,
        tokenId:     listing.tokenId,
        from:        listing.seller,
        to:          (buyer as string).toLowerCase(),
        price:       amount!.toString(),
        listingId:   listingId!.toString(),
        blockNumber: Number(log.blockNumber),
        txHash:      log.transactionHash,
      },
      { upsert: true }
    );
  }
  console.log(`💰 Sale completed: #${listingId!.toString()}`);
}

async function handleListingCancelled(log: {
  args: { listingId?: bigint };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
}) {
  const { listingId } = log.args;

  const listing = await Listing.findOneAndUpdate(
    { listingId: listingId!.toString() },
    { status: 'cancelled' },
    { new: true }
  );

  if (listing) {
    await Activity.findOneAndUpdate(
      { txHash: log.transactionHash, type: 'cancel' },
      {
        type:        'cancel',
        collection:  listing.collection,
        tokenId:     listing.tokenId,
        from:        listing.seller,
        listingId:   listingId!.toString(),
        blockNumber: Number(log.blockNumber),
        txHash:      log.transactionHash,
      },
      { upsert: true }
    );
  }
  console.log(`❌ Listing cancelled: #${listingId!.toString()}`);
}

async function handlePriceUpdated(log: {
  args: { listingId?: bigint; newPrice?: bigint };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
}) {
  const { listingId, newPrice } = log.args;

  const listing = await Listing.findOneAndUpdate(
    { listingId: listingId!.toString() },
    { price: newPrice!.toString() },
    { new: true }
  );

  if (listing) {
    await Activity.findOneAndUpdate(
      { txHash: log.transactionHash, type: 'price_update' },
      {
        type:        'price_update',
        collection:  listing.collection,
        tokenId:     listing.tokenId,
        from:        listing.seller,
        price:       newPrice!.toString(),
        listingId:   listingId!.toString(),
        blockNumber: Number(log.blockNumber),
        txHash:      log.transactionHash,
      },
      { upsert: true }
    );
  }
  console.log(`💲 Price updated: #${listingId!.toString()}`);
}

// ── Register all marketplace events with the shared poller ────────────────────

export async function startMarketplaceIndexer() {
  console.log('👁  Marketplace indexer started');

  registerWatcher('Marketplace:ListingCreated', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.ListingCreated, fromBlock, toBlock });
    for (const log of logs) {
      try { await handleListingCreated(log as Parameters<typeof handleListingCreated>[0]); }
      catch (err) { console.error('Error indexing ListingCreated:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher('Marketplace:BidPlaced', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.BidPlaced, fromBlock, toBlock });
    for (const log of logs) {
      try { await handleBidPlaced(log as Parameters<typeof handleBidPlaced>[0]); }
      catch (err) { console.error('Error indexing BidPlaced:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher('Marketplace:SaleCompleted', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.SaleCompleted, fromBlock, toBlock });
    for (const log of logs) {
      try { await handleSaleCompleted(log as Parameters<typeof handleSaleCompleted>[0]); }
      catch (err) { console.error('Error indexing SaleCompleted:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher('Marketplace:ListingCancelled', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.ListingCancelled, fromBlock, toBlock });
    for (const log of logs) {
      try { await handleListingCancelled(log as Parameters<typeof handleListingCancelled>[0]); }
      catch (err) { console.error('Error indexing ListingCancelled:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher('Marketplace:PriceUpdated', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.PriceUpdated, fromBlock, toBlock });
    for (const log of logs) {
      try { await handlePriceUpdated(log as Parameters<typeof handlePriceUpdated>[0]); }
      catch (err) { console.error('Error indexing PriceUpdated:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher('Marketplace:RefundStored', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.RefundStored, fromBlock, toBlock });
    for (const log of logs) {
      const { bidder, amount } = log.args;
      console.log(`💸 Refund stored for ${bidder as string}: ${amount!.toString()} wei`);
    }
  }, DEPLOY_BLOCK);
}






// import { publicClient } from '../lib/viemClient';
// import { Listing } from '../models/listing.model';
// import { Bid } from '../models/bid.model';
// import { Activity } from '../models/activity.model';
// import { NFT } from '../models/nft.model';
// import { parseAbiItem, parseAbi, type Address } from 'viem';

// const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;

// const MARKETPLACE_READ_ABI = parseAbi([
//   'function getListing(uint256 listingId) view returns (address seller, address nft, uint256 tokenId, uint8 saleType, uint256 highestBid, address highestBidder, uint256 endTime, uint256 startingBid, uint256 price, bool ended)',
// ]);

// const events = {
//   ListingCreated: parseAbiItem(
//     'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint8 saleType, uint256 price)'
//   ),
//   SaleCompleted: parseAbiItem(
//     'event SaleCompleted(uint256 indexed listingId, address indexed buyer, uint256 amount)'
//   ),
//   BidPlaced: parseAbiItem(
//     'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)'
//   ),
//   ListingCancelled: parseAbiItem(
//     'event ListingCancelled(uint256 indexed listingId)'
//   ),
//   PriceUpdated: parseAbiItem(
//     'event PriceUpdated(uint256 indexed listingId, uint256 newPrice)'
//   ),
//   RefundStored: parseAbiItem(
//     'event RefundStored(uint256 indexed listingId, address indexed bidder, uint256 amount)'
//   ),
// };

// // ── Handlers ──────────────────────────────────────────────────────────────────

// async function handleListingCreated(log: {
//   args: { listingId?: bigint; seller?: string; nft?: string; tokenId?: bigint; saleType?: number; price?: bigint };
//   blockNumber: bigint | null;
//   transactionHash: `0x${string}` | null;
// }) {
//   const { listingId, seller, nft, tokenId, saleType, price } = log.args;
//   const type = (saleType as number) === 1 ? 'fixed' : 'auction';

//   await Listing.findOneAndUpdate(
//     { listingId: listingId!.toString() },
//     {
//       listingId:   listingId!.toString(),
//       type,
//       collection:  (nft as string).toLowerCase(),
//       tokenId:     tokenId!.toString(),
//       seller:      (seller as string).toLowerCase(),
//       price:       price!.toString(),
//       status:      'active',
//       blockNumber: Number(log.blockNumber),
//       txHash:      log.transactionHash,
//     },
//     { upsert: true, new: true }
//   );

//   if (type === 'auction') {
//     try {
//       const onChainListing = await publicClient.readContract({
//         address:      MARKETPLACE_CONTRACT_ADDRESS,
//         abi:          MARKETPLACE_READ_ABI,
//         functionName: 'getListing',
//         args:         [listingId!],
//       });
//       const endTime = onChainListing[6] as bigint;
//       if (endTime && endTime > 0n) {
//         await Listing.findOneAndUpdate(
//           { listingId: listingId!.toString() },
//           { endTime: new Date(Number(endTime) * 1000) }
//         );
//       }
//     } catch (err) {
//       console.error(`Failed to fetch endTime for auction #${listingId!.toString()}:`, err);
//     }
//   }

//   await Activity.findOneAndUpdate(
//     { txHash: log.transactionHash, type: 'list' },
//     {
//       type:        'list',
//       collection:  (nft as string).toLowerCase(),
//       tokenId:     tokenId!.toString(),
//       from:        (seller as string).toLowerCase(),
//       price:       price!.toString(),
//       listingId:   listingId!.toString(),
//       blockNumber: Number(log.blockNumber),
//       txHash:      log.transactionHash,
//     },
//     { upsert: true }
//   );
// }

// async function handleBidPlaced(log: {
//   args: { listingId?: bigint; bidder?: string; amount?: bigint };
//   blockNumber: bigint | null;
//   transactionHash: `0x${string}` | null;
// }) {
//   const { listingId, bidder, amount } = log.args;

//   await Bid.findOneAndUpdate(
//     { txHash: log.transactionHash },
//     {
//       listingId:   listingId!.toString(),
//       bidder:      (bidder as string).toLowerCase(),
//       amount:      amount!.toString(),
//       timestamp:   new Date(),
//       blockNumber: Number(log.blockNumber),
//       txHash:      log.transactionHash,
//     },
//     { upsert: true }
//   );

//   const listing = await Listing.findOneAndUpdate(
//     { listingId: listingId!.toString() },
//     {
//       highestBid:    amount!.toString(),
//       highestBidder: (bidder as string).toLowerCase(),
//     },
//     { new: true }
//   );

//   if (listing) {
//     await Activity.findOneAndUpdate(
//       { txHash: log.transactionHash, type: 'bid' },
//       {
//         type:        'bid',
//         collection:  listing.collection,
//         tokenId:     listing.tokenId,
//         from:        (bidder as string).toLowerCase(),
//         price:       amount!.toString(),
//         listingId:   listingId!.toString(),
//         blockNumber: Number(log.blockNumber),
//         txHash:      log.transactionHash,
//       },
//       { upsert: true }
//     );
//   }
// }

// async function handleSaleCompleted(log: {
//   args: { listingId?: bigint; buyer?: string; amount?: bigint };
//   blockNumber: bigint | null;
//   transactionHash: `0x${string}` | null;
// }) {
//   const { listingId, buyer, amount } = log.args;

//   const listing = await Listing.findOneAndUpdate(
//     { listingId: listingId!.toString() },
//     { status: 'sold', buyer: (buyer as string).toLowerCase() },
//     { new: true }
//   );

//   if (listing) {
//     await NFT.findOneAndUpdate(
//       { collection: listing.collection, tokenId: listing.tokenId },
//       { owner: (buyer as string).toLowerCase() }
//     );

//     await Activity.findOneAndUpdate(
//       { txHash: log.transactionHash, type: 'sale' },
//       {
//         type:        'sale',
//         collection:  listing.collection,
//         tokenId:     listing.tokenId,
//         from:        listing.seller,
//         to:          (buyer as string).toLowerCase(),
//         price:       amount!.toString(),
//         listingId:   listingId!.toString(),
//         blockNumber: Number(log.blockNumber),
//         txHash:      log.transactionHash,
//       },
//       { upsert: true }
//     );
//   }
// }

// async function handleListingCancelled(log: {
//   args: { listingId?: bigint };
//   blockNumber: bigint | null;
//   transactionHash: `0x${string}` | null;
// }) {
//   const { listingId } = log.args;

//   const listing = await Listing.findOneAndUpdate(
//     { listingId: listingId!.toString() },
//     { status: 'cancelled' },
//     { new: true }
//   );

//   if (listing) {
//     await Activity.findOneAndUpdate(
//       { txHash: log.transactionHash, type: 'cancel' },
//       {
//         type:        'cancel',
//         collection:  listing.collection,
//         tokenId:     listing.tokenId,
//         from:        listing.seller,
//         listingId:   listingId!.toString(),
//         blockNumber: Number(log.blockNumber),
//         txHash:      log.transactionHash,
//       },
//       { upsert: true }
//     );
//   }
// }

// async function handlePriceUpdated(log: {
//   args: { listingId?: bigint; newPrice?: bigint };
//   blockNumber: bigint | null;
//   transactionHash: `0x${string}` | null;
// }) {
//   const { listingId, newPrice } = log.args;

//   const listing = await Listing.findOneAndUpdate(
//     { listingId: listingId!.toString() },
//     { price: newPrice!.toString() },
//     { new: true }
//   );

//   if (listing) {
//     await Activity.findOneAndUpdate(
//       { txHash: log.transactionHash, type: 'price_update' },
//       {
//         type:        'price_update',
//         collection:  listing.collection,
//         tokenId:     listing.tokenId,
//         from:        listing.seller,
//         price:       newPrice!.toString(),
//         listingId:   listingId!.toString(),
//         blockNumber: Number(log.blockNumber),
//         txHash:      log.transactionHash,
//       },
//       { upsert: true }
//     );
//   }
// }

// // ── Live watchers only — no historical backfill ───────────────────────────────

// export async function startMarketplaceIndexer() {
//   console.log('👁  Marketplace indexer started (live only)');

//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.ListingCreated],
//     eventName: 'ListingCreated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         try {
//           await handleListingCreated(log as Parameters<typeof handleListingCreated>[0]);
//           console.log(`📋 Listing created: #${log.args.listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing ListingCreated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace ListingCreated error:', err),
//   });

//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.BidPlaced],
//     eventName: 'BidPlaced',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         try {
//           await handleBidPlaced(log as Parameters<typeof handleBidPlaced>[0]);
//           console.log(`🤝 Bid placed on #${log.args.listingId!.toString()}: ${log.args.amount!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing BidPlaced:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace BidPlaced error:', err),
//   });

//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.SaleCompleted],
//     eventName: 'SaleCompleted',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         try {
//           await handleSaleCompleted(log as Parameters<typeof handleSaleCompleted>[0]);
//           console.log(`💰 Sale completed: #${log.args.listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing SaleCompleted:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace SaleCompleted error:', err),
//   });

//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.ListingCancelled],
//     eventName: 'ListingCancelled',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         try {
//           await handleListingCancelled(log as Parameters<typeof handleListingCancelled>[0]);
//           console.log(`❌ Listing cancelled: #${log.args.listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing ListingCancelled:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace ListingCancelled error:', err),
//   });

//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.PriceUpdated],
//     eventName: 'PriceUpdated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         try {
//           await handlePriceUpdated(log as Parameters<typeof handlePriceUpdated>[0]);
//           console.log(`💲 Price updated: #${log.args.listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing PriceUpdated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace PriceUpdated error:', err),
//   });

//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.RefundStored],
//     eventName: 'RefundStored',
//     onLogs: (logs) => {
//       for (const log of logs) {
//         const { bidder, amount } = log.args;
//         console.log(`💸 Refund stored for ${bidder as string}: ${amount!.toString()} wei`);
//       }
//     },
//     onError: (err) => console.error('Marketplace RefundStored error:', err),
//   });
// }