import { useEffect, useState } from 'react';
import { Trophy, User } from 'lucide-react';
import { Link } from 'react-router-dom';
// import { formatEther } from 'viem';
import Button from './button/Button';
import CreatorCard from './CreatorCard';
import { api } from '../utils/apiClient';
// import { resolveIpfsUrl } from '../utils/ipfs';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreatorStat {
  address:  string;
  nftCount: number;
  username?: string;
  avatar?:   string;
}

// ── Section ──────────────────────────────────────────────────────────────────

const TopCreatorsSection = () => {
  const [creators, setCreators] = useState<CreatorStat[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const res = await api.get<CreatorStat[]>('/api/users/top-creators');
        setCreators(res);
      } catch (err) {
        console.error('Failed to fetch top creators:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCreators();
  }, []);

  const getDisplayName = (creator: CreatorStat) =>
    creator.username || `${creator.address.slice(0, 6)}...${creator.address.slice(-4)}`;

  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-main font-bold text-4xl">Top Creators</h2>
            <p className="text-main text-xl">
              Checkout Top Rated Creators on the NFT Marketplace.
            </p>
          </div>
          <Link to="/dashboard/rankings">
            <Button variant="outline" sxclass="px-4" size="sm" icon={<Trophy size={16} />}>
              View Rankings
            </Button>
          </Link>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-surface rounded-[10px] p-4 grid place-items-center gap-3 animate-pulse">
                <div className="w-[100px] h-[100px] rounded-full bg-muted/20" />
                <div className="h-4 w-24 bg-muted/20 rounded" />
                <div className="h-3 w-32 bg-muted/20 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && creators.length === 0 && (
          <div className="mt-[40px] text-center py-12">
            <User size={36} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">No creators found yet.</p>
          </div>
        )}

        {/* Creators grid */}
        {!loading && creators.length > 0 && (
          <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
            {creators.slice(0, 8).map((creator, idx) => (
              <CreatorCard
                key={creator.address}
                address={creator.address}
                rank={idx + 1}
                image={creator.avatar}
                name={getDisplayName(creator)}
                nftCount={creator.nftCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopCreatorsSection;