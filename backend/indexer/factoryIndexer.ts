import { publicClient } from '../lib/viemClient';
import { registerWatcher } from '../lib/poller';
import { Collection } from '../models/collection.model';
import { parseAbiItem, type Address } from 'viem';

const FACTORY_ADDRESS = (process.env.FACTORY_CONTRACT_ADDRESS || '0x') as Address;
const DEPLOY_BLOCK    = BigInt(process.env.MARKETPLACE_DEPLOY_BLOCK || '0');

const CollectionCreatedAbi = parseAbiItem(
  'event CollectionCreated(address indexed creator, address indexed collectionAddress, string name, string symbol, uint256 maxSupply, uint256 maxPerWallet)'
);

export function startFactoryIndexer() {
  console.log('👁  Factory indexer started');

  registerWatcher('Factory:CollectionCreated', async (fromBlock, toBlock) => {
    const logs = await publicClient.getLogs({
      address:   FACTORY_ADDRESS,
      event:     CollectionCreatedAbi,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      const { creator, collectionAddress, name, symbol, maxSupply, maxPerWallet } = log.args;
      try {
        await Collection.findOneAndUpdate(
          { address: (collectionAddress as string).toLowerCase() },
          {
            address:      (collectionAddress as string).toLowerCase(),
            creator:      (creator as string).toLowerCase(),
            name:         name as string,
            symbol:       symbol as string,
            maxSupply:    Number(maxSupply),
            maxPerWallet: Number(maxPerWallet),
            blockNumber:  Number(log.blockNumber),
            txHash:       log.transactionHash,
          },
          { upsert: true, new: true }
        );
        console.log(`📦 New collection: ${name as string} (${collectionAddress as string})`);
      } catch (err) {
        console.error('Error indexing CollectionCreated:', err);
      }
    }
  }, DEPLOY_BLOCK);
}



// import { publicClient } from '../lib/viemClient';
// import { Collection } from '../models/collection.model';
// import { parseAbiItem, type Address } from 'viem';

// const FACTORY_CONTRACT_ADDRESS = (process.env.FACTORY_CONTRACT_ADDRESS || '0x') as Address;

// // FIX 1: Correct ABI — creator is FIRST indexed arg, collectionAddress is SECOND.
// // mintPrice is removed — it is NOT emitted by the CollectionCreated event.
// // This must match the contract exactly or viem will silently decode wrong values.
// const CollectionCreatedAbi = parseAbiItem(
//   'event CollectionCreated(address indexed creator, address indexed collectionAddress, string name, string symbol, uint256 maxSupply, uint256 maxPerWallet)'
// );

// export function startFactoryIndexer() {
//   console.log('👁  Factory indexer started');

//   publicClient.watchContractEvent({
//     address: FACTORY_CONTRACT_ADDRESS,
//     abi: [CollectionCreatedAbi],
//     eventName: 'CollectionCreated',
//     onLogs: async (logs) => {
//       for (const log of logs) {
//         // FIX 2: No `as any` — viem infers correct types from the parsed ABI
//         const { creator, collectionAddress, name, symbol, maxSupply, maxPerWallet } = log.args;

//         try {
//           await Collection.findOneAndUpdate(
//             { address: (collectionAddress as string).toLowerCase() },
//             {
//               address:      (collectionAddress as string).toLowerCase(),
//               creator:      (creator as string).toLowerCase(),
//               name:         name as string,
//               symbol:       symbol as string,
//               maxSupply:    Number(maxSupply),
//               maxPerWallet: Number(maxPerWallet),
//               // FIX 3: mintPrice not set here — not in the event.
//               // It defaults to '0' in the model. The collectionIndexer will
//               // update it when a MintPriceUpdated event fires on the collection.
//               blockNumber:  Number(log.blockNumber),
//               txHash:       log.transactionHash,
//             },
//             { upsert: true, new: true }
//           );

//           console.log(`📦 Collection indexed: ${name as string} (${collectionAddress as string})`);
//         } catch (err) {
//           console.error('Error indexing CollectionCreated:', err);
//         }
//       }
//     },
//     onError: (err) => console.error('Factory watcher error:', err),
//   });
// }