import React from 'react'
import { NavLink } from 'react-router-dom'

export default function App({ children }) {
  return (
    <>
      <header>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div className="brand">Car Rental Marketplace (MVP)</div>
          <nav>
            <NavLink to="/" end>Search</NavLink>
            <NavLink to="/agency/dashboard">Agency</NavLink>
          </nav>
        </div>
      </header>
      <main>
        {children}
      </main>
    </>
  )
}
