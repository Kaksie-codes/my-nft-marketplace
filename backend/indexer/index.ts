// indexer/index.ts
import { startFactoryIndexer } from './factoryIndexer';
import { startCollectionIndexer } from './collectionIndexer';
import { startMarketplaceIndexer } from './marketplaceIndexer';

export async function startAllIndexers() {
  console.log('\n🚀 Starting all indexers...');

  // Factory must start first — it populates the collections table
  startFactoryIndexer();

  // Collection indexer reads existing collections from DB on startup
  await startCollectionIndexer();

  // Marketplace indexer: backfills all historical events THEN starts live watchers.
  // Must be awaited so historical sync completes before the server accepts requests.
  await startMarketplaceIndexer();

  console.log('✅ All indexers running\n');
}



// // indexer/index.ts
// import { startFactoryIndexer } from './factoryIndexer';
// import { startCollectionIndexer } from './collectionIndexer';
// import { startMarketplaceIndexer } from './marketplaceIndexer';

// export async function startAllIndexers() {
//   console.log('\n🚀 Starting all indexers...');

//   // Factory must start first — it populates the collections table
//   // that collectionIndexer reads on startup to know what to watch
//   startFactoryIndexer();

//   // Collection indexer reads existing collections from DB on startup,
//   // then watches for new ones via the factory event
//   await startCollectionIndexer();

//   // Marketplace indexer watches all listing/bid/sale events
//   startMarketplaceIndexer();

//   console.log('✅ All indexers running\n');
// }