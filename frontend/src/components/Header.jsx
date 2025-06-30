import React from 'react'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <div className='bg-red-500 md:bg-blue-800 lg:bg-yellow-600 xl:bg-orange-500 text-5xl text-white'>
      <div>
        <h1><Link to={'/'}>LOGO</Link></h1>
        <nav>
          <ul>
            <li>
              <Link to={'/about'} target='_blank'>About</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default Header