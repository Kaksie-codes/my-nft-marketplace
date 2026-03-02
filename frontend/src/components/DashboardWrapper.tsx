import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Image,
  Upload,
  Layers,
  LogOut,
  Search,
  Menu,
  LayoutGrid,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Logo from './Logo';
import ThemeToggler from './ThemeToggler';
import ProfileModal from './modals/ProfileModal';
import { useAccount, useDisconnect } from 'wagmi';
import { Outlet } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { resolveIpfsUrl } from '../utils/ipfs';

const MARKETPLACE_OWNER = (import.meta.env.VITE_MARKETPLACE_OWNER_ADDRESS || '').toLowerCase();

const DashboardWrapper: React.FC = () => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { user } = useUser();

  const [collapsed,          setCollapsed]          = useState(false);
  const [mobileSidebarOpen,  setMobileSidebarOpen]  = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();

  const isOwner = !!(address && address.toLowerCase() === MARKETPLACE_OWNER);

  const handleLogout = () => {
    disconnect();
    setIsProfileModalOpen(false);
  };

  // Derive display values from real user — fall back gracefully if not loaded yet
  const displayName   = user?.username || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'U');
  const avatarUrl     = user?.avatar ? resolveIpfsUrl(user.avatar) : null;
  const avatarInitial = (user?.username?.charAt(0) || 'U').toUpperCase();

  const sidebarLinks = [
    ...(isOwner ? [{ name: 'Admin', icon: ShieldCheck, path: '/dashboard/admin', adminOnly: true }] : []),
    { name: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard'                                               },
    { name: 'My Profile',  icon: Image,           path: address ? `/dashboard/profile/${address}` : '/dashboard/profile' },
    { name: 'Create NFT',  icon: Upload,          path: '/dashboard/create'                                        },
    { name: 'My NFTs',     icon: LayoutGrid,      path: '/dashboard/my-nfts'                                       },
    { name: 'Collections', icon: Layers,          path: '/dashboard/collections/create'                           },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-surface border-r border-gray-200 dark:border-gray-700
          flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[250px]'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && <Logo />}
          {collapsed && (
            <Link to="/" className="mx-auto">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const isAdmin  = 'adminOnly' in link && link.adminOnly;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200
                  ${isActive
                    ? isAdmin
                      ? 'bg-amber-500/10 text-amber-400 font-semibold'
                      : 'bg-primary/10 text-primary font-semibold'
                    : isAdmin
                      ? 'text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-400'
                      : 'text-main hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? link.name : undefined}
              >
                <link.icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm flex items-center gap-2">
                    {link.name}
                    {isAdmin && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        OWNER
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:flex items-center justify-center border-t border-gray-200 dark:border-gray-700 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-main transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg w-full
              text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-surface border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-main hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent outline-none text-sm text-main placeholder-gray-400 w-40 lg:w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectButton showBalance={false} accountStatus="address" />

            {/* Profile button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{avatarInitial}</span>
                </div>
              )}
            </button>

            <ThemeToggler />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default DashboardWrapper;