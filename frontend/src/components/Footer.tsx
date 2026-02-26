import { Twitter, Instagram, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-surface pt-12 pb-4 px-4 border-t border-muted">
      <div className="container border-b border-muted max-w-6xl pb-10 mx-auto flex flex-col md:flex-row justify-between gap-10 md:gap-0">

        {/* Column 1: Logo + description + socials */}
        <div className="flex-1 mb-8 md:mb-0 flex flex-col gap-4">
          <Logo />
          <p className="text-muted max-w-xs">
            Discover, collect, and sell extraordinary NFTs. Fully on-chain on Sepolia - no middlemen, just creators and collectors.
          </p>
          <div className="flex gap-3 mt-2 text-muted">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-primary transition-colors">
              <Twitter size={20} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
              <Instagram size={20} />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:text-primary transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>

        {/* Column 2: Marketplace links */}
        <div className="flex-1 mb-8 md:mb-0">
          <h4 className="font-bold text-main mb-3">Marketplace</h4>
          <ul className="flex flex-col gap-2 text-muted">
            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Explore</Link></li>
            <li><Link to="/marketplace?tab=collections" className="hover:text-primary transition-colors">Collections</Link></li>
            <li><Link to="/rankings" className="hover:text-primary transition-colors">Rankings</Link></li>
          </ul>
        </div>

        {/* Column 3: Account links */}
        <div className="flex-1 mb-8 md:mb-0">
          <h4 className="font-bold text-main mb-3">My Account</h4>
          <ul className="flex flex-col gap-2 text-muted">
            <li><Link to="/dashboard/profile" className="hover:text-primary transition-colors">Profile</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
            <li><Link to="/dashboard/create" className="hover:text-primary transition-colors">Create NFT</Link></li>
            <li><Link to="/dashboard/collections/create" className="hover:text-primary transition-colors">Create Collection</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-6xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-muted text-sm">
        <span>&copy; {new Date().getFullYear()} NFT Marketplace. All rights reserved.</span>
        <span>Built on Sepolia Testnet</span>
      </div>
    </footer>
  );
};

export default Footer;