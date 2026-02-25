import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Layers, User } from 'lucide-react';
import RegularPageWrapper from '../components/RegularPageWrapper';
import { api } from '../utils/apiClient';
import { resolveIpfsUrl } from '../utils/ipfs';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreatorRank {
  address:   string;
  nftCount:  number;
  username?: string | null;
  avatar?:   string | null;
}

interface CollectionRank {
  _id:      string;
  address:  string;
  name:     string;
  creator:  string;
  nftCount: number;
  symbol:   string;
}

type Tab    = 'creators' | 'collections';
type Period = '24h' | '7d' | '30d' | 'all';

const ITEMS_PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function rowStyle(rank: number): string {
  if (rank === 1) return 'bg-yellow-400/8 border-l-4 border-l-yellow-400 hover:bg-yellow-400/12';
  if (rank === 2) return 'bg-gray-400/8 border-l-4 border-l-gray-400 hover:bg-gray-400/12';
  if (rank === 3) return 'bg-amber-600/8 border-l-4 border-l-amber-600 hover:bg-amber-600/12';
  return 'hover:bg-background border-l-4 border-l-transparent';
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-400';
  if (rank === 3) return 'text-amber-600';
  return 'text-muted';
}

// ── Rank cell ─────────────────────────────────────────────────────────────────

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        rank === 1 ? 'bg-yellow-400/20' : rank === 2 ? 'bg-gray-400/20' : 'bg-amber-600/20'
      }`}>
        <Trophy size={15} className={rankColor(rank)} />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-muted">{rank}</span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-l-4 border-l-transparent animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted/20 flex-shrink-0" />
      <div className="w-10 h-10 rounded-full bg-muted/20 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted/20 rounded w-1/3" />
        <div className="h-3 bg-muted/20 rounded w-1/5" />
      </div>
      <div className="h-4 bg-muted/20 rounded w-16" />
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-muted text-sm text-muted hover:text-main hover:border-primary disabled:opacity-30 transition">
        Prev
      </button>
      {[...Array(totalPages)].map((_, i) => (
        <button key={i + 1} onClick={() => onChange(i + 1)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
            page === i + 1
              ? 'bg-primary text-white border-primary'
              : 'border-muted text-main hover:border-primary hover:bg-primary/10'
          }`}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-muted text-sm text-muted hover:text-main hover:border-primary disabled:opacity-30 transition">
        Next
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const RankingsPage = () => {
  const navigate = useNavigate();

  const [tab,         setTab]         = useState<Tab>('creators');
  const [period,      setPeriod]      = useState<Period>('all');
  const [creators,    setCreators]    = useState<CreatorRank[]>([]);
  const [collections, setCollections] = useState<CollectionRank[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [creatorPage,    setCreatorPage]    = useState(1);
  const [collectionPage, setCollectionPage] = useState(1);

  // ── Fetch creators — re-runs when period changes ──────────────────────────
  const fetchCreators = useCallback(async () => {
    setLoading(true);
    try {
      const periodParam = period !== 'all' ? `&period=${period}` : '';
      const res = await api.get<CreatorRank[]>(`/api/users/top-creators?limit=50${periodParam}`);
      setCreators(res);
      setCreatorPage(1); // reset to page 1 on new data
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // ── Fetch collections — period doesn't affect collections yet ────────────
  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<CollectionRank>(
        '/api/collections?limit=50&sortBy=nftCount&order=desc'
      );
      setCollections(res.data);
      setCollectionPage(1);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'creators') fetchCreators();
    else                    fetchCollections();
  }, [tab, fetchCreators, fetchCollections]);

  // Re-fetch creators when period changes (fetchCreators dep already includes period)
  useEffect(() => {
    if (tab === 'creators') fetchCreators();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCreatorPage(1);
    setCollectionPage(1);
  }, [tab]);

  const PERIODS: { label: string; value: Period }[] = [
    { label: '24h',      value: '24h' },
    { label: '7 days',   value: '7d'  },
    { label: '30 days',  value: '30d' },
    { label: 'All time', value: 'all' },
  ];

  const creatorTotalPages    = Math.ceil(creators.length    / ITEMS_PER_PAGE);
  const collectionTotalPages = Math.ceil(collections.length / ITEMS_PER_PAGE);

  const visibleCreators    = creators.slice(   (creatorPage    - 1) * ITEMS_PER_PAGE, creatorPage    * ITEMS_PER_PAGE);
  const visibleCollections = collections.slice((collectionPage - 1) * ITEMS_PER_PAGE, collectionPage * ITEMS_PER_PAGE);

  return (
    <RegularPageWrapper>
      <div className="min-h-screen bg-background text-main">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-20">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy size={20} className="text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold text-main">Rankings</h1>
          </div>
          <p className="text-muted text-lg mb-10">
            Top creators and collections on the marketplace, ranked by activity.
          </p>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Tab */}
            <div className="flex rounded-xl bg-surface p-1 gap-1 w-fit">
              <button onClick={() => setTab('creators')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'creators' ? 'bg-primary text-white shadow' : 'text-muted hover:text-main'
                }`}>
                <User size={15} /> Creators
              </button>
              <button onClick={() => setTab('collections')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'collections' ? 'bg-primary text-white shadow' : 'text-muted hover:text-main'
                }`}>
                <Layers size={15} /> Collections
              </button>
            </div>

            {/* Period — only meaningful for creators */}
            {tab === 'creators' && (
              <div className="flex rounded-xl bg-surface p-1 gap-1">
                {PERIODS.map(p => (
                  <button key={p.value} onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      period === p.value
                        ? 'bg-background text-main shadow border border-muted'
                        : 'text-muted hover:text-main'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-surface rounded-2xl overflow-hidden border border-muted">

            {/* Column headers */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-muted bg-background">
              <div className="w-8" />
              <div className="w-10" />
              <div className="flex-1 text-xs font-semibold text-muted uppercase tracking-wider">
                {tab === 'creators' ? 'Creator' : 'Collection'}
              </div>
              <div className="text-right text-xs font-semibold text-muted uppercase tracking-wider w-24">
                {tab === 'creators' ? 'NFTs Minted' : 'NFT Count'}
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-muted/20">
              {loading ? (
                [...Array(ITEMS_PER_PAGE)].map((_, i) => <SkeletonRow key={i} />)

              ) : tab === 'creators' ? (
                visibleCreators.length === 0
                  ? <div className="py-20 text-center text-muted text-sm">
                      No creators found{period !== 'all' ? ` in the last ${period}` : ''}.
                    </div>
                  : visibleCreators.map((creator, idx) => {
                      const rank = (creatorPage - 1) * ITEMS_PER_PAGE + idx + 1;
                      return (
                        <div key={creator.address} onClick={() => navigate(`/profile/${creator.address}`)}
                          className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${rowStyle(rank)}`}>
                          <RankCell rank={rank} />
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center border border-muted">
                            {creator.avatar
                              ? <img src={resolveIpfsUrl(creator.avatar)} alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              : <User size={16} className="text-primary" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${rank <= 3 ? rankColor(rank) : 'text-main'}`}>
                              {creator.username || shortAddr(creator.address)}
                            </p>
                            <p className="text-xs text-muted font-mono truncate">
                              {shortAddr(creator.address)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${rank <= 3 ? rankColor(rank) : 'text-main'}`}>
                              {creator.nftCount}
                            </p>
                            <p className="text-xs text-muted">minted</p>
                          </div>
                        </div>
                      );
                    })

              ) : (
                visibleCollections.length === 0
                  ? <div className="py-20 text-center text-muted text-sm">No collections found yet.</div>
                  : visibleCollections.map((col, idx) => {
                      const rank = (collectionPage - 1) * ITEMS_PER_PAGE + idx + 1;
                      return (
                        <div key={col._id} onClick={() => navigate(`/collection/${col.address}`)}
                          className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${rowStyle(rank)}`}>
                          <RankCell rank={rank} />
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-muted">
                            <Layers size={16} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${rank <= 3 ? rankColor(rank) : 'text-main'}`}>
                              {col.name}
                            </p>
                            <p className="text-xs text-muted font-mono truncate">
                              {col.symbol} · {shortAddr(col.creator)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${rank <= 3 ? rankColor(rank) : 'text-main'}`}>
                              {col.nftCount ?? 0}
                            </p>
                            <p className="text-xs text-muted">NFTs</p>
                          </div>
                        </div>
                      );
                    })
              )}
            </div>
          </div>

          {/* Pagination */}
          {!loading && tab === 'creators' && (
            <Pagination page={creatorPage} totalPages={creatorTotalPages} onChange={setCreatorPage} />
          )}
          {!loading && tab === 'collections' && (
            <Pagination page={collectionPage} totalPages={collectionTotalPages} onChange={setCollectionPage} />
          )}

        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default RankingsPage;






// import RegularPageWrapper from "../components/RegularPageWrapper";
// import TopCreatorsTable from "../components/TopCreatorsTable";



// const columns = [
//   { key: 'index', header: '#' },
//   { key: 'artist', header: 'Artist' },
//   { key: 'change', header: 'Change' },
//   { key: 'nfts', header: 'NFTs Sold' },
//   { key: 'volume', header: 'Volume' },
// ];

// const topCreators = [
//   { id: '1', name: 'Jack Smith', avatar: '/avat.png', change: 12, nfts: 120, volume: '320 ETH' },
//   { id: '2', name: 'Jane Doe', avatar: '/avat2.png', change: -7, nfts: 98, volume: '210 ETH' },
//   { id: '3', name: 'Alex Ray', avatar: '/avat3.png', change: 5, nfts: 87, volume: '180 ETH' },
//   { id: '4', name: 'Sam Lee', avatar: '/avat4.png', change: -3, nfts: 75, volume: '150 ETH' },
//   { id: '5', name: 'Chris Kim', avatar: '/avat5.png', change: 0, nfts: 60, volume: '120 ETH' },
// ];

// const RankingsPage = () => (
//   <RegularPageWrapper>
//     <div className="min-h-screen bg-background text-main">
//       <div className="container max-w-4xl mx-auto py-16">
//         <h1 className="text-4xl font-bold mb-6">Top Creators</h1>
//         <TopCreatorsTable columns={columns} data={topCreators} />
//       </div>
//     </div>
//   </RegularPageWrapper>
// );

// export default RankingsPage;
