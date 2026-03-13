import { publicClient } from '../lib/viemClient';
import { registerWatcher } from '../lib/poller';
import { NFT } from '../models/nft.model';
import { Activity } from '../models/activity.model';
import { Collection } from '../models/collection.model';
import { parseAbiItem, type Address } from 'viem';

const DEPLOY_BLOCK = BigInt(process.env.MARKETPLACE_DEPLOY_BLOCK || '0');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const NFTMintedAbi           = parseAbiItem('event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI, string category)');
const TransferAbi            = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');
const PublicMintToggledAbi   = parseAbiItem('event PublicMintToggled(bool enabled)');
const CollaboratorUpdatedAbi = parseAbiItem('event CollaboratorUpdated(address indexed user, bool allowed)');
const MintPriceUpdatedAbi    = parseAbiItem('event MintPriceUpdated(uint256 newPrice)');

async function fetchMetadata(uri: string): Promise<Record<string, unknown>> {
  try {
    const url = uri.startsWith('ipfs://')
      ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
      : uri;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return await res.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function watchCollection(collectionAddress: Address) {
  const addr = collectionAddress.toLowerCase();

  registerWatcher(`NFTMinted:${addr}`, async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: collectionAddress, event: NFTMintedAbi, fromBlock, toBlock });
    for (const log of logs) {
      const { minter, tokenId, tokenURI, category } = log.args;
      const metadata = await fetchMetadata(tokenURI as string);
      try {
        await NFT.findOneAndUpdate(
          { collection: addr, tokenId: tokenId!.toString() },
          {
            tokenId: tokenId!.toString(), collection: addr,
            owner: (minter as string).toLowerCase(), minter: (minter as string).toLowerCase(),
            tokenURI: tokenURI as string, category: category as string,
            metadata, mintedAt: new Date(),
            blockNumber: Number(log.blockNumber), txHash: log.transactionHash,
          },
          { upsert: true, new: true }
        );
        await Activity.findOneAndUpdate(
          { txHash: log.transactionHash, type: 'mint' },
          { type: 'mint', collection: addr, tokenId: tokenId!.toString(),
            from: (minter as string).toLowerCase(),
            blockNumber: Number(log.blockNumber), txHash: log.transactionHash },
          { upsert: true }
        );
        console.log(`🖼  NFT minted: ${addr} #${tokenId}`);
      } catch (err) { console.error('Error indexing NFTMinted:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher(`Transfer:${addr}`, async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: collectionAddress, event: TransferAbi, fromBlock, toBlock });
    for (const log of logs) {
      const { from, to, tokenId } = log.args;
      if ((from as string).toLowerCase() === ZERO_ADDRESS) continue;
      try {
        await NFT.findOneAndUpdate(
          { collection: addr, tokenId: tokenId!.toString() },
          { owner: (to as string).toLowerCase() }
        );
        await Activity.findOneAndUpdate(
          { txHash: log.transactionHash, type: 'transfer' },
          { type: 'transfer', collection: addr, tokenId: tokenId!.toString(),
            from: (from as string).toLowerCase(), to: (to as string).toLowerCase(),
            blockNumber: Number(log.blockNumber), txHash: log.transactionHash },
          { upsert: true }
        );
      } catch (err) { console.error('Error indexing Transfer:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher(`PublicMintToggled:${addr}`, async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: collectionAddress, event: PublicMintToggledAbi, fromBlock, toBlock });
    for (const log of logs) {
      try {
        await Collection.findOneAndUpdate(
          { address: addr }, { publicMintEnabled: log.args.enabled as boolean }
        );
      } catch (err) { console.error('Error indexing PublicMintToggled:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher(`CollaboratorUpdated:${addr}`, async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: collectionAddress, event: CollaboratorUpdatedAbi, fromBlock, toBlock });
    for (const log of logs) {
      const userAddr = (log.args.user as string).toLowerCase();
      try {
        await Collection.findOneAndUpdate(
          { address: addr },
          log.args.allowed
            ? { $addToSet: { collaborators: userAddr } }
            : { $pull:     { collaborators: userAddr } }
        );
      } catch (err) { console.error('Error indexing CollaboratorUpdated:', err); }
    }
  }, DEPLOY_BLOCK);

  registerWatcher(`MintPriceUpdated:${addr}`, async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({ address: collectionAddress, event: MintPriceUpdatedAbi, fromBlock, toBlock });
    for (const log of logs) {
      try {
        await Collection.findOneAndUpdate(
          { address: addr }, { mintPrice: (log.args.newPrice as bigint).toString() }
        );
      } catch (err) { console.error('Error indexing MintPriceUpdated:', err); }
    }
  }, DEPLOY_BLOCK);
}

export async function startCollectionIndexer() {
  console.log('👁  Collection indexer started');
  const collections = await Collection.find({});
  for (const col of collections) {
    watchCollection(col.address as Address);
    console.log(`👁  Watching collection: ${col.name} (${col.address})`);
  }
}






// import { publicClient } from '../lib/viemClient';
// import { NFT } from '../models/nft.model';
// import { Activity } from '../models/activity.model';
// import { Collection } from '../models/collection.model';
// import { parseAbiItem, type Address } from 'viem';

// // ── Event ABIs ───────────────────────────────────────────────────────────────

// const NFTMintedAbi = parseAbiItem(
//   'event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI, string category)'
// );

// const TransferAbi = parseAbiItem(
//   'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
// );

// const CollectionCreatedAbi = parseAbiItem(
//   'event CollectionCreated(address indexed creator, address indexed collectionAddress, string name, string symbol, uint256 maxSupply, uint256 maxPerWallet)'
// );

// // New: keep publicMintEnabled and collaborators in sync with on-chain state
// const PublicMintToggledAbi = parseAbiItem(
//   'event PublicMintToggled(bool enabled)'
// );

// const CollaboratorUpdatedAbi = parseAbiItem(
//   'event CollaboratorUpdated(address indexed user, bool allowed)'
// );

// const MintPriceUpdatedAbi = parseAbiItem(
//   'event MintPriceUpdated(uint256 newPrice)'
// );

// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// // ── Metadata fetcher ─────────────────────────────────────────────────────────

// async function fetchMetadata(uri: string): Promise<Record<string, unknown>> {
//   try {
//     const url = uri.startsWith('ipfs://')
//       ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
//       : uri;
//     const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
//     if (!res.ok) return {};   
//     return await res.json() as Record<string, unknown>;
//   } catch {
//     return {};
//   }
// }

// // ── Watch a single collection contract ───────────────────────────────────────

// export function watchCollection(collectionAddress: Address) {

//   // ── NFTMinted ──
//   publicClient.watchContractEvent({
//     address: collectionAddress,
//     abi: [NFTMintedAbi],
//     eventName: 'NFTMinted',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { minter, tokenId, tokenURI, category } = log.args;
//         const metadata = await fetchMetadata(tokenURI as string);
//         try {
//           await NFT.findOneAndUpdate(
//             { collection: collectionAddress.toLowerCase(), tokenId: tokenId!.toString() },
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
//             tokenId:     tokenId!.toString(),
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
//         if ((from as string).toLowerCase() === ZERO_ADDRESS) continue;
//         try {
//           await NFT.findOneAndUpdate(
//             { collection: collectionAddress.toLowerCase(), tokenId: tokenId!.toString() },
//             { owner: (to as string).toLowerCase() }
//           );
//           await Activity.create({
//             type:        'transfer',
//             collection:  collectionAddress.toLowerCase(),
//             tokenId:     tokenId!.toString(),
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

//   // ── PublicMintToggled — update publicMintEnabled in DB ──
//   publicClient.watchContractEvent({
//     address: collectionAddress,
//     abi: [PublicMintToggledAbi],
//     eventName: 'PublicMintToggled',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { enabled } = log.args;
//         try {
//           await Collection.findOneAndUpdate(
//             { address: collectionAddress.toLowerCase() },
//             { publicMintEnabled: enabled as boolean }
//           );
//           console.log(`🔓 PublicMint ${enabled ? 'enabled' : 'disabled'}: ${collectionAddress}`);
//         } catch (err) {
//           console.error('Error indexing PublicMintToggled:', err);
//         }
//       }
//     },
//     onError: (err) => console.error(`PublicMintToggled watcher error (${collectionAddress}):`, err),
//   });

//   // ── CollaboratorUpdated — add/remove from collaborators array in DB ──
//   publicClient.watchContractEvent({
//     address: collectionAddress,
//     abi: [CollaboratorUpdatedAbi],
//     eventName: 'CollaboratorUpdated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { user, allowed } = log.args;
//         const userAddr = (user as string).toLowerCase();
//         try {
//           if (allowed) {
//             // Add to collaborators array if not already present
//             await Collection.findOneAndUpdate(
//               { address: collectionAddress.toLowerCase() },
//               { $addToSet: { collaborators: userAddr } }
//             );
//             console.log(`🤝 Collaborator added: ${userAddr} → ${collectionAddress}`);
//           } else {
//             // Remove from collaborators array
//             await Collection.findOneAndUpdate(
//               { address: collectionAddress.toLowerCase() },
//               { $pull: { collaborators: userAddr } }
//             );
//             console.log(`❌ Collaborator removed: ${userAddr} → ${collectionAddress}`);
//           }
//         } catch (err) {
//           console.error('Error indexing CollaboratorUpdated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error(`CollaboratorUpdated watcher error (${collectionAddress}):`, err),
//   });

//   // ── MintPriceUpdated — keep mintPrice in sync ──
//   publicClient.watchContractEvent({
//     address: collectionAddress,
//     abi: [MintPriceUpdatedAbi],
//     eventName: 'MintPriceUpdated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { newPrice } = log.args;
//         try {
//           await Collection.findOneAndUpdate(
//             { address: collectionAddress.toLowerCase() },
//             { mintPrice: (newPrice as bigint).toString() }
//           );
//           console.log(`💰 MintPrice updated: ${newPrice} → ${collectionAddress}`);
//         } catch (err) {
//           console.error('Error indexing MintPriceUpdated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error(`MintPriceUpdated watcher error (${collectionAddress}):`, err),
//   });
// }

// // ── Start the collection indexer ─────────────────────────────────────────────

// export async function startCollectionIndexer() {
//   console.log('👁  Collection indexer started');

//   const collections = await Collection.find({});
//   for (const col of collections) {
//     watchCollection(col.address as Address);
//     console.log(`👁  Watching existing collection: ${col.name} (${col.address})`);
//   }

//   const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || '0x') as Address;

//   publicClient.watchContractEvent({
//     address: FACTORY_ADDRESS,
//     abi: [CollectionCreatedAbi],
//     eventName: 'CollectionCreated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         const { collectionAddress } = log.args;
//         watchCollection(collectionAddress as Address);
//         console.log(`👁  Now watching new collection: ${collectionAddress}`);
//       }
//     },
//     onError: (err) => console.error('Factory→collection watcher error:', err),
//   });
// }