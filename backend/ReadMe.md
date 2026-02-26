# NFT Marketplace Backend

## Stack
- **Express** — REST API
- **MongoDB + Mongoose** — database
- **Viem** — blockchain event listening
- **TypeScript + tsx** — dev server with hot reload

## Setup

```bash
cd server
npm install
cp .env.example .env
# Fill in .env with your RPC_URL, contract addresses, and MongoDB URI
npm run dev
```

## Folder Structure

```
src/
├── models/           ← Mongoose schemas (User, Collection, NFT, Listing, Bid, Activity)
├── indexer/          ← Blockchain event listeners
│   ├── index.ts              starts all listeners
│   ├── factoryIndexer.ts     CollectionCreated
│   ├── collectionIndexer.ts  NFTMinted, Transfer
│   └── marketplaceIndexer.ts all marketplace events
├── routes/           ← REST endpoints
│   ├── users.ts
│   ├── collections.ts
│   ├── nfts.ts
│   ├── listings.ts
│   └── activity.ts
├── lib/
│   ├── db.ts         MongoDB connection
│   └── viemClient.ts viem public client
└── index.ts          Express app entry point
```

## API Reference

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users/connect | Wallet connects — get or create profile |
| PUT | /api/users/profile | Update username / avatar |
| GET | /api/users/:address | Public profile |
| GET | /api/users/:address/nfts | NFTs owned by user |
| GET | /api/users/:address/activity | User activity feed |

### Collections
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/collections | All collections (paginated) |
| GET | /api/collections/:address | Single collection + NFT count |
| GET | /api/collections/:address/nfts | NFTs in collection |

### NFTs
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/nfts/:collection/:tokenId | Single NFT + active listing |
| GET | /api/nfts/category/:category | NFTs by category |

### Listings
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/listings | All listings (filter by status/seller/collection) |
| GET | /api/listings/:id | Single listing + full bid history |
| GET | /api/listings/auctions | Active auctions only |
| GET | /api/listings/fixed | Fixed-price only |

### Activity
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/activity | Global feed (filter by type/collection) |

All list endpoints support `?page=1&limit=20` pagination.

## Frontend UserContext

Copy `UserContext.tsx` into your frontend's `src/context/` folder.

Wrap your app:
```tsx
// main.tsx or App.tsx
import { UserProvider } from './context/UserContext';

<WagmiProvider config={...}>
  <UserProvider>
    <App />
  </UserProvider>
</WagmiProvider>
```

Use anywhere:
```tsx
import { useUser } from './context/UserContext';

function ProfileBadge() {
  const { profile, updateProfile } = useUser();
  return <span>{profile?.username ?? profile?.address}</span>;
}
```

## How the Indexer Works

On startup the indexer:
1. Loads all known collection addresses from MongoDB
2. Subscribes to live events on each collection contract
3. Subscribes to `CollectionCreated` on the factory — new collections are auto-watched as they deploy
4. Subscribes to all marketplace events

Events are written to MongoDB immediately so the REST API always serves fast, pre-indexed data — no on-chain calls needed at query time.

## Notes

- All addresses stored lowercase in MongoDB
- All ETH amounts stored as wei strings (avoids BigInt serialization issues)
- Token URI metadata is fetched and cached at mint time (IPFS gateway: ipfs.io)
- The indexer uses viem's `watchContractEvent` which opens a persistent WebSocket or polls via HTTP depending on the transport