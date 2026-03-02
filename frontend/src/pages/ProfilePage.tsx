import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Copy, Camera, Check, Loader2, Upload, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/avatar';
import Button from '../components/button/Button';
import RegularPageWrapper from '../components/RegularPageWrapper';
import SlidingTabs from '../components/SlidingTabs';
import NFTCard from '../components/NFTCard';
import { useUser } from '../context/UserContext';
import { usersApi, collectionsApi, type NFT, type Collection, type UserProfile } from '../utils/apiClient';
import { resolveIpfsUrl, uploadAvatarToPinata } from '../utils/ipfs';
import TrendingCollectionCard from '../components/TrendingCollectionCard';

const PAGE_SIZE = 24;

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Pagination Component ──────────────────────────────────────────────────────

interface PaginationProps {
  page:     number;
  total:    number;
  pageSize: number;
  onChange: (page: number) => void;
}

function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg text-muted hover:text-main hover:bg-muted/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      {getPages().map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} className="px-2 text-muted select-none">…</span>
          : <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-main hover:bg-muted/10'
              }`}
            >
              {p}
            </button>
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg text-muted hover:text-main hover:bg-muted/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

interface EditProfileModalProps {
  currentUsername?: string;
  currentAvatar?:   string;
  onClose:          () => void;
  onSave:           (data: { username?: string; avatar?: string }) => Promise<void>;
}

function EditProfileModal({ currentUsername, currentAvatar, onClose, onSave }: EditProfileModalProps) {
  const [username,   setUsername]   = useState(currentUsername ?? '');
  const [avatarUrl,  setAvatarUrl]  = useState(currentAvatar  ?? '');
  const [previewUrl, setPreviewUrl] = useState(currentAvatar  ?? '');
  const [tab,        setTab]        = useState<'upload' | 'url'>('upload');
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024)    { setError('Image must be under 5MB.');      return; }
    setError('');
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ipfsUrl = await uploadAvatarToPinata(file);
      setAvatarUrl(ipfsUrl);
      setPreviewUrl(resolveIpfsUrl(ipfsUrl));
    } catch {
      setError('Failed to upload image to IPFS. Please try again.');
      setPreviewUrl(currentAvatar ?? '');
      setAvatarUrl(currentAvatar  ?? '');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarUrl(e.target.value);
    setPreviewUrl(resolveIpfsUrl(e.target.value));
  };

  const handleSave = async () => {
    if (uploading) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ username: username.trim() || undefined, avatar: avatarUrl.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-muted rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-semibold text-main">Edit Profile</h2>
        <div>
          <label className="block text-sm text-muted mb-1">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="e.g. cryptoartist"
            className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-2">Profile Picture</label>
          {previewUrl && (
            <div className="flex justify-center mb-3 relative">
              <img src={previewUrl} alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }} />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex rounded-lg border border-muted overflow-hidden mb-3">
            <button onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${tab === 'upload' ? 'bg-primary text-white' : 'text-muted hover:text-main'}`}>
              <Upload size={14} /> Upload File
            </button>
            <button onClick={() => setTab('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${tab === 'url' ? 'bg-primary text-white' : 'text-muted hover:text-main'}`}>
              <Link2 size={14} /> Paste URL
            </button>
          </div>
          {tab === 'upload' && (
            <div onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${uploading ? 'border-primary/50 cursor-wait' : 'border-muted hover:border-primary cursor-pointer'}`}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {uploading ? (
                <><Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" /><p className="text-sm text-primary font-medium">Uploading to IPFS...</p></>
              ) : (
                <><Upload size={24} className="text-muted mx-auto mb-2" /><p className="text-sm text-main font-medium">Click to select an image</p><p className="text-xs text-muted mt-1">JPG, PNG, GIF, WebP — max 5MB</p></>
              )}
            </div>
          )}
          {tab === 'url' && (
            <input type="text" value={avatarUrl} onChange={handleUrlChange}
              placeholder="https://... or ipfs://..."
              className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          )}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" size="md" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" fullWidth loading={saving} disabled={uploading} onClick={handleSave}>
            {uploading ? 'Uploading...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Collection NFT map ────────────────────────────────────────────────────────

interface CollectionWithNFTs {
  collection: Collection;
  nfts:       NFT[];
}

// ── Pagination state shape ────────────────────────────────────────────────────

interface TabPagination {
  page:  number;
  total: number;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { address: urlAddress }                    = useParams<{ address: string }>();
  const { address: connectedAddress, isConnected } = useAccount();
  const { user, updateProfile }                    = useUser();
  const navigate                                   = useNavigate();

  const profileAddress = urlAddress?.toLowerCase() ?? connectedAddress?.toLowerCase() ?? '';

  const isOwnProfile = !!(
    isConnected &&
    connectedAddress &&
    profileAddress === connectedAddress.toLowerCase()
  );

  const isValidAddress = /^0x[0-9a-f]{40}$/i.test(profileAddress);

  useEffect(() => {
    if (urlAddress && !isValidAddress) navigate('/404', { replace: true });
  }, [urlAddress, isValidAddress, navigate]);

  const [viewedProfile,   setViewedProfile]   = useState<UserProfile | null>(null);
  const [activeTab,       setActiveTab]       = useState(0);

  // ── Per-tab data ──────────────────────────────────────────────────────────
  const [mintedNFTs,      setMintedNFTs]      = useState<NFT[]>([]);
  const [ownedNFTs,       setOwnedNFTs]       = useState<NFT[]>([]);
  const [collectionsData, setCollectionsData] = useState<CollectionWithNFTs[]>([]);

  // ── Per-tab pagination ────────────────────────────────────────────────────
  const [mintedPagination,      setMintedPagination]      = useState<TabPagination>({ page: 1, total: 0 });
  const [ownedPagination,       setOwnedPagination]       = useState<TabPagination>({ page: 1, total: 0 });
  const [collectionsPagination, setCollectionsPagination] = useState<TabPagination>({ page: 1, total: 0 });

  // ── Two loading states ────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [tabLoading,     setTabLoading]     = useState(false);

  // ── Minter profile cache ──────────────────────────────────────────────────
  const [minterProfiles, setMinterProfiles] = useState<Record<string, UserProfile>>({});
  const minterProfilesRef = useRef(minterProfiles);
  useEffect(() => { minterProfilesRef.current = minterProfiles; }, [minterProfiles]);

  const [copied,   setCopied]   = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // ── Resolve minter profiles for a batch of NFTs ───────────────────────────
  const resolveMinterProfiles = useCallback(async (nfts: NFT[]) => {
    const addresses = [
      ...new Set(
        nfts
          .map(n => n.minter?.toLowerCase())
          .filter((addr): addr is string => !!addr && addr !== profileAddress)
      ),
    ];
    const missing = addresses.filter(addr => !minterProfilesRef.current[addr]);
    if (missing.length === 0) return;

    const settled = await Promise.allSettled(missing.map(addr => usersApi.getProfile(addr)));
    const newEntries: Record<string, UserProfile> = {};
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') newEntries[missing[i]] = result.value;
    });
    if (Object.keys(newEntries).length > 0) {
      setMinterProfiles(prev => ({ ...prev, ...newEntries }));
    }
  }, [profileAddress]);

  // ── Initial load ──────────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    if (!profileAddress) return;
    setInitialLoading(true);
    try {
      const [profileRes, mintedRes, ownedRes, collectionRes] = await Promise.all([
        usersApi.getProfile(profileAddress).catch(() => null),
        usersApi.getNFTs(profileAddress, 1, PAGE_SIZE, 'created'),
        usersApi.getNFTs(profileAddress, 1, PAGE_SIZE, 'owned'),
        collectionsApi.getAll({ creator: profileAddress, page: 1, limit: PAGE_SIZE }),
      ]);

      setViewedProfile(profileRes);

      setMintedNFTs(mintedRes.data);
      setMintedPagination({ page: 1, total: mintedRes.pagination.total });

      setOwnedNFTs(ownedRes.data);
      setOwnedPagination({ page: 1, total: ownedRes.pagination.total });

      await resolveMinterProfiles(ownedRes.data);

      const cols = collectionRes.data;
      setCollectionsPagination({ page: 1, total: collectionRes.pagination.total });
      const withNFTs = await Promise.all(
        cols.map(async (col) => {
          try {
            const res = await collectionsApi.getNFTs(col.address, 1, 3);
            return { collection: col, nfts: res.data };
          } catch {
            return { collection: col, nfts: [] };
          }
        })
      );
      setCollectionsData(withNFTs);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setInitialLoading(false);
    }
  }, [profileAddress, resolveMinterProfiles]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ── Page change handlers ──────────────────────────────────────────────────

  const handleMintedPageChange = useCallback(async (page: number) => {
    setTabLoading(true);
    try {
      const res = await usersApi.getNFTs(profileAddress, page, PAGE_SIZE, 'created');
      setMintedNFTs(res.data);
      setMintedPagination(prev => ({ ...prev, page }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load created NFTs page:', err);
    } finally {
      setTabLoading(false);
    }
  }, [profileAddress]);

  const handleOwnedPageChange = useCallback(async (page: number) => {
    setTabLoading(true);
    try {
      const res = await usersApi.getNFTs(profileAddress, page, PAGE_SIZE, 'owned');
      setOwnedNFTs(res.data);
      setOwnedPagination(prev => ({ ...prev, page }));
      await resolveMinterProfiles(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load owned NFTs page:', err);
    } finally {
      setTabLoading(false);
    }
  }, [profileAddress, resolveMinterProfiles]);

  const handleCollectionsPageChange = useCallback(async (page: number) => {
    setTabLoading(true);
    try {
      const res = await collectionsApi.getAll({ creator: profileAddress, page, limit: PAGE_SIZE });
      setCollectionsPagination(prev => ({ ...prev, page }));
      const withNFTs = await Promise.all(
        res.data.map(async (col) => {
          try {
            const nftRes = await collectionsApi.getNFTs(col.address, 1, 3);
            return { collection: col, nfts: nftRes.data };
          } catch {
            return { collection: col, nfts: [] };
          }
        })
      );
      setCollectionsData(withNFTs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load collections page:', err);
    } finally {
      setTabLoading(false);
    }
  }, [profileAddress]);

  const handleCopy = () => {
    if (!profileAddress) return;
    navigator.clipboard.writeText(profileAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNFTImage = (nft: NFT) =>
    resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

  const getNFTTitle = (nft: NFT) =>
    typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

  const getMinterInfo = (nft: NFT): { name: string; image: string | undefined } => {
    const minterAddr = nft.minter?.toLowerCase();
    if (!minterAddr || minterAddr === profileAddress) {
      return { name: displayName, image: avatarSrc };
    }
    const profile = minterProfiles[minterAddr];
    return {
      name:  profile?.username || shortAddress(nft.minter),
      image: profile?.avatar   ? resolveIpfsUrl(profile.avatar) : undefined,
    };
  };

  const tabs = [
    { label: 'Created',     count: mintedPagination.total      },
    { label: 'Owned',       count: ownedPagination.total       },
    { label: 'Collections', count: collectionsPagination.total },
  ];

  const displayProfile = isOwnProfile ? user : viewedProfile;
  const displayName    = displayProfile?.username || (profileAddress ? shortAddress(profileAddress) : 'Unknown');
  const avatarSrc      = displayProfile?.avatar   ? resolveIpfsUrl(displayProfile.avatar) : undefined;

  if (!profileAddress) {
    return (
      <RegularPageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-main font-semibold text-lg">Connect your wallet to view your profile</p>
        </div>
      </RegularPageWrapper>
    );
  }

  return (
    <>
      <div className="bg-background text-main min-h-screen">
        {/* Banner */}
        <div className="relative w-full h-56 md:h-72 bg-gradient-to-r from-primary to-secondary">
          <img src="/profile-banner.png" alt="Profile Banner"
            className="w-full h-full object-cover absolute object-center opacity-80" />
          <div className="container max-w-6xl relative h-full">
            <div className="absolute left-6 md:left-10 bottom-0 translate-y-1/2 z-10">
              {isOwnProfile ? (
                <div className="relative group cursor-pointer" onClick={() => setShowEdit(true)}>
                  <Avatar image={avatarSrc} name={displayName} size="3xl" />
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
              ) : (
                <Avatar image={avatarSrc} name={displayName} size="3xl" />
              )}
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="container max-w-6xl px-4 sm:px-6 flex flex-col gap-6 mt-24 md:mt-32">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-main font-extrabold text-4xl leading-tight">{displayName}</h1>
              {profileAddress && (
                <div className="text-muted text-sm font-mono mt-1">{shortAddress(profileAddress)}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="md" variant="primary" sxclass="px-5 flex items-center gap-2" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : shortAddress(profileAddress)}
              </Button>
              {isOwnProfile && (
                <>
                  <Button size="md" variant="outline" sxclass="px-5" onClick={() => setShowEdit(true)}>
                    Edit Profile
                  </Button>
                  <Link to="/dashboard/create">
                    <Button size="md" variant="primary" sxclass="px-5">Create NFT</Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 flex-wrap">
            {[
              { label: 'NFTs Created', value: mintedPagination.total      },
              { label: 'NFTs Owned',   value: ownedPagination.total       },
              { label: 'Collections',  value: collectionsPagination.total },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                {initialLoading
                  ? <div className="h-7 w-16 bg-muted/20 rounded animate-pulse mb-1" />
                  : <span className="text-2xl font-bold">{value}</span>
                }
                <span className="text-muted text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <SlidingTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div className="bg-surface pb-20">
            <div className="container max-w-6xl px-4 sm:px-6 pt-6">

              {initialLoading && (
                <div className="flex items-center justify-center py-16 gap-2 text-muted">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}

              {/* Created */}
              {!initialLoading && activeTab === 0 && (
                tabLoading
                  ? <div className="flex items-center justify-center py-16 gap-2 text-muted">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  : mintedNFTs.length === 0
                    ? <div className="text-center py-16">
                        <p className="text-muted text-sm mb-4">
                          {isOwnProfile ? "You haven't minted any NFTs yet." : "This user hasn't minted any NFTs yet."}
                        </p>
                        {isOwnProfile && (
                          <Link to="/dashboard/create">
                            <Button variant="primary" size="sm" sxclass="px-5">Mint your first NFT</Button>
                          </Link>
                        )}
                      </div>
                    : <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {mintedNFTs.map(nft => (
                            <NFTCard key={nft._id} image={getNFTImage(nft)} title={getNFTTitle(nft)}
                              creatorImage={avatarSrc} creatorName={displayName} category={nft.category}
                              owner={nft.owner} listing={nft.activeListing ?? null} backgroundColor="bg-background"
                              onClick={() => navigate(`/nft/${nft.collection}/${nft.tokenId}`)} />
                          ))}
                        </div>
                        <Pagination
                          page={mintedPagination.page}
                          total={mintedPagination.total}
                          pageSize={PAGE_SIZE}
                          onChange={handleMintedPageChange}
                        />
                      </>
              )}

              {/* Owned */}
              {!initialLoading && activeTab === 1 && (
                tabLoading
                  ? <div className="flex items-center justify-center py-16 gap-2 text-muted">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  : ownedNFTs.length === 0
                    ? <div className="text-center py-16">
                        <p className="text-muted text-sm">
                          {isOwnProfile ? "You don't own any NFTs yet." : "This user doesn't own any NFTs yet."}
                        </p>
                      </div>
                    : <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {ownedNFTs.map(nft => {
                            const minter = getMinterInfo(nft);
                            return (
                              <NFTCard key={nft._id} image={getNFTImage(nft)} title={getNFTTitle(nft)}
                                creatorImage={minter.image} creatorName={minter.name} category={nft.category}
                                owner={nft.owner} listing={nft.activeListing ?? null} backgroundColor="bg-background"
                                onClick={() => navigate(`/nft/${nft.collection}/${nft.tokenId}`)} />
                            );
                          })}
                        </div>
                        <Pagination
                          page={ownedPagination.page}
                          total={ownedPagination.total}
                          pageSize={PAGE_SIZE}
                          onChange={handleOwnedPageChange}
                        />
                      </>
              )}

              {/* Collections */}
              {!initialLoading && activeTab === 2 && (
                tabLoading
                  ? <div className="flex items-center justify-center py-16 gap-2 text-muted">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  : collectionsData.length === 0
                    ? <div className="text-center py-16">
                        <p className="text-muted text-sm mb-4">
                          {isOwnProfile ? "You haven't created any collections yet." : "This user hasn't created any collections yet."}
                        </p>
                        {isOwnProfile && (
                          <Link to="/dashboard/collections/create">
                            <Button variant="primary" size="sm" sxclass="px-5">Create a Collection</Button>
                          </Link>
                        )}
                      </div>
                    : <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {collectionsData.map(({ collection, nfts }) => {
                            const bannerImg  = nfts[0] ? getNFTImage(nfts[0]) : '/nft-placeholder.png';
                            const thumbnails = nfts.map(getNFTImage);
                            return (
                              <div key={collection._id}
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => navigate(`/collection/${collection.address}`)}>
                                <TrendingCollectionCard
                                  bannerImg={bannerImg} thumbnails={thumbnails}
                                  count={collection.nftCount ?? 0} title={collection.name}
                                  creatorName={displayName} creatorImg={avatarSrc}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <Pagination
                          page={collectionsPagination.page}
                          total={collectionsPagination.total}
                          pageSize={PAGE_SIZE}
                          onChange={handleCollectionsPageChange}
                        />
                      </>
              )}

            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && showEdit && (
        <EditProfileModal
          currentUsername={user?.username}
          currentAvatar={user?.avatar}
          onClose={() => setShowEdit(false)}
          onSave={updateProfile}
        />
      )}
    </>
  );
};

export default ProfilePage;