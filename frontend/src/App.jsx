import { Routes, Route } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import Header from './components/Header'

function App() {
  

  return (
    <div className='bg-primary'>
      <Header/>
      <Routes>    
       <Route path="/" element={<HomePage/>} />
       <Route path="/about" element={<h1>About Page</h1>} />
       <Route path="/contact" element={<h1>Contact Page</h1>} />
       <Route path="/nft/:girl" element={<h1>NFT Details Page</h1>} />
       <Route path="/create-nft" element={<h1>Create NFT Page</h1>} />
       <Route path="/profile/rat" element={<h1>Profile Page</h1>} />
       <Route path="/settings" element={<h1>Settings Page</h1>} />
       <Route path="/login" element={<h1>Login Page</h1>} />
       <Route path="/register" element={<h1>Register Page</h1>} />
       <Route path="/404" element={<h1>404 Not Found</h1>} />
       <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </div>
  )
}

export default App
