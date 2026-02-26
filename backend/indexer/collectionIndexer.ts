import { publicClient } from '../lib/viemClient';
import { NFT } from '../models/nft.model';
import { Activity } from '../models/activity.model';
import { Collection } from '../models/collection.model';
import { parseAbiItem, type Address } from 'viem';

// ── Event ABIs ───────────────────────────────────────────────────────────────

const NFTMintedAbi = parseAbiItem(
  'event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI, string category)'
);

const TransferAbi = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);

const CollectionCreatedAbi = parseAbiItem(
  'event CollectionCreated(address indexed creator, address indexed collectionAddress, string name, string symbol, uint256 maxSupply, uint256 maxPerWallet)'
);

// New: keep publicMintEnabled and collaborators in sync with on-chain state
const PublicMintToggledAbi = parseAbiItem(
  'event PublicMintToggled(bool enabled)'
);

const CollaboratorUpdatedAbi = parseAbiItem(
  'event CollaboratorUpdated(address indexed user, bool allowed)'
);

const MintPriceUpdatedAbi = parseAbiItem(
  'event MintPriceUpdated(uint256 newPrice)'
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ── Metadata fetcher ─────────────────────────────────────────────────────────

async function fetchMetadata(uri: string): Promise<Record<string, unknown>> {
  try {
    const url = uri.startsWith('ipfs://')
      ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
      : uri;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// ── Watch a single collection contract ───────────────────────────────────────

export function watchCollection(collectionAddress: Address) {

  // ── NFTMinted ──
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [NFTMintedAbi],
    eventName: 'NFTMinted',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { minter, tokenId, tokenURI, category } = log.args;
        const metadata = await fetchMetadata(tokenURI as string);
        try {
          await NFT.findOneAndUpdate(
            { collection: collectionAddress.toLowerCase(), tokenId: tokenId!.toString() },
            {
              tokenId:     tokenId!.toString(),
              collection:  collectionAddress.toLowerCase(),
              owner:       (minter as string).toLowerCase(),
              minter:      (minter as string).toLowerCase(),
              tokenURI:    tokenURI as string,
              category:    category as string,
              metadata,
              mintedAt:    new Date(),
              blockNumber: Number(log.blockNumber),
              txHash:      log.transactionHash,
            },
            { upsert: true, new: true }
          );
          await Activity.create({
            type:        'mint',
            collection:  collectionAddress.toLowerCase(),
            tokenId:     tokenId!.toString(),
            from:        (minter as string).toLowerCase(),
            blockNumber: Number(log.blockNumber),
            txHash:      log.transactionHash,
          });
          console.log(`🖼  NFT minted: ${collectionAddress} #${tokenId}`);
        } catch (err) {
          console.error('Error indexing NFTMinted:', err);
        }
      }
    },
    onError: (err) => console.error(`NFTMinted watcher error (${collectionAddress}):`, err),
  });

  // ── Transfer ──
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [TransferAbi],
    eventName: 'Transfer',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { from, to, tokenId } = log.args;
        if ((from as string).toLowerCase() === ZERO_ADDRESS) continue;
        try {
          await NFT.findOneAndUpdate(
            { collection: collectionAddress.toLowerCase(), tokenId: tokenId!.toString() },
            { owner: (to as string).toLowerCase() }
          );
          await Activity.create({
            type:        'transfer',
            collection:  collectionAddress.toLowerCase(),
            tokenId:     tokenId!.toString(),
            from:        (from as string).toLowerCase(),
            to:          (to as string).toLowerCase(),
            blockNumber: Number(log.blockNumber),
            txHash:      log.transactionHash,
          });
        } catch (err) {
          console.error('Error indexing Transfer:', err);
        }
      }
    },
    onError: (err) => console.error(`Transfer watcher error (${collectionAddress}):`, err),
  });

  // ── PublicMintToggled — update publicMintEnabled in DB ──
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [PublicMintToggledAbi],
    eventName: 'PublicMintToggled',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { enabled } = log.args;
        try {
          await Collection.findOneAndUpdate(
            { address: collectionAddress.toLowerCase() },
            { publicMintEnabled: enabled as boolean }
          );
          console.log(`🔓 PublicMint ${enabled ? 'enabled' : 'disabled'}: ${collectionAddress}`);
        } catch (err) {
          console.error('Error indexing PublicMintToggled:', err);
        }
      }
    },
    onError: (err) => console.error(`PublicMintToggled watcher error (${collectionAddress}):`, err),
  });

  // ── CollaboratorUpdated — add/remove from collaborators array in DB ──
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [CollaboratorUpdatedAbi],
    eventName: 'CollaboratorUpdated',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { user, allowed } = log.args;
        const userAddr = (user as string).toLowerCase();
        try {
          if (allowed) {
            // Add to collaborators array if not already present
            await Collection.findOneAndUpdate(
              { address: collectionAddress.toLowerCase() },
              { $addToSet: { collaborators: userAddr } }
            );
            console.log(`🤝 Collaborator added: ${userAddr} → ${collectionAddress}`);
          } else {
            // Remove from collaborators array
            await Collection.findOneAndUpdate(
              { address: collectionAddress.toLowerCase() },
              { $pull: { collaborators: userAddr } }
            );
            console.log(`❌ Collaborator removed: ${userAddr} → ${collectionAddress}`);
          }
        } catch (err) {
          console.error('Error indexing CollaboratorUpdated:', err);
        }
      }
    },
    onError: (err) => console.error(`CollaboratorUpdated watcher error (${collectionAddress}):`, err),
  });

  // ── MintPriceUpdated — keep mintPrice in sync ──
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [MintPriceUpdatedAbi],
    eventName: 'MintPriceUpdated',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { newPrice } = log.args;
        try {
          await Collection.findOneAndUpdate(
            { address: collectionAddress.toLowerCase() },
            { mintPrice: (newPrice as bigint).toString() }
          );
          console.log(`💰 MintPrice updated: ${newPrice} → ${collectionAddress}`);
        } catch (err) {
          console.error('Error indexing MintPriceUpdated:', err);
        }
      }
    },
    onError: (err) => console.error(`MintPriceUpdated watcher error (${collectionAddress}):`, err),
  });
}

// ── Start the collection indexer ─────────────────────────────────────────────

export async function startCollectionIndexer() {
  console.log('👁  Collection indexer started');

  const collections = await Collection.find({});
  for (const col of collections) {
    watchCollection(col.address as Address);
    console.log(`👁  Watching existing collection: ${col.name} (${col.address})`);
  }

  const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || '0x') as Address;

  publicClient.watchContractEvent({
    address: FACTORY_ADDRESS,
    abi: [CollectionCreatedAbi],
    eventName: 'CollectionCreated',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { collectionAddress } = log.args;
        watchCollection(collectionAddress as Address);
        console.log(`👁  Now watching new collection: ${collectionAddress}`);
      }
    },
    onError: (err) => console.error('Factory→collection watcher error:', err),
  });
}





// import { publicClient } from '../lib/viemClient';
// import { NFT } from '../models/nft.model';
// import { Activity } from '../models/activity.model';
// import { Collection } from '../models/collection.model';
// import { parseAbiItem, type Address, type Log } from 'viem';

// // ── Event ABIs ──────────────────────────────────────────────────────────────
// // These must match the contract EXACTLY — field names, types, and order.

// const NFTMintedAbi = parseAbiItem(
//   'event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI, string category)'
// );

// const TransferAbi = parseAbiItem(
//   'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
// );

// // FIX 2: Correct CollectionCreated ABI — creator is FIRST, collectionAddress
// // is SECOND, and mintPrice is NOT in this event (not emitted by the contract).
// // This is only used here to trigger watchCollection on newly deployed collections.
// // The actual collection indexing (saving to DB) is handled by factoryIndexer.ts.
// const CollectionCreatedAbi = parseAbiItem(
//   'event CollectionCreated(address indexed creator, address indexed collectionAddress, string name, string symbol, uint256 maxSupply, uint256 maxPerWallet)'
// );

// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// // ── Metadata fetcher ────────────────────────────────────────────────────────

// async function fetchMetadata(uri: string): Promise<Record<string, unknown>> {
//   try {
//     const url = uri.startsWith('ipfs://')
//       ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
//       : uri;
//     const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
//     if (!res.ok) return {};
//     return await res.json();
//   } catch {
//     return {};
//   }
// }

// // ── Watch a single collection contract ─────────────────────────────────────

// export function watchCollection(collectionAddress: Address) {

//   // ── NFTMinted ──
//   publicClient.watchContractEvent({
//     address: collectionAddress,
//     abi: [NFTMintedAbi],
//     eventName: 'NFTMinted',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         // FIX 3: Typed args — no `as any`. viem infers the correct shape
//         // from the parsed ABI so we get full type safety on all fields.
//         const { minter, tokenId, tokenURI, category } = log.args;

//         const metadata = await fetchMetadata(tokenURI as string);

//         try {
//           // FIX 1: tokenId saved as String — was Number(tokenId) before.
//           // uint256 can exceed JS safe integer range so we always use .toString()
//           await NFT.findOneAndUpdate(
//             {
//               collection: collectionAddress.toLowerCase(),
//               tokenId: tokenId!.toString(),
//             },
//             {
//               tokenId:     tokenId!.toString(),
//               collection:  collectionAddress.toLowerCase(),
//               owner:       (minter as string).toLowerCase(),
//               minter:      (minter as string).toLowerCase(),
//               tokenURI:    tokenURI as string,
//               category:    category as string,
//               metadata,
//               mintedAt:    new Date(),
//               blockNumber: Number(log.blockNumber),
//               txHash:      log.transactionHash,
//             },
//             { upsert: true, new: true }
//           );

//           await Activity.create({
//             type:        'mint',
//             collection:  collectionAddress.toLowerCase(),
//             tokenId:     tokenId!.toString(),   // FIX 1: String not Number
//             from:        (minter as string).toLowerCase(),
//             blockNumber: Number(log.blockNumber),
//             txHash:      log.transactionHash,
//           });

//           console.log(`🖼  NFT minted: ${collectionAddress} #${tokenId}`);
//         } catch (err) {
//           console.error('Error indexing NFTMinted:', err);
//         }
//       }
//     },
//     onError: (err) => console.error(`NFTMinted watcher error (${collectionAddress}):`, err),
//   });

//   // ── Transfer ──
//   publicClient.watchContractEvent({
//     address: collectionAddress,
//     abi: [TransferAbi],
//     eventName: 'Transfer',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { from, to, tokenId } = log.args;

//        // Skip mint transfers — from is zero address on mint.
//         if ((from as string).toLowerCase() === ZERO_ADDRESS) continue;

//         // Skip transfers TO the marketplace — these happen during listing
//         // and don't represent a real ownership change. The owner stays the
//         // seller until the NFT is actually sold (handled by marketplaceIndexer).
//         const MARKETPLACE = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '').toLowerCase();
//         if (MARKETPLACE && (to as string).toLowerCase() === MARKETPLACE) continue;

//         try {
//           // FIX 1: tokenId as String in both the query and the activity record
//           await NFT.findOneAndUpdate(
//             {
//               collection: collectionAddress.toLowerCase(),
//               tokenId:    tokenId!.toString(),
//             },
//             { owner: (to as string).toLowerCase() }
//           );

//           await Activity.create({
//             type:        'transfer',
//             collection:  collectionAddress.toLowerCase(),
//             tokenId:     tokenId!.toString(),   // FIX 1: String not Number
//             from:        (from as string).toLowerCase(),
//             to:          (to as string).toLowerCase(),
//             blockNumber: Number(log.blockNumber),
//             txHash:      log.transactionHash,
//           });
//         } catch (err) {
//           console.error('Error indexing Transfer:', err);
//         }
//       }
//     },
//     onError: (err) => console.error(`Transfer watcher error (${collectionAddress}):`, err),
//   });
// }

// // ── Start the collection indexer ────────────────────────────────────────────

// export async function startCollectionIndexer() {
//   console.log('👁  Collection indexer started');

//   // Watch all collections that are already saved in the DB from previous runs.
//   // This ensures no collections are missed if the server restarts.
//   const collections = await Collection.find({});
//   for (const col of collections) {
//     watchCollection(col.address as Address);
//     console.log(`👁  Watching existing collection: ${col.name} (${col.address})`);
//   }

//   // FIX 2: Watch factory for NEW collections so they get auto-watched as soon
//   // as they are deployed — without this, newly created collections would only
//   // start being watched after the next server restart.
//   //
//   // NOTE: This only calls watchCollection() to START watching the new contract.
//   // The actual saving of the collection to MongoDB is handled by factoryIndexer.ts.
//   // These two indexers have separate responsibilities:
//   //   factoryIndexer    → saves Collection documents to MongoDB
//   //   collectionIndexer → watches NFT events on each collection contract
//   const FACTORY_CONTRACT_ADDRESS = (process.env.FACTORY_CONTRACT_ADDRESS || '0x') as Address;

//   publicClient.watchContractEvent({
//     address: FACTORY_CONTRACT_ADDRESS,
//     abi: [CollectionCreatedAbi],
//     eventName: 'CollectionCreated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         // FIX 2: collectionAddress is the SECOND indexed arg (not the first)
//         const { collectionAddress } = log.args;
//         watchCollection(collectionAddress as Address);
//         console.log(`👁  Now watching new collection: ${collectionAddress}`);
//       }
//     },
//     onError: (err) => console.error('Factory→collection watcher error:', err),
//   });
// }