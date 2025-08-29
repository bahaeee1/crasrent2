import React, { useState } from 'react'
import { loginAgency } from '../api.js'
import { useNavigate } from 'react-router-dom'

export default function AgencyLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const nav = useNavigate()

  const onSubmit = async () => {
    setErr(null)
    try {
      const res = await loginAgency({ email, password })
      localStorage.setItem('token', res.token)
      localStorage.setItem('agency', JSON.stringify(res.agency))
      nav('/agency/dashboard')
    } catch (e) {
      setErr(e.error || 'Login failed')
    }
  }

  return (
    <div className="card">
      <h2>Agency Login</h2>
      <label>Email</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/>
      <label style={{marginTop:8}}>Password</label>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div style={{marginTop:12}}>
        <button className="btn" onClick={onSubmit}>Login</button>
      </div>
      {err && <div className="error" style={{marginTop:8}}>{String(err)}</div>}
    </div>
  )
}
