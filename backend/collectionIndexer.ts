// import { publicClient } from '../lib/viemClient';
// import { NFT } from '../models/NFT';
import { Activity } from './models/activity.model';
import { Collection } from './models/collection.model';
import { parseAbiItem, type Address } from 'viem';

const NFTMinted = parseAbiItem(
  'event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI, string category)'
);

const Transfer = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);

/** Fetch token URI metadata from IPFS/HTTP */
async function fetchMetadata(uri: string) {
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

/** Watch a single collection contract for NFT events */
function watchCollection(collectionAddress: Address) {
  // NFTMinted
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [NFTMinted],
    eventName: 'NFTMinted',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { minter, tokenId, tokenURI, category } = log.args as any;
        const metadata = await fetchMetadata(tokenURI);

        try {
          await NFT.findOneAndUpdate(
            { collection: collectionAddress.toLowerCase(), tokenId: Number(tokenId) },
            {
              tokenId: Number(tokenId),
              collection: collectionAddress.toLowerCase(),
              owner: minter.toLowerCase(),
              minter: minter.toLowerCase(),
              tokenURI,
              category,
              metadata,
              mintedAt: new Date(),
              blockNumber: Number(log.blockNumber),
              txHash: log.transactionHash,
            },
            { upsert: true, new: true }
          );

          await Activity.create({
            type: 'mint',
            collection: collectionAddress.toLowerCase(),
            tokenId: Number(tokenId),
            from: minter.toLowerCase(),
            blockNumber: Number(log.blockNumber),
            txHash: log.transactionHash,
          });

          console.log(`🖼  NFT minted: ${collectionAddress} #${tokenId}`);
        } catch (err) {
          console.error('Error indexing NFTMinted:', err);
        }
      }
    },
    onError: (err) => console.error(`Collection watcher error (${collectionAddress}):`, err),
  });

  // Transfer
  publicClient.watchContractEvent({
    address: collectionAddress,
    abi: [Transfer],
    eventName: 'Transfer',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { from, to, tokenId } = log.args as any;
        const zeroAddr = '0x0000000000000000000000000000000000000000';

        // Skip mint events (handled above)
        if (from.toLowerCase() === zeroAddr) continue;

        try {
          await NFT.findOneAndUpdate(
            { collection: collectionAddress.toLowerCase(), tokenId: Number(tokenId) },
            { owner: to.toLowerCase() }
          );

          await Activity.create({
            type: 'transfer',
            collection: collectionAddress.toLowerCase(),
            tokenId: Number(tokenId),
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            blockNumber: Number(log.blockNumber),
            txHash: log.transactionHash,
          });
        } catch (err) {
          console.error('Error indexing Transfer:', err);
        }
      }
    },
    onError: (err) => console.error(`Transfer watcher error (${collectionAddress}):`, err),
  });
}

export async function startCollectionIndexer() {
  console.log('👁  Collection indexer started');

  // Watch all already-indexed collections
  const collections = await Collection.find({});
  for (const col of collections) {
    watchCollection(col.address as Address);
  }

  // Also watch the factory so new collections are auto-watched
  const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || '0x') as Address;
  const CollectionCreated = parseAbiItem(
    'event CollectionCreated(address indexed collectionAddress, address indexed creator, string name, string symbol, uint256 maxSupply, uint256 maxPerWallet, uint256 mintPrice)'
  );

  publicClient.watchContractEvent({
    address: FACTORY_ADDRESS,
    abi: [CollectionCreated],
    eventName: 'CollectionCreated',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { collectionAddress } = log.args as any;
        watchCollection(collectionAddress as Address);
        console.log(`👁  Now watching new collection: ${collectionAddress}`);
      }
    },
    onError: (err) => console.error('Factory→collection watcher error:', err),
  });
}