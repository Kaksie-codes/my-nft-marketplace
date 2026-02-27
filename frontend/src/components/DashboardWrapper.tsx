import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Image,
  Upload,
  Layers,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  Search,
  Menu,
  LayoutGrid,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Logo from './Logo';
import ThemeToggler from './ThemeToggler';
import ProfileModal from './modals/ProfileModal';
import { useAccount } from 'wagmi';

import { Outlet } from 'react-router-dom';

const DashboardWrapper: React.FC = () => {
  const { address } = useAccount();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();

  const [userProfile] = useState({
    name: '',
    email: '',
    avatar: '',
    walletAddress: '',
  });

const sidebarLinks = [
  { name: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard' },
  { name: 'My Profile',    icon: Image,           path: address ? `/dashboard/profile/${address}` : '/dashboard/profile' },
  { name: 'Create NFT',    icon: Upload,           path: '/dashboard/create' },
  { name: 'My NFTs',    icon: LayoutGrid,           path: '/dashboard/my-nfts' },
  { name: 'Collections',   icon: Layers,           path: '/dashboard/collections/create' },
  { name: 'Notifications', icon: Bell,             path: '/dashboard/notifications' },
  { name: 'Settings',      icon: Settings,         path: '/dashboard/settings' },
  { name: 'Help',          icon: HelpCircle,       path: '/dashboard/help' },
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
        {/* Logo area */}
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

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200
                  ${isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-main hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? link.name : undefined}
              >
                <link.icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm">{link.name}</span>}
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

        {/* Logout at bottom */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <button
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dashboard Header */}
        <header className="sticky top-0 z-30 h-16 bg-surface border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6">
          {/* Left: mobile menu + search */}
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

          {/* Right: wallet + profile + theme */}
          <div className="flex items-center gap-3">
            <ConnectButton
              showBalance={false}
              accountStatus="address"
            />

            {/* Profile Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {userProfile.name.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </button>

            <ThemeToggler />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onLogout={() => {}}
      />
    </div>
  );
};

export default DashboardWrapper;
