import { Route, Routes } from 'react-router-dom'
import './App.css'
import CreateNFT from './pages/CreateNFT';
import Collections from './pages/Collections';
import Rankings from './pages/Rankings';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NFTDetailPage from './pages/NFTDetail';
import ProfilePage from './pages/Profile';
import MarketPlacePage from './pages/MarketPlacePage';

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
      
      <Route path="/create" element={<CreateNFT />} />
      
      <Route path="/collections" element={<Collections />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </div>
  )
}

export default App
