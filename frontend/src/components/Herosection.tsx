import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from "./button/Button"
import { api } from '../utils/apiClient';

interface Stats {
  totalNFTs:    number;
  totalSales:   number;
  totalArtists: number;
}

const HeroSection = () => {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<Stats>('/api/nfts/stats');
        setStats(res);
      } catch (err) {
        console.error('Failed to fetch hero stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCount = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
    if (n >= 1000)    return `${(n / 1000).toFixed(1)}k+`;
    return `${n}`;
  };

  const statItems = [
    { label: 'Total NFTs',    value: stats?.totalNFTs    },
    { label: 'Total Sales',   value: stats?.totalSales   },
    { label: 'Total Artists', value: stats?.totalArtists },
  ];

  return (
    <div className="">
      <section className="max-w-6xl mx-auto container py-[50px] px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="max-w-[500px] flex flex-col gap-[20px]">
          <h1 className="text-6xl font-extrabold text-main">
            Discover digital art & Collect NFTs
          </h1>
          <p className="mt-4 text-main text-xl">
            A fully on-chain NFT marketplace. Collect, buy and sell art from
            independent creators on Sepolia.
          </p>
          <Link to="/marketplace">
            <Button variant="primary" sxclass="px-8 w-fit" size="lg">
              Explore Marketplace
            </Button>
          </Link>

          {/* Live stats */}
          <div className="flex justify-between items-center max-w-[410px]">
            {statItems.map(({ label, value }) => (
              <div key={label}>
                {loading || value === undefined ? (
                  <div className="h-7 w-16 bg-muted rounded-md animate-pulse mb-1" />
                ) : (
                  <h2 className="text-main font-bold text-xl">{formatCount(value)}</h2>
                )}
                <p className="text-muted text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero card */}
        <div className="grid place-items-center">
          <div className="bg-surface max-w-[400px] rounded-[20px] shadow-md">
            <div>
              <img src="/hero_img.svg" alt="nft banner" />
            </div>
            <div className="p-4">
              <h2 className="text-main font-bold text-xl">Space Walking</h2>
              <div className="flex gap-3 pt-2">
                <img src="/avat.png" alt="" className="rounded-full" />
                <p className="text-main">Anima kid</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;