

import { Facebook, Twitter, Instagram } from 'lucide-react';
import NewsletterInput from './inputs/NewsletterInput';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-surface pt-12 pb-4 px-4 border-t border-muted">
      <div className="container border-b border-muted max-w-6xl pb-10 mx-auto flex flex-col md:flex-row justify-between gap-10 md:gap-0">
        {/* Column 1: Logo, desc, socials */}
        <div className="flex-1 mb-8 md:mb-0 flex flex-col gap-4">
          <Logo />
          <p className="text-muted max-w-xs">Discover, collect, and sell extraordinary NFTs on the world's first & largest NFT marketplace.</p>
          <div className="flex gap-3 mt-2 text-muted">
            <a href="#" aria-label="Facebook" className="hover:text-primary"><Facebook size={20} /></a>
            <a href="#" aria-label="Twitter" className="hover:text-primary"><Twitter size={20} /></a>
            <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram size={20} /></a>
          </div>
        </div>
        {/* Column 2: Links */}
        <div className="flex-1 mb-8 md:mb-0">
          <h4 className="font-bold text-main mb-3">Marketplace</h4>
          <ul className="flex flex-col gap-2 text-muted">
            <li><a href="#" className="hover:text-primary">Explore</a></li>
            <li><a href="#" className="hover:text-primary">Rankings</a></li>
            <li><a href="#" className="hover:text-primary">Collections</a></li>
            <li><a href="#" className="hover:text-primary">Blog</a></li>
          </ul>
        </div>
        {/* Column 3: Links + Newsletter */}
        <div className="flex-1">
          <h4 className="font-bold text-main mb-3">Company</h4>
          <p className="text-muted max-w-xs">
           Get exclusive promotions & updates straight to your inbox.
          </p>
          <div className="mt-2">
            <NewsletterInput />
          </div>
        </div>
      </div>      
      <div className="max-w-6xl mx-auto mt-8 text-center text-muted text-sm">
        &copy; {new Date().getFullYear()} NFT Market. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer
