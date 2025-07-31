import { Route, Routes } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import Header from './components/header/Header'

function App() {
  

  return (
    <div className='bg-background text-main min-h-screen'>
      <Header/>
      <Routes>
        {/* Define your routes here */}
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  )
}

export default App