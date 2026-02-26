import { publicClient } from '../lib/viemClient';
import { Listing } from '../models/listing.model';
import { Bid } from '../models/bid.model';
import { Activity } from '../models/activity.model';
import { NFT } from '../models/nft.model';
import { parseAbiItem, parseAbi, type Address } from 'viem';

const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;

// ── Minimal read ABI — only what the indexer needs from the contract ─────────
// Using parseAbi (not parseAbiItem) so readContract can infer the return type.
// This avoids needing to copy the full ABI file from the frontend to the backend.
const MARKETPLACE_READ_ABI = parseAbi([
  'function getListing(uint256 listingId) view returns (address seller, address nft, uint256 tokenId, uint8 saleType, uint256 highestBid, address highestBidder, uint256 endTime, uint256 startingBid, uint256 price, bool ended)',
]);

// ── Event ABIs ───────────────────────────────────────────────────────────────
// Must match the contract EXACTLY — field names, types, and order.
// Verified against the deployed contract ABI.

const events = {
  // Contract emits: listingId, seller, nft (address), tokenId, saleType (uint8), price
  // NOTE: NO endTime in this event — fetched via getListing() for auctions
  ListingCreated: parseAbiItem(
    'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint8 saleType, uint256 price)'
  ),

  // Contract emits: SaleCompleted (NOT ListingSold), with `amount` (NOT `price`)
  SaleCompleted: parseAbiItem(
    'event SaleCompleted(uint256 indexed listingId, address indexed buyer, uint256 amount)'
  ),

  // AuctionEnded is NOT in the deployed contract ABI — removed to avoid silent failures.
  // Auction completion is handled via SaleCompleted.

  BidPlaced: parseAbiItem(
    'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)'
  ),

  ListingCancelled: parseAbiItem(
    'event ListingCancelled(uint256 indexed listingId)'
  ),

  PriceUpdated: parseAbiItem(
    'event PriceUpdated(uint256 indexed listingId, uint256 newPrice)'
  ),

  // Matches contract: listingId indexed, bidder indexed
  RefundStored: parseAbiItem(
    'event RefundStored(uint256 indexed listingId, address indexed bidder, uint256 amount)'
  ),
};

export function startMarketplaceIndexer() {
  console.log('👁  Marketplace indexer started');

  // ── ListingCreated ──────────────────────────────────────────────────────────
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.ListingCreated],
    eventName: 'ListingCreated',
    onLogs: async (logs) => {
      for (const log of logs) {
        // Field names match contract: nft (not collection), saleType (not listingType)
        // No endTime — not emitted by this event. Fetched on-chain for auctions below.
        const { listingId, seller, nft, tokenId, saleType, price } = log.args;
        const type = (saleType as number) === 1 ? 'fixed' : 'auction';

        try {
          await Listing.findOneAndUpdate(
            { listingId: listingId!.toString() },
            {
              listingId:   listingId!.toString(),
              type,
              collection:  (nft as string).toLowerCase(), // stored as "collection" in DB
              tokenId:     tokenId!.toString(),
              seller:      (seller as string).toLowerCase(),
              price:       price!.toString(),
              status:      'active',
              blockNumber: Number(log.blockNumber),
              txHash:      log.transactionHash,
            },
            { upsert: true, new: true }
          );

          // For auctions: endTime is NOT in the event — read it from the contract.
          // MARKETPLACE_READ_ABI uses parseAbi so the return type is fully inferred:
          // onChainListing.endTime is typed as bigint — no `unknown` error.
          if (type === 'auction') {
            try {
              const onChainListing = await publicClient.readContract({
                address:      MARKETPLACE_CONTRACT_ADDRESS,
                abi:          MARKETPLACE_READ_ABI,
                functionName: 'getListing',
                args:         [listingId!],
              });
              // Return type is a positional tuple — access by index, not name:
              // [0] seller, [1] nft, [2] tokenId, [3] saleType, [4] highestBid,
              // [5] highestBidder, [6] endTime, [7] startingBid, [8] price, [9] ended
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

          await Activity.create({
            type:        'list',
            collection:  (nft as string).toLowerCase(),
            tokenId:     tokenId!.toString(),
            from:        (seller as string).toLowerCase(),
            price:       price!.toString(),
            listingId:   listingId!.toString(),
            blockNumber: Number(log.blockNumber),
            txHash:      log.transactionHash,
          });

          console.log(`📋 Listing created: #${listingId!.toString()} (${type})`);
        } catch (err) {
          console.error('Error indexing ListingCreated:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace ListingCreated error:', err),
  });

  // ── SaleCompleted ───────────────────────────────────────────────────────────
  // Handles BOTH fixed-price sales AND auction settlements.
  // Was incorrectly named "ListingSold" before — contract emits "SaleCompleted".
  // Field is "amount" not "price".
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.SaleCompleted],
    eventName: 'SaleCompleted',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { listingId, buyer, amount } = log.args; // "amount" not "price"

        try {
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

            await Activity.create({
              type:        'sale',
              collection:  listing.collection,
              tokenId:     listing.tokenId,
              from:        listing.seller,
              to:          (buyer as string).toLowerCase(),
              price:       amount!.toString(),
              listingId:   listingId!.toString(),
              blockNumber: Number(log.blockNumber),
              txHash:      log.transactionHash,
            });
          }

          console.log(`💰 Sale completed: #${listingId!.toString()}`);
        } catch (err) {
          console.error('Error indexing SaleCompleted:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace SaleCompleted error:', err),
  });

  // ── BidPlaced ───────────────────────────────────────────────────────────────
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.BidPlaced],
    eventName: 'BidPlaced',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { listingId, bidder, amount } = log.args;

        try {
          await Bid.create({
            listingId:   listingId!.toString(),
            bidder:      (bidder as string).toLowerCase(),
            amount:      amount!.toString(),
            timestamp:   new Date(),
            blockNumber: Number(log.blockNumber),
            txHash:      log.transactionHash,
          });

          // Single findOneAndUpdate: update highestBid AND return listing for activity
          const listing = await Listing.findOneAndUpdate(
            { listingId: listingId!.toString() },
            {
              highestBid:    amount!.toString(),
              highestBidder: (bidder as string).toLowerCase(),
            },
            { new: true }
          );

          if (listing) {
            await Activity.create({
              type:        'bid',
              collection:  listing.collection,
              tokenId:     listing.tokenId,
              from:        (bidder as string).toLowerCase(),
              price:       amount!.toString(),
              listingId:   listingId!.toString(),
              blockNumber: Number(log.blockNumber),
              txHash:      log.transactionHash,
            });
          }

          console.log(`🤝 Bid placed on #${listingId!.toString()}: ${amount!.toString()}`);
        } catch (err) {
          console.error('Error indexing BidPlaced:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace BidPlaced error:', err),
  });

  // ── ListingCancelled ────────────────────────────────────────────────────────
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.ListingCancelled],
    eventName: 'ListingCancelled',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { listingId } = log.args;

        try {
          const listing = await Listing.findOneAndUpdate(
            { listingId: listingId!.toString() },
            { status: 'cancelled' },
            { new: true }
          );

          if (listing) {
            await Activity.create({
              type:        'cancel',
              collection:  listing.collection,
              tokenId:     listing.tokenId,
              from:        listing.seller,
              listingId:   listingId!.toString(),
              blockNumber: Number(log.blockNumber),
              txHash:      log.transactionHash,
            });
          }

          console.log(`❌ Listing cancelled: #${listingId!.toString()}`);
        } catch (err) {
          console.error('Error indexing ListingCancelled:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace ListingCancelled error:', err),
  });

  // ── PriceUpdated ────────────────────────────────────────────────────────────
  publicClient.watchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: [events.PriceUpdated],
    eventName: 'PriceUpdated',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { listingId, newPrice } = log.args;

        try {
          const listing = await Listing.findOneAndUpdate(
            { listingId: listingId!.toString() },
            { price: newPrice!.toString() },
            { new: true }
          );

          if (listing) {
            await Activity.create({
              type:        'price_update',
              collection:  listing.collection,
              tokenId:     listing.tokenId,
              from:        listing.seller,
              price:       newPrice!.toString(),
              listingId:   listingId!.toString(),
              blockNumber: Number(log.blockNumber),
              txHash:      log.transactionHash,
            });
          }

          console.log(`💲 Price updated: #${listingId!.toString()} → ${newPrice!.toString()}`);
        } catch (err) {
          console.error('Error indexing PriceUpdated:', err);
        }
      }
    },
    onError: (err) => console.error('Marketplace PriceUpdated error:', err),
  });

  // ── RefundStored ────────────────────────────────────────────────────────────
  // Logged for observability only — refunds are tracked on-chain via
  // pendingRefunds mapping. Frontend reads via getPendingRefund(address).
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
// import { parseAbiItem, type Address } from 'viem';

// const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;

// // ── Event ABIs ───────────────────────────────────────────────────────────────
// // Must match the contract exactly — field names, types, and order.

// const events = {
//   ListingCreated: parseAbiItem(
//     'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed collection, uint256 tokenId, uint256 price, uint8 listingType, uint256 endTime)'
//   ),
//   ListingSold: parseAbiItem(
//     'event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 price)'
//   ),
//   AuctionEnded: parseAbiItem(
//     'event AuctionEnded(uint256 indexed listingId, address indexed winner, uint256 winningBid)'
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
//     'event RefundStored(address indexed bidder, uint256 amount)'
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
//         // FIX: No `as any` — individual field casts instead
//         const { listingId, seller, collection, tokenId, price, listingType, endTime } = log.args;
//         const type = (listingType as number) === 0 ? 'fixed' : 'auction';

//         try {
//           await Listing.findOneAndUpdate(
//             // FIX: listingId and tokenId saved as String — uint256 on-chain
//             { listingId: listingId!.toString() },
//             {
//               listingId:   listingId!.toString(),
//               type,
//               collection:  (collection as string).toLowerCase(),
//               tokenId:     tokenId!.toString(),
//               seller:      (seller as string).toLowerCase(),
//               price:       price!.toString(),
//               endTime:     (endTime as bigint) > 0n
//                              ? new Date(Number(endTime) * 1000)
//                              : undefined,
//               status:      'active',
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             },
//             { upsert: true, new: true }
//           );

//           await Activity.create({
//             type:        'list',
//             collection:  (collection as string).toLowerCase(),
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

//   // ── ListingSold ─────────────────────────────────────────────────────────────
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.ListingSold],
//     eventName: 'ListingSold',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { listingId, buyer, price } = log.args;

//         try {
//           const listing = await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             { status: 'sold', buyer: (buyer as string).toLowerCase() },
//             { new: true }
//           );

//           if (listing) {
//             // Update NFT owner to the buyer
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
//               price:       price!.toString(),
//               listingId:   listingId!.toString(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             });
//           }

//           console.log(`💰 Listing sold: #${listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing ListingSold:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace ListingSold error:', err),
//   });

//   // ── AuctionEnded ────────────────────────────────────────────────────────────
//   publicClient.watchContractEvent({
//     address: MARKETPLACE_CONTRACT_ADDRESS,
//     abi: [events.AuctionEnded],
//     eventName: 'AuctionEnded',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { listingId, winner, winningBid } = log.args;

//         try {
//           const listing = await Listing.findOneAndUpdate(
//             { listingId: listingId!.toString() },
//             {
//               status:      'ended',
//               buyer:       (winner as string).toLowerCase(),
//               highestBid:  winningBid!.toString(),
//             },
//             { new: true }
//           );

//           if (listing) {
//             // Transfer NFT ownership to the auction winner
//             await NFT.findOneAndUpdate(
//               { collection: listing.collection, tokenId: listing.tokenId },
//               { owner: (winner as string).toLowerCase() }
//             );

//             await Activity.create({
//               type:        'sale',
//               collection:  listing.collection,
//               tokenId:     listing.tokenId,
//               from:        listing.seller,
//               to:          (winner as string).toLowerCase(),
//               price:       winningBid!.toString(),
//               listingId:   listingId!.toString(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             });
//           }

//           console.log(`🔨 Auction ended: #${listingId!.toString()}`);
//         } catch (err) {
//           console.error('Error indexing AuctionEnded:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Marketplace AuctionEnded error:', err),
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
//           // Save the bid record
//           await Bid.create({
//             listingId:   listingId!.toString(),
//             bidder:      (bidder as string).toLowerCase(),
//             amount:      amount!.toString(),
//             timestamp:   new Date(),
//             blockNumber: Number(log.blockNumber),
//             txHash:      log.transactionHash,
//           });

//           // Update highest bid on the listing in the same query
//           // FIX: Combined findOneAndUpdate — was two separate DB calls before,
//           // now one call updates highestBid AND returns the listing for activity.
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
//   // Logged for observability — no DB write needed since refunds are tracked
//   // on-chain via the pendingRefunds mapping. Frontend reads this directly
//   // via getPendingRefund(address) on the contract.
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