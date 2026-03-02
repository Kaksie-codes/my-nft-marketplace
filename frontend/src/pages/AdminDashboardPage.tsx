import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import {
  ShieldCheck, TrendingUp, Layers, Users, Tag,
  DollarSign, Activity, RefreshCw, AlertCircle, CheckCircle2,
  Loader2, X, ChevronLeft, ChevronRight, Wallet, Settings,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { adminApi, type Listing } from '../utils/apiClient';
import { MARKETPLACE_ABI } from '../lib/abi/Marketplace';

// ── Constants ─────────────────────────────────────────────────────────────────

const MARKETPLACE_ADDRESS = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
const PAGE_SIZE = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalNFTs:           number;
  totalCollections:    number;
  totalUsers:          number;
  totalActiveListings: number;
  totalSales:          number;
  totalVolumeEth:      string;
  totalFeesEth:        string;
  fixedListings:       number;
  auctionListings:     number;
  salesOverTime:       { _id: string; count: number; volume: number }[];
  mintsOverTime:       { _id: string; count: number }[];
}

type TxStatus = { type: 'pending' | 'success' | 'error'; message: string } | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function weiToEth(wei: string) {
  try { return `${parseFloat(formatEther(BigInt(wei))).toFixed(4)} ETH`; }
  catch { return '— ETH'; }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, gradient, loading,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; gradient: string; loading: boolean;
}) {
  return (
    <div className="relative bg-surface border border-muted rounded-2xl p-5 overflow-hidden group hover:border-primary/40 transition-colors">
      <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${gradient}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">{label}</p>
          {loading
            ? <div className="h-8 w-24 bg-muted/20 rounded animate-pulse mt-1" />
            : <p className="text-2xl font-bold text-main">{value}</p>
          }
          {sub && !loading && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Tx Banner ─────────────────────────────────────────────────────────────────

function TxBanner({ status, onDismiss }: { status: TxStatus; onDismiss: () => void }) {
  if (!status) return null;
  const styles = {
    pending: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error:   'bg-red-500/10 border-red-500/30 text-red-400',
  };
  const icons = {
    pending: <Loader2 size={15} className="animate-spin flex-shrink-0" />,
    success: <CheckCircle2 size={15} className="flex-shrink-0" />,
    error:   <AlertCircle size={15} className="flex-shrink-0" />,
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium mb-4 ${styles[status.type]}`}>
      {icons[status.type]}
      <span className="flex-1">{status.message}</span>
      {status.type !== 'pending' && (
        <button onClick={onDismiss}><X size={13} className="opacity-60 hover:opacity-100" /></button>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="p-2 rounded-lg text-muted hover:text-main hover:bg-muted/10 disabled:opacity-30 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-muted">
        Page <span className="text-main font-semibold">{page}</span> of{' '}
        <span className="text-main font-semibold">{totalPages}</span>
      </span>
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="p-2 rounded-lg text-muted hover:text-main hover:bg-muted/10 disabled:opacity-30 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing, onCancel, cancelling,
}: {
  listing: Listing;
  onCancel: (listingId: string) => void;
  cancelling: boolean;
}) {
  const isAuction = listing.type === 'auction';
  const price     = isAuction
    ? (listing.highestBid ? weiToEth(listing.highestBid) : weiToEth(listing.price))
    : weiToEth(listing.price);

  return (
    <div className="bg-surface border border-muted rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isAuction
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {isAuction ? 'Auction' : 'Fixed'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              listing.status === 'active'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-muted/10 text-muted border border-muted/20'
            }`}>
              {listing.status}
            </span>
          </div>
          <p className="text-sm font-semibold text-main truncate">Token #{listing.tokenId}</p>
          <p className="text-xs text-muted font-mono truncate">{shortAddr(listing.collection)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-primary">{price}</p>
          {isAuction && listing.highestBidder && (
            <p className="text-xs text-muted">{shortAddr(listing.highestBidder)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted border-t border-muted/30 pt-3">
        <span>Seller: <span className="font-mono text-main">{shortAddr(listing.seller)}</span></span>
        <span>#{listing.listingId}</span>
      </div>

      {listing.status === 'active' && (
        <button
          onClick={() => onCancel(listing.listingId)}
          disabled={cancelling}
          className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Cancel Listing
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const { address } = useAccount();

  // Stats
  const [stats,        setStats]        = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Listings tab
  const [listings,        setListings]        = useState<Listing[]>([]);
  const [listingsTotal,   setListingsTotal]   = useState(0);
  const [listingsPage,    setListingsPage]    = useState(1);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingStatus,   setListingStatus]   = useState<string>('active');
  // Bumping this triggers a re-fetch after a tx confirms without needing
  // fetchListings in the txConfirmed effect's dependency array.
  const [listingsRefresh, setListingsRefresh] = useState(0);

  // Refunds tab
  const [refunds,        setRefunds]        = useState<Listing[]>([]);
  const [refundsTotal,   setRefundsTotal]   = useState(0);
  const [refundsPage,    setRefundsPage]    = useState(1);
  const [refundsLoading, setRefundsLoading] = useState(false);

  // Active section tab
  const [section, setSection] = useState<'overview' | 'listings' | 'refunds' | 'settings'>('overview');

  // Settings form
  const [feeInput,       setFeeInput]       = useState('');
  const [recipientInput, setRecipientInput] = useState('');
  const [txStatus,       setTxStatus]       = useState<TxStatus>(null);
  const [txHash,         setTxHash]         = useState<`0x${string}` | undefined>();
  const [cancellingId,   setCancellingId]   = useState<string | null>(null);

  const { writeContract } = useWriteContract();
  const { isSuccess: txConfirmed, isError: txFailed } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Tx confirmation effects ───────────────────────────────────────────────
  // These only depend on the boolean flags — no fetchListings in deps.
  // We trigger a listings re-fetch by bumping listingsRefresh instead.
  useEffect(() => {
    if (txConfirmed) {
      setTxStatus({ type: 'success', message: 'Transaction confirmed!' });
      setTxHash(undefined);
      setCancellingId(null);
      setListingsRefresh(n => n + 1);
    }
  }, [txConfirmed]);

  useEffect(() => {
    if (txFailed) {
      setTxStatus({ type: 'error', message: 'Transaction failed on-chain.' });
      setTxHash(undefined);
      setCancellingId(null);
    }
  }, [txFailed]);

  // ── Fetch stats ───────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!address) return;
    setStatsLoading(true);
    try {
      const res = await adminApi.getStats(address as string);
      setStats(res);
    } catch {
      // forbidden or network error — silently ignore
    } finally {
      setStatsLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch listings ────────────────────────────────────────────────────────

  const fetchListings = useCallback(async (page: number, status: string) => {
    if (!address) return;
    setListingsLoading(true);
    try {
      const res = await adminApi.getListings(address as string, status, page, PAGE_SIZE);
      setListings(res.data);
      setListingsTotal(res.pagination.total);
    } catch {
      // silent
    } finally {
      setListingsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (section === 'listings') fetchListings(listingsPage, listingStatus);
  }, [section, listingsPage, listingStatus, fetchListings, listingsRefresh]);

  // ── Fetch refunds ─────────────────────────────────────────────────────────

  const fetchRefunds = useCallback(async (page: number) => {
    if (!address) return;
    setRefundsLoading(true);
    try {
      const res = await adminApi.getRefunds(address as string, page, PAGE_SIZE);
      setRefunds(res.data);
      setRefundsTotal(res.pagination.total);
    } catch {
      // silent
    } finally {
      setRefundsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (section === 'refunds') fetchRefunds(refundsPage);
  }, [section, refundsPage, fetchRefunds]);

  // ── Contract actions ──────────────────────────────────────────────────────

  const sendTx = useCallback((functionName: string, args: unknown[], label: string) => {
    setTxStatus({ type: 'pending', message: `Waiting for wallet — ${label}...` });
    writeContract(
      {
        address:      MARKETPLACE_ADDRESS,
        abi:          MARKETPLACE_ABI,
        functionName: functionName as never,
        args:         args as never,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setTxStatus({ type: 'pending', message: `${label} submitted — confirming...` });
        },
        onError: (err) => {
          setTxStatus({
            type: 'error',
            message: err.message.includes('rejected') ? 'Transaction rejected.' : err.message,
          });
        },
      }
    );
  }, [writeContract]);

  const handleUpdateFee = () => {
    const bps = Math.round(parseFloat(feeInput) * 100);
    if (isNaN(bps) || bps < 0 || bps > 1000) {
      setTxStatus({ type: 'error', message: 'Enter a valid fee between 0% and 10%.' });
      return;
    }
    sendTx('updateMarketplaceFee', [BigInt(bps)], `Setting fee to ${feeInput}%`);
    setFeeInput('');
  };

  const handleUpdateRecipient = () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipientInput.trim())) {
      setTxStatus({ type: 'error', message: 'Enter a valid wallet address.' });
      return;
    }
    sendTx('updateFeeRecipient', [recipientInput.trim()], 'Updating fee recipient');
    setRecipientInput('');
  };

  const handleCancelListing = (listingId: string) => {
    setCancellingId(listingId);
    sendTx('cancelListing', [BigInt(listingId)], `Cancelling listing #${listingId}`);
  };

  // ── Chart data ────────────────────────────────────────────────────────────

  const salesChartData = stats?.salesOverTime.map(d => ({
    date:   formatDate(d._id),
    sales:  d.count,
    volume: parseFloat((d.volume / 1e18).toFixed(4)),
  })) ?? [];

  const mintsChartData = stats?.mintsOverTime.map(d => ({
    date:  formatDate(d._id),
    mints: d.count,
  })) ?? [];

  const pieData = [
    { name: 'Fixed Price', value: stats?.fixedListings   ?? 0, color: '#6366f1' },
    { name: 'Auctions',    value: stats?.auctionListings ?? 0, color: '#a78bfa' },
  ];

  const isPending = txStatus?.type === 'pending';

  const SECTIONS = [
    { id: 'overview',  label: 'Overview',  icon: TrendingUp },
    { id: 'listings',  label: 'Listings',  icon: Tag        },
    { id: 'refunds',   label: 'Refunds',   icon: Wallet     },
    { id: 'settings',  label: 'Settings',  icon: Settings   },
  ] as const;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-main">Admin Dashboard</h1>
          <p className="text-xs text-muted">Marketplace owner controls — {shortAddr(address || '')}</p>
        </div>
        <button onClick={fetchStats} className="ml-auto p-2 text-muted hover:text-primary rounded-lg hover:bg-muted/10 transition-colors">
          <RefreshCw size={16} className={statsLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-surface border border-muted rounded-xl p-1 w-fit">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              section === s.id
                ? 'bg-primary text-white shadow'
                : 'text-muted hover:text-main'
            }`}
          >
            <s.icon size={15} />
            {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Volume"    value={`${stats?.totalVolumeEth ?? '0'} ETH`}   sub="all time"       icon={TrendingUp} gradient="from-emerald-400 to-teal-500"   loading={statsLoading} />
            <StatCard label="Fees Collected"  value={`${stats?.totalFeesEth ?? '0'} ETH`}     sub="2.5% of volume" icon={DollarSign} gradient="from-amber-400 to-orange-500"  loading={statsLoading} />
            <StatCard label="Active Listings" value={String(stats?.totalActiveListings ?? 0)} sub={`${stats?.fixedListings ?? 0} fixed · ${stats?.auctionListings ?? 0} auctions`} icon={Tag} gradient="from-blue-400 to-indigo-500" loading={statsLoading} />
            <StatCard label="Total Sales"     value={String(stats?.totalSales ?? 0)}          sub="completed"      icon={Activity}   gradient="from-purple-400 to-violet-500" loading={statsLoading} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="NFTs Minted"      value={String(stats?.totalNFTs ?? 0)}        sub="all time"      icon={Layers} gradient="from-pink-400 to-rose-500"  loading={statsLoading} />
            <StatCard label="Collections"      value={String(stats?.totalCollections ?? 0)} sub="deployed"      icon={Layers} gradient="from-cyan-400 to-sky-500"   loading={statsLoading} />
            <StatCard label="Registered Users" value={String(stats?.totalUsers ?? 0)}       sub="with profiles" icon={Users}  gradient="from-lime-400 to-green-500" loading={statsLoading} />
            <StatCard label="Fixed Listings"   value={String(stats?.fixedListings ?? 0)}    sub="active now"    icon={Tag}    gradient="from-orange-400 to-red-500" loading={statsLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales volume */}
            <div className="bg-surface border border-muted rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-main mb-4">Sales Volume (30 days)</h3>
              {statsLoading ? <div className="h-48 bg-muted/10 rounded-xl animate-pulse" /> : salesChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted text-sm">No sales data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-muted)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="volume" stroke="#6366f1" fill="url(#volumeGrad)" strokeWidth={2} name="Volume (ETH)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Mints */}
            <div className="bg-surface border border-muted rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-main mb-4">NFTs Minted (30 days)</h3>
              {statsLoading ? <div className="h-48 bg-muted/10 rounded-xl animate-pulse" /> : mintsChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted text-sm">No mint data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={mintsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-muted)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="mints" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Mints" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sales count */}
            <div className="bg-surface border border-muted rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-main mb-4">Sales Count (30 days)</h3>
              {statsLoading ? <div className="h-48 bg-muted/10 rounded-xl animate-pulse" /> : salesChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted text-sm">No sales data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-muted)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="sales" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2} name="Sales" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie */}
            <div className="bg-surface border border-muted rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-main mb-4">Active Listings Breakdown</h3>
              {statsLoading ? <div className="h-48 bg-muted/10 rounded-xl animate-pulse" /> : (stats?.totalActiveListings ?? 0) === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted text-sm">No active listings</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#888' }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-muted)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LISTINGS ── */}
      {section === 'listings' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['active', 'sold', 'cancelled'].map(s => (
              <button key={s} onClick={() => { setListingStatus(s); setListingsPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                  listingStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-muted border-muted hover:border-primary hover:text-primary'
                }`}>
                {s}
              </button>
            ))}
          </div>

          {listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-surface border border-muted rounded-2xl p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-muted/20 rounded w-3/4" />
                  <div className="h-3 bg-muted/20 rounded w-1/2" />
                  <div className="h-8 bg-muted/20 rounded" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center text-muted text-sm">No {listingStatus} listings found.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map(listing => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    onCancel={handleCancelListing}
                    cancelling={cancellingId === listing.listingId && isPending}
                  />
                ))}
              </div>
              <Pagination page={listingsPage} total={listingsTotal} pageSize={PAGE_SIZE} onChange={setListingsPage} />
            </>
          )}
        </div>
      )}

      {/* ── REFUNDS ── */}
      {section === 'refunds' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Active auctions with current highest bidders — these wallets have ETH locked in the contract.</p>
          {refundsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface border border-muted rounded-2xl p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-muted/20 rounded w-2/3" />
                  <div className="h-3 bg-muted/20 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : refunds.length === 0 ? (
            <div className="py-16 text-center text-muted text-sm">No pending refunds.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {refunds.map(r => (
                  <div key={r._id} className="bg-surface border border-muted rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        Auction #{r.listingId}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {r.highestBid ? weiToEth(r.highestBid) : '—'}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Token #{r.tokenId} · <span className="font-mono">{shortAddr(r.collection)}</span>
                    </p>
                    {r.highestBidder && (
                      <p className="text-xs text-muted">
                        Bidder: <span className="font-mono text-main">{shortAddr(r.highestBidder)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={refundsPage} total={refundsTotal} pageSize={PAGE_SIZE} onChange={setRefundsPage} />
            </>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {section === 'settings' && (
        <div className="max-w-lg space-y-6">
          <TxBanner status={txStatus} onDismiss={() => setTxStatus(null)} />

          <div className="bg-surface border border-muted rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-main">Marketplace Fee</p>
                <p className="text-xs text-muted">Current: 2.5% · Max: 10%</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number" min="0" max="10" step="0.1"
                  value={feeInput} onChange={e => setFeeInput(e.target.value)}
                  placeholder="e.g. 2.5" disabled={isPending}
                  className="w-full px-3 py-2 pr-8 bg-background border border-muted rounded-xl text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
              </div>
              <button onClick={handleUpdateFee} disabled={isPending || !feeInput}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
                Update
              </button>
            </div>
          </div>

          <div className="bg-surface border border-muted rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-main">Fee Recipient</p>
                <p className="text-xs text-muted">Wallet that receives marketplace fees</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={recipientInput} onChange={e => setRecipientInput(e.target.value)}
                placeholder="0x... wallet address" disabled={isPending}
                className="flex-1 px-3 py-2 bg-background border border-muted rounded-xl text-sm text-main font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button onClick={handleUpdateRecipient} disabled={isPending || !recipientInput.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;