import { 
  Image, 
  DollarSign, 
  Heart, 
  Eye, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  ExternalLink 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/button/Button';
import NFTCard from '../components/NFTCard';

const stats = [
  { label: 'Total NFTs', value: '24', icon: Image, change: '+3', up: true, color: 'from-blue-500 to-blue-600' },
  { label: 'Total Value', value: '12.8 ETH', icon: DollarSign, change: '+1.2', up: true, color: 'from-purple-500 to-purple-600' },
  { label: 'Favorites', value: '142', icon: Heart, change: '+18', up: true, color: 'from-pink-500 to-pink-600' },
  { label: 'Profile Views', value: '1.2K', icon: Eye, change: '-5%', up: false, color: 'from-amber-500 to-amber-600' },
];

const recentActivity = [
  { type: 'sale', title: 'Cosmic Dreamer #12', amount: '2.4 ETH', time: '2 hours ago' },
  { type: 'bid', title: 'Abstract World #7', amount: '1.1 ETH', time: '5 hours ago' },
  { type: 'mint', title: 'Neon Ape #33', amount: '—', time: '1 day ago' },
  { type: 'transfer', title: 'Digital Horizon #5', amount: '0.8 ETH', time: '2 days ago' },
  { type: 'sale', title: 'Pixel Dreams #21', amount: '3.2 ETH', time: '3 days ago' },
];

const activityBadge: Record<string, string> = {
  sale: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  bid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  mint: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  transfer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const DashboardPage = () => {
  const myNFTs = [
    { image: '/nft-1.png', title: 'Cosmic Dreamer #12', creatorImage: '/avat.png', creatorName: 'You', price: '2.4 ETH', highestBid: '2.1 ETH' },
    { image: '/nft-2.png', title: 'Abstract World #7', creatorImage: '/avat.png', creatorName: 'You', price: '1.8 ETH', highestBid: '1.1 ETH' },
    { image: '/nft-3.png', title: 'Neon Ape #33', creatorImage: '/avat.png', creatorName: 'You', price: '3.2 ETH', highestBid: '2.9 ETH' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-main">Welcome back 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your NFTs today.
          </p>
        </div>
        <Link to="/dashboard/create">
          <Button variant="primary" size="md" sxclass="gap-2 px-5">
            <Plus size={18} />
            Create NFT
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-xl font-bold text-main mt-0.5">{stat.value}</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${stat.up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{stat.change} this week</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Recent NFTs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent NFTs */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-main">Your Recent NFTs</h2>
            <Link
              to="/dashboard/profile"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ExternalLink size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2  xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {myNFTs.map((nft, i) => (
              <NFTCard
                key={i}
                image={nft.image}
                title={nft.title}
                creatorImage={nft.creatorImage}
                creatorName={nft.creatorName}
                price={nft.price}
                highestBid={nft.highestBid}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-main mb-4">Recent Activity</h2>
          <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${activityBadge[item.type]}`}>
                  {item.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-main truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.time}</p>
                </div>
                {item.amount !== '—' && (
                  <span className="text-sm font-semibold text-main whitespace-nowrap">{item.amount}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-main mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/dashboard/create"
            className="flex items-center gap-4 p-5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-main group-hover:text-primary transition-colors">Create NFT</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mint a new NFT</p>
            </div>
          </Link>
          <Link
            to="/marketplace"
            className="flex items-center gap-4 p-5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-main group-hover:text-primary transition-colors">Marketplace</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Browse & buy NFTs</p>
            </div>
          </Link>
          <Link
            to="/dashboard/rankings"
            className="flex items-center gap-4 p-5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-main group-hover:text-primary transition-colors">Rankings</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">See top creators</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
