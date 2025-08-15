
import RegularPageWrapper from "../components/RegularPageWrapper";
import TopCreatorsTable from "../components/TopCreatorsTable";



const columns = [
  { key: 'index', header: '#' },
  { key: 'artist', header: 'Artist' },
  { key: 'change', header: 'Change' },
  { key: 'nfts', header: 'NFTs Sold' },
  { key: 'volume', header: 'Volume' },
];

const topCreators = [
  { id: '1', name: 'Jack Smith', avatar: '/avat.png', change: 12, nfts: 120, volume: '320 ETH' },
  { id: '2', name: 'Jane Doe', avatar: '/avat2.png', change: -7, nfts: 98, volume: '210 ETH' },
  { id: '3', name: 'Alex Ray', avatar: '/avat3.png', change: 5, nfts: 87, volume: '180 ETH' },
  { id: '4', name: 'Sam Lee', avatar: '/avat4.png', change: -3, nfts: 75, volume: '150 ETH' },
  { id: '5', name: 'Chris Kim', avatar: '/avat5.png', change: 0, nfts: 60, volume: '120 ETH' },
];

const RankingsPage = () => (
  <RegularPageWrapper>
    <div className="min-h-screen bg-background text-main">
      <div className="container max-w-4xl mx-auto py-16">
        <h1 className="text-4xl font-bold mb-6">Top Creators</h1>
        <TopCreatorsTable columns={columns} data={topCreators} />
      </div>
    </div>
  </RegularPageWrapper>
);

export default RankingsPage;
