import { publicClient } from '../lib/viemClient';
import { Listing } from '../models/listing.model';
import { Bid } from '../models/bid.model';
import { Activity } from '../models/activity.model';
import { NFT } from '../models/nft.model';
import { parseAbiItem, parseAbi, type Address } from 'viem';

const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;

// The block your marketplace contract was deployed at.
// Set this in your .env to avoid scanning from block 0 every time.
// Example: MARKETPLACE_DEPLOY_BLOCK=6500000
const DEPLOY_BLOCK = BigInt(process.env.MARKETPLACE_DEPLOY_BLOCK || '0');

const MARKETPLACE_READ_ABI = parseAbi([
  'function getListing(uint256 listingId) view returns (address seller, address nft, uint256 tokenId, uint8 saleType, uint256 highestBid, address highestBidder, uint256 endTime, uint256 startingBid, uint256 price, bool ended)',
]);

const events = {
  ListingCreated: parseAbiItem(
    'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint8 saleType, uint256 price)'
  ),
  SaleCompleted: parseAbiItem(
    'event SaleCompleted(uint256 indexed listingId, address indexed buyer, uint256 amount)'
  ),
  BidPlaced: parseAbiItem(
    'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)'
  ),
  ListingCancelled: parseAbiItem(
    'event ListingCancelled(uint256 indexed listingId)'
  ),
  PriceUpdated: parseAbiItem(
    'event PriceUpdated(uint256 indexed listingId, uint256 newPrice)'
  ),
  RefundStored: parseAbiItem(
    'event RefundStored(uint256 indexed listingId, address indexed bidder, uint256 amount)'
  ),
};

// ── Handlers (shared between historical sync and live watchers) ───────────────

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

  // Upsert activity — txHash uniqueness prevents duplicates on re-sync
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
}

async function handleBidPlaced(log: {
  args: { listingId?: bigint; bidder?: string; amount?: bigint };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
}) {
  const { listingId, bidder, amount } = log.args;

  // Upsert bid — prevents duplicates if sync runs multiple times
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
}

// ── Historical backfill ───────────────────────────────────────────────────────
// Reads ALL past events from DEPLOY_BLOCK to now, in order, and processes them.
// Uses upsert throughout so re-running is safe — no duplicates created.
// getLogs fetches up to ~2000 blocks at a time on most RPCs; Alchemy/Infura
// allow larger ranges. If you hit RPC limits, reduce CHUNK_SIZE below.

async function syncHistoricalEvents() {
  console.log('🔄 Starting historical marketplace sync...');

  try {
    const latestBlock = await publicClient.getBlockNumber();
    const CHUNK_SIZE  = 10_000n; // reduce if your RPC limits log range

    // Process all event types in chronological order using getLogs.
    // We fetch all events in one pass per chunk so ordering is preserved.
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= latestBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = fromBlock + CHUNK_SIZE - 1n < latestBlock
        ? fromBlock + CHUNK_SIZE - 1n
        : latestBlock;

      const [
        listingLogs,
        bidLogs,
        saleLogs,
        cancelLogs,
        priceLogs,
      ] = await Promise.all([
        publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.ListingCreated,  fromBlock, toBlock }),
        publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.BidPlaced,       fromBlock, toBlock }),
        publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.SaleCompleted,   fromBlock, toBlock }),
        publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.ListingCancelled,fromBlock, toBlock }),
        publicClient.getLogs({ address: MARKETPLACE_CONTRACT_ADDRESS, event: events.PriceUpdated,    fromBlock, toBlock }),
      ]);

      // Sort all logs by blockNumber + logIndex so they're processed in
      // the exact order they occurred on-chain
      const allLogs = [
        ...listingLogs.map(l => ({ ...l, _type: 'listing'  as const })),
        ...bidLogs    .map(l => ({ ...l, _type: 'bid'      as const })),
        ...saleLogs   .map(l => ({ ...l, _type: 'sale'     as const })),
        ...cancelLogs .map(l => ({ ...l, _type: 'cancel'   as const })),
        ...priceLogs  .map(l => ({ ...l, _type: 'price'    as const })),
      ].sort((a, b) => {
        const blockDiff = Number(a.blockNumber) - Number(b.blockNumber);
        if (blockDiff !== 0) return blockDiff;
        return Number(a.logIndex) - Number(b.logIndex);
      });

      for (const log of allLogs) {
        try {
          if (log._type === 'listing') await handleListingCreated(log as Parameters<typeof handleListingCreated>[0]);
          if (log._type === 'bid')     await handleBidPlaced(log as Parameters<typeof handleBidPlaced>[0]);
          if (log._type === 'sale')    await handleSaleCompleted(log as Parameters<typeof handleSaleCompleted>[0]);
          if (log._type === 'cancel')  await handleListingCancelled(log as Parameters<typeof handleListingCancelled>[0]);
          if (log._type === 'price')   await handlePriceUpdated(log as Parameters<typeof handlePriceUpdated>[0]);
        } catch (err) {
          console.error(`Error processing historical log (${log._type}, tx: ${log.transactionHash}):`, err);
        }
      }

      if (allLogs.length > 0) {
        console.log(`✅ Synced blocks ${fromBlock}–${toBlock}: ${allLogs.length} events`);
      }
    }

    console.log('✅ Historical marketplace sync complete');
  } catch (err) {
    console.error('❌ Historical sync failed:', err);
  }
}

// ── Live watchers ─────────────────────────────────────────────────────────────

export async function startMarketplaceIndexer() {
  console.log('👁  Marketplace indexer started');

  // Backfill all past events first, then start live watchers.
  // This ensures bids/listings placed before the server started are in MongoDB.
  await syncHistoricalEvents();

  // ── ListingCreated ──
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.ListingCreated],
    eventName: 'ListingCreated',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          await handleListingCreated(log as Parameters<typeof handleListingCreated>[0]);
          console.log(`📋 Listing created: #${log.args.listingId!.toString()}`);
        } catch (err) {
          console.error('Error indexing ListingCreated:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace ListingCreated error:', err),
  });

  // ── BidPlaced ──
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.BidPlaced],
    eventName: 'BidPlaced',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          await handleBidPlaced(log as Parameters<typeof handleBidPlaced>[0]);
          console.log(`🤝 Bid placed on #${log.args.listingId!.toString()}: ${log.args.amount!.toString()}`);
        } catch (err) {
          console.error('Error indexing BidPlaced:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace BidPlaced error:', err),
  });

  // ── SaleCompleted ──
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.SaleCompleted],
    eventName: 'SaleCompleted',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          await handleSaleCompleted(log as Parameters<typeof handleSaleCompleted>[0]);
          console.log(`💰 Sale completed: #${log.args.listingId!.toString()}`);
        } catch (err) {
          console.error('Error indexing SaleCompleted:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace SaleCompleted error:', err),
  });

  // ── ListingCancelled ──
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.ListingCancelled],
    eventName: 'ListingCancelled',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          await handleListingCancelled(log as Parameters<typeof handleListingCancelled>[0]);
          console.log(`❌ Listing cancelled: #${log.args.listingId!.toString()}`);
        } catch (err) {
          console.error('Error indexing ListingCancelled:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace ListingCancelled error:', err),
  });

  // ── PriceUpdated ──
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.PriceUpdated],
    eventName: 'PriceUpdated',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          await handlePriceUpdated(log as Parameters<typeof handlePriceUpdated>[0]);
          console.log(`💲 Price updated: #${log.args.listingId!.toString()}`);
        } catch (err) {
          console.error('Error indexing PriceUpdated:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace PriceUpdated error:', err),
  });

  // ── RefundStored (observability only) ──
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.RefundStored],
    eventName: 'RefundStored',
    onLogs: (logs) => {
      for (const log of logs) {
        const { bidder, amount } = log.args;
        console.log(`💸 Refund stored for ${bidder as string}: ${amount!.toString()} wei`);
      }
    },
    onError: (err) => console.error('Marketplace RefundStored error:', err),
  });
}






// import { publicClient } from '../lib/viemClient';
// import { Listing } from '../models/listing.model';
// import { Bid } from '../models/bid.model';
// import { Activity } from '../models/activity.model';
// import { NFT } from '../models/nft.model';
// import { parseAbiItem, parseAbi, type Address } from 'viem';

// const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;

// // ── Minimal read ABI — only what the indexer needs from the contract ─────────
// // Using parseAbi (not parseAbiItem) so readContract can infer the return type.
// // This avoids needing to copy the full ABI file from the frontend to the backend.
// const MARKETPLACE_READ_ABI = parseAbi([
//   'function getListing(uint256 listingId) view returns (address seller, address nft, uint256 tokenId, uint8 saleType, uint256 highestBid, address highestBidder, uint256 endTime, uint256 startingBid, uint256 price, bool ended)',
// ]);

// // ── Event ABIs ───────────────────────────────────────────────────────────────
// // Must match the contract EXACTLY — field names, types, and order.
// // Verified against the deployed contract ABI.

// const events = {
//   // Contract emits: listingId, seller, nft (address), tokenId, saleType (uint8), price
//   // NOTE: NO endTime in this event — fetched via getListing() for auctions
//   ListingCreated: parseAbiItem(
//     'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint8 saleType, uint256 price)'
//   ),

//   // Contract emits: SaleCompleted (NOT ListingSold), with `amount` (NOT `price`)
//   SaleCompleted: parseAbiItem(
//     'event SaleCompleted(uint256 indexed listingId, address indexed buyer, uint256 amount)'
//   ),

//   // AuctionEnded is NOT in the deployed contract ABI — removed to avoid silent failures.
//   // Auction completion is handled via SaleCompleted.

//   BidPlaced: parseAbiItem(
//     'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)'
//   ),

//   ListingCancelled: parseAbiItem(
//     'event ListingCancelled(uint256 indexed listingId)'
//   ),

//   PriceUpdated: parseAbiItem(
//     'event PriceUpdated(uint256 indexed listingId, uint256 newPrice)'
//   ),

//   // Matches contract: listingId indexed, bidder indexed
//   RefundStored: parseAbiItem(
//     'event RefundStored(uint256 indexed listingId, address indexed bidder, uint256 amount)'
//   ),
// };

// export function startMarketplaceIndexer() {
//   console.log('👁  Marketplace indexer started');

//   // ── ListingCreated ──────────────────────────────────────────────────────────
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.ListingCreated],
//     eventName: 'ListingCreated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         // Field names match contract: nft (not collection), saleType (not listingType)
//         // No endTime — not emitted by this event. Fetched on-chain for auctions below.
//         const { listingId, seller, nft, tokenId, saleType, price } = log.args;
//         const type = (saleType as number) === 1 ? 'fixed' : 'auction';

//         try {
//           await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             {
//               listingId:   listingId!.toString(),
//               type,
//               collection:  (nft as string).toLowerCase(), // stored as "collection" in DB
//               tokenId:     tokenId!.toString(),
//               seller:      (seller as string).toLowerCase(),
//               price:       price!.toString(),
//               status:      'active',
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             },
//             { upsert: true, new: true }
//           );

//           // For auctions: endTime is NOT in the event — read it from the contract.
//           // MARKETPLACE_READ_ABI uses parseAbi so the return type is fully inferred:
//           // onChainListing.endTime is typed as bigint — no `unknown` error.
//           if (type === 'auction') {
//             try {
//               const onChainListing = await publicClient.readContract({
//                 address:      MARKETPLACE_CONTRACT_ADDRESS,
//                 abi:          MARKETPLACE_READ_ABI,
//                 functionName: 'getListing',
//                 args:         [listingId!],
//               });
//               // Return type is a positional tuple — access by index, not name:
//               // [0] seller, [1] nft, [2] tokenId, [3] saleType, [4] highestBid,
//               // [5] highestBidder, [6] endTime, [7] startingBid, [8] price, [9] ended
//               const endTime = onChainListing[6] as bigint;
//               if (endTime && endTime > 0n) {
//                 await Listing.findOneAndUpdate(
//                   { listingId: listingId!.toString() },
//                   { endTime: new Date(Number(endTime) * 1000) }
//                 );
//               }
//             } catch (err) {
//               console.error(`Failed to fetch endTime for auction #${listingId!.toString()}:`, err);
//             }
//           }

//           await Activity.create({
//             type:        'list',
//             collection:  (nft as string).toLowerCase(),
//             tokenId:     tokenId!.toString(),
//             from:        (seller as string).toLowerCase(),
//             price:       price!.toString(),
//             listingId:   listingId!.toString(),
//             blockNumber: Number(log.blockNumber),
//             txHash:      log.transactionHash,
//           });

//           console.log(`📋 Listing created: #${listingId!.toString()} (${type})`);
//         } catch (err) {
//           console.error('Error indexing ListingCreated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace ListingCreated error:', err),
//   });

//   // ── SaleCompleted ───────────────────────────────────────────────────────────
//   // Handles BOTH fixed-price sales AND auction settlements.
//   // Was incorrectly named "ListingSold" before — contract emits "SaleCompleted".
//   // Field is "amount" not "price".
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.SaleCompleted],
//     eventName: 'SaleCompleted',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { listingId, buyer, amount } = log.args; // "amount" not "price"

//         try {
//           const listing = await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             { status: 'sold', buyer: (buyer as string).toLowerCase() },
//             { new: true }
//           );

//           if (listing) {
//             await NFT.findOneAndUpdate(
//               { collection: listing.collection, tokenId: listing.tokenId },
//               { owner: (buyer as string).toLowerCase() }
//             );

//             await Activity.create({
//               type:        'sale',
//               collection:  listing.collection,
//               tokenId:     listing.tokenId,
//               from:        listing.seller,
//               to:          (buyer as string).toLowerCase(),
//               price:       amount!.toString(),
//               listingId:   listingId!.toString(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             });
//           }

//           console.log(`💰 Sale completed: #${listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing SaleCompleted:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace SaleCompleted error:', err),
//   });

//   // ── BidPlaced ───────────────────────────────────────────────────────────────
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.BidPlaced],
//     eventName: 'BidPlaced',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { listingId, bidder, amount } = log.args;

//         try {
//           await Bid.create({
//             listingId:   listingId!.toString(),
//             bidder:      (bidder as string).toLowerCase(),
//             amount:      amount!.toString(),
//             timestamp:   new Date(),
//             blockNumber: Number(log.blockNumber),
//             txHash:      log.transactionHash,
//           });

//           // Single findOneAndUpdate: update highestBid AND return listing for activity
//           const listing = await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             {
//               highestBid:    amount!.toString(),
//               highestBidder: (bidder as string).toLowerCase(),
//             },
//             { new: true }
//           );

//           if (listing) {
//             await Activity.create({
//               type:        'bid',
//               collection:  listing.collection,
//               tokenId:     listing.tokenId,
//               from:        (bidder as string).toLowerCase(),
//               price:       amount!.toString(),
//               listingId:   listingId!.toString(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             });
//           }

//           console.log(`🤝 Bid placed on #${listingId!.toString()}: ${amount!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing BidPlaced:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace BidPlaced error:', err),
//   });

//   // ── ListingCancelled ────────────────────────────────────────────────────────
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.ListingCancelled],
//     eventName: 'ListingCancelled',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { listingId } = log.args;

//         try {
//           const listing = await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             { status: 'cancelled' },
//             { new: true }
//           );

//           if (listing) {
//             await Activity.create({
//               type:        'cancel',
//               collection:  listing.collection,
//               tokenId:     listing.tokenId,
//               from:        listing.seller,
//               listingId:   listingId!.toString(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             });
//           }

//           console.log(`❌ Listing cancelled: #${listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing ListingCancelled:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace ListingCancelled error:', err),
//   });

//   // ── PriceUpdated ────────────────────────────────────────────────────────────
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.PriceUpdated],
//     eventName: 'PriceUpdated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { listingId, newPrice } = log.args;

//         try {
//           const listing = await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             { price: newPrice!.toString() },
//             { new: true }
//           );

//           if (listing) {
//             await Activity.create({
//               type:        'price_update',
//               collection:  listing.collection,
//               tokenId:     listing.tokenId,
//               from:        listing.seller,
//               price:       newPrice!.toString(),
//               listingId:   listingId!.toString(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             });
//           }

//           console.log(`💲 Price updated: #${listingId!.toString()} → ${newPrice!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing PriceUpdated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace PriceUpdated error:', err),
//   });

//   // ── RefundStored ────────────────────────────────────────────────────────────
//   // Logged for observability only — refunds are tracked on-chain via
//   // pendingRefunds mapping. Frontend reads via getPendingRefund(address).
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