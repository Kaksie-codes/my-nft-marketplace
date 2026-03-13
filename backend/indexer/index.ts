import { startFactoryIndexer }    from './factoryIndexer';
import { startCollectionIndexer } from './collectionIndexer';
import { startMarketplaceIndexer } from './marketplaceIndexer';
import { startPolling }           from '../lib/poller';

export async function startAllIndexers() {
  console.log('\n🚀 Starting all indexers...');

  startFactoryIndexer();
  await startCollectionIndexer();
  await startMarketplaceIndexer();

  startPolling();

  console.log('✅ All indexers running\n');
}




// import { startFactoryIndexer }     from './factoryIndexer';
// import { startCollectionIndexer }  from './collectionIndexer';
// import { startMarketplaceIndexer } from './marketplaceIndexer';
// import { startPolling }            from '../lib/poller';
// import { IndexerState }            from '../models/indexerstate.model';

// export async function startAllIndexers() {
//   console.log('\n🚀 Starting all indexers...');

//   // Wipe saved progress so we always start fresh from MARKETPLACE_DEPLOY_BLOCK
//   // Remove these 3 lines once your app is stable and fully synced
//   await IndexerState.deleteMany({});
//   console.log('🗑  Cleared indexer state — starting from deploy block');

//   startFactoryIndexer();
//   await startCollectionIndexer();
//   await startMarketplaceIndexer();

//   startPolling();

//   console.log('✅ All indexers running\n');
// }