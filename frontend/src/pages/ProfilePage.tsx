
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Copy, Globe, Twitter, Instagram, Camera, Check, Loader2, Upload, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../components/avatar';
import Button from '../components/button/Button';
import RegularPageWrapper from '../components/RegularPageWrapper';
import SlidingTabs from '../components/SlidingTabs';
import NFTCard from '../components/NFTCard';
import NFTCollectionCard from '../components/NFTCollectionCard';
import { useUser } from '../context/UserContext';
import { usersApi, collectionsApi, type NFT, type Collection } from '../utils/apiClient';
import { resolveIpfsUrl, uploadAvatarToPinata } from '../utils/ipfs';

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
  const [uploading,  setUploading]  = useState(false); // Pinata upload in progress
  const [saving,     setSaving]     = useState(false); // backend save in progress
  const [error,      setError]      = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User picks a file → upload to Pinata → store ipfs:// URL
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    setError('');

    // Show a local preview immediately so the user doesn't wait
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Upload to Pinata in the background
    setUploading(true);
    try {
      const ipfsUrl = await uploadAvatarToPinata(file);
      setAvatarUrl(ipfsUrl);   // store ipfs:// url — this is what gets saved
      setPreviewUrl(resolveIpfsUrl(ipfsUrl)); // switch preview to gateway url
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setError('Failed to upload image to IPFS. Please try again.');
      setPreviewUrl(currentAvatar ?? ''); // revert preview
      setAvatarUrl(currentAvatar  ?? '');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAvatarUrl(val);
    setPreviewUrl(resolveIpfsUrl(val));
  };

  const handleSave = async () => {
    if (uploading) return; // don't save while upload is still running
    setSaving(true);
    setError('');
    try {
      await onSave({
        username: username.trim() || undefined,
        avatar:   avatarUrl.trim() || undefined,
      });
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

        {/* Username */}
        <div>
          <label className="block text-sm text-muted mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. cryptoartist"
            className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Avatar */}
        <div>
          <label className="block text-sm text-muted mb-2">Profile Picture</label>

          {/* Preview */}
          {previewUrl && (
            <div className="flex justify-center mb-3 relative">
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                onError={(e) => { (e.target as HTMLImageElement).src = '/nft-placeholder.png'; }}
              />
              {/* Uploading spinner overlay */}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-muted overflow-hidden mb-3">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                tab === 'upload' ? 'bg-primary text-white' : 'text-muted hover:text-main'
              }`}
            >
              <Upload size={14} /> Upload File
            </button>
            <button
              onClick={() => setTab('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                tab === 'url' ? 'bg-primary text-white' : 'text-muted hover:text-main'
              }`}
            >
              <Link2 size={14} /> Paste URL
            </button>
          </div>

          {/* Upload from computer */}
          {tab === 'upload' && (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploading
                  ? 'border-primary/50 cursor-wait'
                  : 'border-muted hover:border-primary cursor-pointer'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploading ? (
                <>
                  <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-primary font-medium">Uploading to IPFS...</p>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-muted mx-auto mb-2" />
                  <p className="text-sm text-main font-medium">Click to select an image</p>
                  <p className="text-xs text-muted mt-1">JPG, PNG, GIF, WebP — max 5MB</p>
                  <p className="text-xs text-muted mt-1">Uploaded securely to IPFS via Pinata</p>
                </>
              )}
            </div>
          )}

          {/* Paste URL */}
          {tab === 'url' && (
            <input
              type="text"
              value={avatarUrl}
              onChange={handleUrlChange}
              placeholder="https://... or ipfs://..."
              className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            loading={saving}
            disabled={uploading}
            onClick={handleSave}
          >
            {uploading ? 'Uploading...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { address, isConnected } = useAccount();
  const { user, updateProfile }  = useUser();

  const [activeTab,   setActiveTab]   = useState(0);
  const [mintedNFTs,  setMintedNFTs]  = useState<NFT[]>([]);
  const [ownedNFTs,   setOwnedNFTs]   = useState<NFT[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);

  const loadData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [nftRes, collectionRes] = await Promise.all([
        usersApi.getNFTs(address, 1, 50),
        collectionsApi.getAll({ creator: address }),
      ]);
      const all = nftRes.data;
      setMintedNFTs(all.filter(n => n.minter?.toLowerCase() === address.toLowerCase()));
      setOwnedNFTs(all.filter(n  => n.owner?.toLowerCase()  === address.toLowerCase()));
      setCollections(collectionRes.data);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNFTImage = (nft: NFT): string =>
    resolveIpfsUrl(typeof nft.metadata?.image === 'string' ? nft.metadata.image : '');

  const getNFTTitle = (nft: NFT): string =>
    typeof nft.metadata?.name === 'string' ? nft.metadata.name : `Token #${nft.tokenId}`;

  const tabs = [
    { label: 'Created',     count: mintedNFTs.length  },
    { label: 'Owned',       count: ownedNFTs.length   },
    { label: 'Collections', count: collections.length },
  ];

  const displayName = user?.username || (address ? shortAddress(address) : 'Unknown');
  const avatarSrc   = user?.avatar   ? resolveIpfsUrl(user.avatar) : undefined;

  if (!isConnected) {
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
              <div className="relative group cursor-pointer" onClick={() => setShowEdit(true)}>
                <Avatar image={avatarSrc} name={displayName} size="3xl" />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="container max-w-6xl px-4 sm:px-6 flex flex-col gap-6 mt-24 md:mt-32">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-main font-extrabold text-4xl leading-tight">{displayName}</h1>
              {address && <div className="text-muted text-sm font-mono mt-1">{shortAddress(address)}</div>}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="md" variant="primary" sxclass="px-5 flex items-center gap-2" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : (address ? shortAddress(address) : '')}
              </Button>
              <Button size="md" variant="outline" sxclass="px-5" onClick={() => setShowEdit(true)}>
                Edit Profile
              </Button>
              <Link to="/dashboard/create">
                <Button size="md" variant="primary" sxclass="px-5">Create NFT</Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 flex-wrap">
            {[
              { label: 'NFTs Created', value: mintedNFTs.length  },
              { label: 'NFTs Owned',   value: ownedNFTs.length   },
              { label: 'Collections',  value: collections.length },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                {loading
                  ? <div className="h-7 w-16 bg-muted/20 rounded animate-pulse mb-1" />
                  : <span className="text-2xl font-bold">{value}</span>
                }
                <span className="text-muted text-sm">{label}</span>
              </div>
            ))}
          </div>

          {/* Social links */}
          <div className="flex gap-4">
            <a href="#" className="text-muted hover:text-primary"><Globe size={22} /></a>
            <a href="#" className="text-muted hover:text-primary"><Twitter size={22} /></a>
            <a href="#" className="text-muted hover:text-primary"><Instagram size={22} /></a>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <SlidingTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div className="bg-surface pb-20">
            <div className="container max-w-6xl px-4 sm:px-6 pt-6">

              {loading && (
                <div className="flex items-center justify-center py-16 gap-2 text-muted">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}

              {!loading && activeTab === 0 && (
                mintedNFTs.length === 0
                  ? <div className="text-center py-16">
                      <p className="text-muted text-sm mb-4">You haven't minted any NFTs yet.</p>
                      <Link to="/dashboard/create">
                        <Button variant="primary" size="sm" sxclass="px-5">Mint your first NFT</Button>
                      </Link>
                    </div>
                  : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {mintedNFTs.map(nft => (
                        <NFTCard key={nft._id} image={getNFTImage(nft)} title={getNFTTitle(nft)}
                          creatorImage={avatarSrc} creatorName={displayName}
                          owner={nft.owner} listing={null} backgroundColor="bg-background" />
                      ))}
                    </div>
              )}

              {!loading && activeTab === 1 && (
                ownedNFTs.length === 0
                  ? <div className="text-center py-16">
                      <p className="text-muted text-sm">You don't own any NFTs yet.</p>
                    </div>
                  : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {ownedNFTs.map(nft => (
                        <NFTCard key={nft._id} image={getNFTImage(nft)} title={getNFTTitle(nft)}
                          creatorImage={avatarSrc} creatorName={displayName}
                          owner={nft.owner} listing={null} backgroundColor="bg-background" />
                      ))}
                    </div>
              )}

              {!loading && activeTab === 2 && (
                collections.length === 0
                  ? <div className="text-center py-16">
                      <p className="text-muted text-sm mb-4">You haven't created any collections yet.</p>
                      <Link to="/dashboard/collections/create">
                        <Button variant="primary" size="sm" sxclass="px-5">Create a Collection</Button>
                      </Link>
                    </div>
                  : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {collections.map(col => (
                        <NFTCollectionCard key={col._id} image="/nft-placeholder.png"
                          title={col.name} items={col.nftCount ?? 0} owner={displayName} />
                      ))}
                    </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {showEdit && (
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