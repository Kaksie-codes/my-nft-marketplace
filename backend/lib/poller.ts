import { publicClient } from './viemClient';
import { IndexerState } from '../models/indexerstate.model';

const POLL_INTERVAL       = 15_000;
const BLOCK_LAG           = 1n;
const CHUNK_SIZE          = 9n;
const MAX_CHUNKS_PER_TICK = 50;

type LogHandler = (fromBlock: bigint, toBlock: bigint) => Promise<void>;

interface Watcher {
  name:       string;
  handler:    LogHandler;
  startBlock: bigint;
  lastBlock:  bigint;
}

const watchers: Watcher[] = [];
let polling = false;

export function registerWatcher(name: string, handler: LogHandler, startBlock: bigint) {
  watchers.push({ name, handler, startBlock, lastBlock: startBlock - 1n });
}

async function loadSavedProgress() {
  for (const watcher of watchers) {
    try {
      const saved = await IndexerState.findOne({ name: watcher.name });
      if (saved && BigInt(saved.lastBlock) >= watcher.startBlock) {
        watcher.lastBlock = BigInt(saved.lastBlock);
        console.log(`📌 Resuming [${watcher.name}] from block ${saved.lastBlock}`);
      } else {
        console.log(`🆕 Starting [${watcher.name}] from block ${watcher.startBlock}`);
      }
    } catch {
      console.log(`🆕 Starting [${watcher.name}] from block ${watcher.startBlock}`);
    }
  }
}

async function saveProgress(name: string, lastBlock: bigint) {
  try {
    await IndexerState.findOneAndUpdate(
      { name },
      { lastBlock: Number(lastBlock) },
      { upsert: true, new: true }
    );
  } catch {
    // non-fatal
  }
}

export async function startPolling() {
  if (polling) return;
  polling = true;

  await loadSavedProgress();
  console.log(`⏱  Polling for events every ${POLL_INTERVAL / 1000}s`);

  const tick = async () => {
    try {
      const latest = await publicClient.getBlockNumber() - BLOCK_LAG;

      for (const watcher of watchers) {
        if (watcher.lastBlock >= latest) continue;

        let from           = watcher.lastBlock + 1n;
        let chunksThisTick = 0;

        while (from <= latest && chunksThisTick < MAX_CHUNKS_PER_TICK) {
          const to = (from + CHUNK_SIZE - 1n) <= latest
            ? (from + CHUNK_SIZE - 1n)
            : latest;

          try {
            await watcher.handler(from, to);
            watcher.lastBlock = to;
            chunksThisTick++;

            if (chunksThisTick % 10 === 0) {
              await saveProgress(watcher.name, to);
            }
          } catch (err) {
            console.error(`❌ Polling error [${watcher.name}] blocks ${from}-${to}:`, err);
            break;
          }

          from = to + 1n;
          if (from <= latest) {
            await new Promise(r => setTimeout(r, 300));
          }
        }

        if (chunksThisTick > 0) {
          await saveProgress(watcher.name, watcher.lastBlock);
          console.log(`✅ [${watcher.name}] synced to block ${watcher.lastBlock}`);
        }
      }
    } catch (err) {
      console.error('Polling tick error:', err);
    }

    setTimeout(tick, POLL_INTERVAL);
  };

  setTimeout(tick, POLL_INTERVAL);
}





// import { publicClient } from './viemClient';
// import { IndexerState } from '../models/indexerstate.model';

// const POLL_INTERVAL       = 15_000;
// const BLOCK_LAG           = 1n;
// const CHUNK_SIZE          = 9n;
// const MAX_CHUNKS_PER_TICK = 50;

// type LogHandler = (fromBlock: bigint, toBlock: bigint) => Promise<void>;

// interface Watcher {
//   name:      string;
//   handler:   LogHandler;
//   lastBlock: bigint;
// }

// const watchers: Watcher[] = [];
// let polling = false;

// export function registerWatcher(name: string, handler: LogHandler, startBlock: bigint) {
//   watchers.push({ name, handler, lastBlock: startBlock > 0n ? startBlock - 1n : 0n });
// }

// async function loadSavedProgress() {
//   for (const watcher of watchers) {
//     try {
//       const saved = await IndexerState.findOne({ name: watcher.name });
//       if (saved && BigInt(saved.lastBlock) > watcher.lastBlock) {
//         watcher.lastBlock = BigInt(saved.lastBlock);
//         console.log(`📌 Resuming [${watcher.name}] from block ${saved.lastBlock}`);
//       }
//     } catch {
//       // falls back to deploy block
//     }
//   }
// }

// async function saveProgress(name: string, lastBlock: bigint) {
//   try {
//     await IndexerState.findOneAndUpdate(
//       { name },
//       { lastBlock: Number(lastBlock) },
//       { upsert: true, new: true }
//     );
//   } catch {
//     // non-fatal
//   }
// }

// export async function startPolling() {
//   if (polling) return;
//   polling = true;

//   await loadSavedProgress();
//   console.log(`⏱  Polling for events every ${POLL_INTERVAL / 1000}s`);

//   const tick = async () => {
//     try {
//       const latest = await publicClient.getBlockNumber() - BLOCK_LAG;

//       for (const watcher of watchers) {
//         if (watcher.lastBlock >= latest) continue;

//         let from         = watcher.lastBlock + 1n;
//         let chunksThisTick = 0;

//         while (from <= latest && chunksThisTick < MAX_CHUNKS_PER_TICK) {
//           const to = (from + CHUNK_SIZE - 1n) <= latest
//             ? (from + CHUNK_SIZE - 1n)
//             : latest;

//           try {
//             await watcher.handler(from, to);
//             watcher.lastBlock = to;
//             chunksThisTick++;

//             if (chunksThisTick % 10 === 0) {
//               await saveProgress(watcher.name, to);
//             }
//           } catch (err) {
//             console.error(`Polling error [${watcher.name}] blocks ${from}-${to}:`, err);
//             break;
//           }

//           from = to + 1n;
//           if (from <= latest) {
//             await new Promise(r => setTimeout(r, 300));
//           }
//         }

//         if (chunksThisTick > 0) {
//           await saveProgress(watcher.name, watcher.lastBlock);
//         }
//       }
//     } catch (err) {
//       console.error('Polling tick error:', err);
//     }

//     setTimeout(tick, POLL_INTERVAL);
//   };

//   setTimeout(tick, POLL_INTERVAL);
// }










// import { publicClient } from './viemClient';

// const POLL_INTERVAL = 15_000;
// const BLOCK_LAG     = 1n;
// const CHUNK_SIZE    = 9n; // Alchemy free tier max is 10 blocks per getLogs

// type LogHandler = (fromBlock: bigint, toBlock: bigint) => Promise<void>;

// interface Watcher {
//   name:      string;
//   handler:   LogHandler;
//   lastBlock: bigint;
// }

// const watchers: Watcher[] = [];
// let polling = false;

// export function registerWatcher(name: string, handler: LogHandler, startBlock: bigint) {
//   // subtract 1 so the first poll starts exactly at startBlock
//   watchers.push({ name, handler, lastBlock: startBlock > 0n ? startBlock - 1n : 0n });
// }

// export async function startPolling() {
//   if (polling) return;
//   polling = true;
//   console.log(`⏱  Polling for events every ${POLL_INTERVAL / 1000}s`);

//   const tick = async () => {
//     try {
//       const latest = await publicClient.getBlockNumber() - BLOCK_LAG;

//       for (const watcher of watchers) {
//         if (watcher.lastBlock >= latest) continue;

//         let from = watcher.lastBlock + 1n;

//         while (from <= latest) {
//           const to = (from + CHUNK_SIZE - 1n) <= latest
//             ? (from + CHUNK_SIZE - 1n)
//             : latest;

//           try {
//             await watcher.handler(from, to);
//             watcher.lastBlock = to;
//           } catch (err) {
//             console.error(`Polling error [${watcher.name}] blocks ${from}-${to}:`, err);
//             break; // retry same range next tick
//           }

//           from = to + 1n;

//           // small pause between chunks to avoid rate limits
//           if (from <= latest) {
//             await new Promise(r => setTimeout(r, 300));
//           }
//         }
//       }
//     } catch (err) {
//       console.error('Polling tick error:', err);
//     }

//     setTimeout(tick, POLL_INTERVAL);
//   };

//   setTimeout(tick, POLL_INTERVAL);
// }