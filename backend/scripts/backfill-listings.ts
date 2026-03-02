/**
 * backfill-listings.ts
 *
 * One-time script to index any ListingCreated events that were missed
 * because the indexer had the wrong ABI at the time they were emitted.
 *
 * Run once with:
 *   npx ts-node src/scripts/backfill-listings.ts
 * or if you use tsx:
 *   npx tsx src/scripts/backfill-listings.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { createPublicClient, http, parseAbi, parseAbiItem, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import { Listing } from '../models/listing.model';
import { Activity } from '../models/activity.model';

const MARKETPLACE_CONTRACT_ADDRESS = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x') as Address;
const RPC_URL = process.env.RPC_URL;
const MONGO_URI = process.env.MONGO_URI;

// ── How far back to look ─────────────────────────────────────────────────────
// Set this to a block BEFORE your first ever listing transaction.
// If unsure, use 0n to scan from genesis (slow) or check Etherscan for the
// block your marketplace contract was deployed at.
const FROM_BLOCK = 0n; // ← replace with your contract deployment block for speed

// ── Viem client (standalone, not using your shared publicClient) ─────────────
const client = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL!),
});

const MARKETPLACE_READ_ABI = parseAbi([
  'function getListing(uint256 listingId) view returns (address seller, address nft, uint256 tokenId, uint8 saleType, uint256 highestBid, address highestBidder, uint256 endTime, uint256 startingBid, uint256 price, bool ended)',
]);

const ListingCreatedEvent = parseAbiItem(
  'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint8 saleType, uint256 price)'
);

async function backfill() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI!);
  console.log('✅ Connected\n');

  console.log(`🔍 Fetching ListingCreated logs from block ${FROM_BLOCK} to latest...`);

  const logs = await client.getLogs({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    event:   ListingCreatedEvent,
    fromBlock: FROM_BLOCK,
    toBlock:   'latest',
  });

  console.log(`📋 Found ${logs.length} ListingCreated event(s)\n`);

  let created = 0;
  let skipped = 0;

  for (const log of logs) {
    const { listingId, seller, nft, tokenId, saleType, price } = log.args;
    const type = (saleType as number) === 0 ? 'fixed' : 'auction';
    const listingIdStr = listingId!.toString();

    // Skip if already indexed
    const existing = await Listing.findOne({ listingId: listingIdStr });
    if (existing) {
      console.log(`⏭  Listing #${listingIdStr} already in DB — skipping`);
      skipped++;
      continue;
    }

    try {
      await Listing.findOneAndUpdate(
        { listingId: listingIdStr },
        {
          listingId:   listingIdStr,
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

      // Fetch endTime from contract for auctions
      if (type === 'auction') {
        try {
          const onChainListing = await client.readContract({
            address:      MARKETPLACE_CONTRACT_ADDRESS,
            abi:          MARKETPLACE_READ_ABI,
            functionName: 'getListing',
            args:         [listingId!],
          });
          const endTime = onChainListing[6] as bigint;
          if (endTime && endTime > 0n) {
            await Listing.findOneAndUpdate(
              { listingId: listingIdStr },
              { endTime: new Date(Number(endTime) * 1000) }
            );
          }
        } catch (err) {
          console.error(`  ⚠️  Could not fetch endTime for auction #${listingIdStr}:`, err);
        }
      }

      // Also check current on-chain status — listing may already be sold/cancelled
      try {
        const onChainListing = await client.readContract({
          address:      MARKETPLACE_CONTRACT_ADDRESS,
          abi:          MARKETPLACE_READ_ABI,
          functionName: 'getListing',
          args:         [listingId!],
        });
        const ended = onChainListing[9] as boolean; // index 9 = ended
        if (ended) {
          await Listing.findOneAndUpdate(
            { listingId: listingIdStr },
            { status: 'ended' }
          );
          console.log(`  ℹ️  Listing #${listingIdStr} is already ended on-chain — marked as ended`);
        }
      } catch { /* non-critical, leave as active */ }

      // Create activity record if missing
      const existingActivity = await Activity.findOne({ listingId: listingIdStr, type: 'list' });
      if (!existingActivity) {
        await Activity.create({
          type:        'list',
          collection:  (nft as string).toLowerCase(),
          tokenId:     tokenId!.toString(),
          from:        (seller as string).toLowerCase(),
          price:       price!.toString(),
          listingId:   listingIdStr,
          blockNumber: Number(log.blockNumber),
          txHash:      log.transactionHash,
        });
      }

      console.log(`✅ Backfilled listing #${listingIdStr} (${type}) — token ${tokenId!.toString()} in ${(nft as string).slice(0, 10)}...`);
      created++;
    } catch (err) {
      console.error(`❌ Failed to backfill listing #${listingIdStr}:`, err);
    }
  }

  console.log(`\n🏁 Done — ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});