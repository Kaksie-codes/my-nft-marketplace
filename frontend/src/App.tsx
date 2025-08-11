import { Route, Routes } from 'react-router-dom'
import './App.css'
import Explore from './pages/Explore';
import NFTDetail from './pages/NFTDetail';
import CreateNFT from './pages/CreateNFT';
import Profile from './pages/Profile';
import Collections from './pages/Collections';
import Rankings from './pages/Rankings';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import HomePage from './pages/HomePage';

function App() {


  return (
    <div className='bg-background'>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/nft/:id" element={<NFTDetail />} />
      <Route path="/create" element={<CreateNFT />} />
      <Route path="/profile" element={<Profile />} />
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
