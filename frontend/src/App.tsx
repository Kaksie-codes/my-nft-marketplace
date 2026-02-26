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
import DashboardWrapper from './components/DashboardWrapper';
import DashboardPage from './pages/DashboardPage';
import CreateCollectionPage from './pages/CreateCollectionPage';
import { useUserSync } from './hooks/useUserSync';
import ListNFTPage from './pages/ListNFTPage';
import RegularPageWrapper from './components/RegularPageWrapper';

function App() {
  // Watches wagmi's useAccount and automatically syncs wallet
  // connect/disconnect to the backend and UserContext
  useUserSync();

  return (
    <div className='bg-background'>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/nft/:collection/:tokenId" element={<NFTDetailPage />} />     
      <Route path="/profile/:address" element={<RegularPageWrapper><ProfilePage /></RegularPageWrapper>} />
      <Route path="/marketplace" element={<MarketPlacePage />} />
      <Route path="/rankings" element={<RankingsPage/>} />
      <Route path="/collection/:collectionAddress" element={<CollectionNFTsPage />} />
      <Route path="/dashboard" element={<DashboardWrapper />}>
        <Route index element={<DashboardPage />} />
        <Route path="profile/:address" element={<ProfilePage />} />
        <Route path="list/:collection/:tokenId" element={<ListNFTPage />} />
        <Route path="create" element={<CreateNFTPage />} />
        <Route path="collections/create" element={<CreateCollectionPage />} />        
      </Route>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </div>
  )  
}

export default App
