import React, { useState } from 'react'
import { registerAgency } from '../api.js'
import { useNavigate } from 'react-router-dom'

export default function AgencyRegister() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [location, setLocation] = useState('')
  const [err, setErr] = useState(null)
  const nav = useNavigate()

  const onSubmit = async () => {
    setErr(null)
    try {
      const res = await registerAgency({ name, email, password, location })
      localStorage.setItem('token', res.token)
      localStorage.setItem('agency', JSON.stringify(res.agency))
      nav('/agency/dashboard')
    } catch (e) {
      setErr(e.error || 'Register failed')
    }
  }

  return (
    <div className="card">
      <h2>Agency Register</h2>
      <div className="row">
        <div className="col-6"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="col-6"><label>Location</label><input value={location} onChange={e=>setLocation(e.target.value)} /></div>
      </div>
      <div className="row">
        <div className="col-6"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="col-6"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={onSubmit}>Create account</button>
      </div>
      {err && <div className="error" style={{marginTop:8}}>{String(err)}</div>}
    </div>
  )
}
