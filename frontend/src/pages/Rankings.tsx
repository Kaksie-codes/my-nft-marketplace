

const topCreators = [
  { name: 'Jack Smith', avatar: '/avat.png', nfts: 120, volume: '320 ETH' },
  { name: 'Jane Doe', avatar: '/avat2.png', nfts: 98, volume: '210 ETH' },
  { name: 'Alex Ray', avatar: '/avat3.png', nfts: 87, volume: '180 ETH' },
  { name: 'Sam Lee', avatar: '/avat4.png', nfts: 75, volume: '150 ETH' },
  { name: 'Chris Kim', avatar: '/avat5.png', nfts: 60, volume: '120 ETH' },
];

const Rankings = () => (
  <div className="min-h-screen bg-background text-main">
    <div className="container max-w-4xl mx-auto py-16">
      <h1 className="text-4xl font-bold mb-6">Top Creators</h1>
      <table className="w-full bg-surface rounded-xl shadow overflow-hidden">
        <thead>
          <tr className="bg-primary text-white">
            <th className="py-3 px-4 text-left">#</th>
            <th className="py-3 px-4 text-left">Creator</th>
            <th className="py-3 px-4 text-left">NFTs</th>
            <th className="py-3 px-4 text-left">Volume</th>
          </tr>
        </thead>
        <tbody>
          {topCreators.map((creator, idx) => (
            <tr key={creator.name} className="border-b border-surface last:border-none">
              <td className="py-3 px-4 font-bold">{idx + 1}</td>
              <td className="py-3 px-4 flex items-center gap-3">
                <img src={creator.avatar} alt={creator.name} className="w-8 h-8 rounded-full" />
                <span>{creator.name}</span>
              </td>
              <td className="py-3 px-4">{creator.nfts}</td>
              <td className="py-3 px-4">{creator.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Rankings;
