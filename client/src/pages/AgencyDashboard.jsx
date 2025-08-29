import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function AgencyDashboard() {
  const nav = useNavigate()
  const agency = JSON.parse(localStorage.getItem('agency')||'null')
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('agency'); nav('/') }

  return (
    <div className="card">
      <h2>Agency Dashboard</h2>
      {agency ? <p>Signed in as <b>{agency.name}</b> · {agency.email}</p> : <p>Please <Link to="/agency/login">login</Link> or <Link to="/agency/register">register</Link>.</p>}
      <div style={{display:'flex', gap:12, marginTop:12}}>
        <Link to="/agency/add-car"><button className="btn">Add a car</button></Link>
        <Link to="/agency/add-availability"><button className="btn">Add availability</button></Link>
        <Link to="/agency/bookings"><button className="btn">View bookings</button></Link>
        <button className="btn secondary" onClick={logout}>Logout</button>
      </div>
    </div>
  )
}
