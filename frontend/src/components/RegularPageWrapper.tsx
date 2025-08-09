import type { ReactNode } from "react"
import Header from "./header/Header"


const RegularPageWrapper = ({ children }:{ children:ReactNode }) => {
  return (
    <div>
      <Header/>
      {children}
    </div>
  )
}

export default RegularPageWrapper
