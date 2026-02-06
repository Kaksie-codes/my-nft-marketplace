import type { ReactNode } from "react"
// import Header from "./header/Header"
import Footer from "./Footer"


const RegularPageWrapper = ({ children }:{ children:ReactNode }) => {
  return (
    <div>
      {/* <Header/> */}
      {children}
      <Footer/>
    </div>
  )
}

export default RegularPageWrapper
