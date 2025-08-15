import { Route, Routes } from 'react-router-dom'
import './App.css'

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NFTDetailPage from './pages/NFTDetailsPage';
import ProfilePage from './pages/ProfilePage';
import MarketPlacePage from './pages/MarketPlacePage';
import CollectionNFTsPage from './pages/CollectionNFTsPage';
import RankingsPage from './pages/RankingsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import CreateNFTPage from './pages/CreateNFTPage';

function App() {


  return (
    <div className='bg-background'>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/nft/:id" element={<NFTDetailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/marketplace" element={<MarketPlacePage />} />
      <Route path="/collection/:collectionName" element={<CollectionNFTsPage />} />

      <Route path="/create" element={<CreateNFTPage />} /> 
      <Route path="/rankings" element={<RankingsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </div>
  )
}

export default App
